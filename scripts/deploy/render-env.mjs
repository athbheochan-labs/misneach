#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

const args = parseArgs(process.argv.slice(2));
const manifestPath = args.manifest || 'deploy/env/manifest.json';
const provider = args.provider || process.env.ENV_RENDER_PROVIDER || 'aws';
const parameterFile = args.parameters || process.env.ENV_RENDER_PARAMETER_FILE || '';
const outputDirOverride = args['output-dir'] || process.env.ENV_RENDER_OUTPUT_DIR || '';
const dryRun = Boolean(args['dry-run']);
const validateOnly = Boolean(args['validate-only']);
const listParameters = Boolean(args['list-parameters']);
const summary = Boolean(args.summary);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const parameterRoot = String(args['parameter-root'] || manifest.parameterRoot || '').replace(/\/$/, '');
const outputDir = outputDirOverride || manifest.outputDir;

if (!parameterRoot) {
  fail('Manifest must declare parameterRoot, or pass --parameter-root.');
}

if (!outputDir) {
  fail('Manifest must declare outputDir, or pass --output-dir.');
}

const entries = collectParameterEntries(manifest, parameterRoot);
validateExamples(manifest, manifestPath);

if (listParameters) {
  for (const entry of entries) {
    console.log(`${entry.path}\t${entry.type}\t${entry.required ? 'required' : 'optional'}`);
  }
  process.exit(0);
}

if (validateOnly) {
  if (summary) {
    console.log(`Validated manifest ${manifestPath}`);
    console.log(`- Files: ${manifest.files.length}`);
    console.log(`- Parameters: ${entries.length}`);
  }
  process.exit(0);
}

const parameterNames = Array.from(new Set(entries.map((entry) => entry.path)));
const values = provider === 'file'
  ? readFileParameters(parameterFile)
  : readAwsParameters(parameterNames);

const missing = entries
  .filter((entry) => entry.required && !hasUsableValue(values.get(entry.path)))
  .map((entry) => `${entry.file}:${entry.name} (${entry.path})`);

if (missing.length) {
  fail(`Missing required parameters:\n${missing.map((item) => `- ${item}`).join('\n')}`);
}

const rendered = renderFiles(manifest, entries, values);

if (dryRun) {
  printSummary(rendered, outputDir, true);
  process.exit(0);
}

await writeFilesAtomically(rendered, outputDir);
printSummary(rendered, outputDir, false);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;

    const key = item.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
}

function collectParameterEntries(source, root) {
  if (!Array.isArray(source.files)) {
    fail('Manifest must contain a files array.');
  }

  return source.files.flatMap((fileConfig) => {
    if (!fileConfig.file || !Array.isArray(fileConfig.parameters)) {
      fail('Each manifest file entry must declare file and parameters.');
    }

    const servicePath = String(fileConfig.parameterPath || fileConfig.service || path.basename(fileConfig.file, '.env'));

    return fileConfig.parameters.map((parameter) => {
      if (!parameter.name) {
        fail(`Manifest entry for ${fileConfig.file} includes a parameter without a name.`);
      }

      return {
        file: fileConfig.file,
        name: parameter.name,
        required: parameter.required !== false,
        path: parameter.path || `${root}/${servicePath}/${parameter.name}`,
        type: parameter.type || 'String',
      };
    });
  });
}

function validateExamples(source, sourcePath) {
  const manifestDir = path.dirname(sourcePath);
  const examplesDir = path.join(manifestDir, 'examples');

  for (const fileConfig of source.files) {
    const examplePath = path.join(examplesDir, `${fileConfig.file}.example`);
    if (!existsSync(examplePath)) {
      fail(`Missing env example for ${fileConfig.file}: ${examplePath}`);
    }

    const exampleKeys = new Set(
      readFileSync(examplePath, 'utf-8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => line.split('=')[0]?.trim())
        .filter(Boolean),
    );

    const missingKeys = fileConfig.parameters
      .map((parameter) => parameter.name)
      .filter((name) => !exampleKeys.has(name));

    if (missingKeys.length) {
      fail(`Env example ${examplePath} is missing keys: ${missingKeys.join(', ')}`);
    }
  }
}

function readFileParameters(filePath) {
  if (!filePath) {
    fail('File provider requires --parameters <path> or ENV_RENDER_PARAMETER_FILE.');
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const values = new Map();

  if (Array.isArray(raw.parameters)) {
    for (const item of raw.parameters) {
      if (item?.name && Object.prototype.hasOwnProperty.call(item, 'value')) {
        values.set(String(item.name), String(item.value));
      }
    }
    return values;
  }

  for (const [name, value] of Object.entries(raw)) {
    values.set(name, String(value));
  }

  return values;
}

function readAwsParameters(names) {
  const values = new Map();

  for (const batch of chunks(names, 10)) {
    const result = spawnSync(
      'aws',
      ['ssm', 'get-parameters', '--with-decryption', '--names', ...batch, '--output', 'json'],
      { encoding: 'utf-8' },
    );

    if (result.status !== 0) {
      fail(`Unable to read SSM parameters. AWS CLI exited ${result.status}.\n${result.stderr.trim()}`);
    }

    const payload = JSON.parse(result.stdout || '{}');
    for (const parameter of payload.Parameters || []) {
      values.set(parameter.Name, parameter.Value ?? '');
    }
  }

  return values;
}

function renderFiles(source, entries, values) {
  const grouped = new Map();

  for (const entry of entries) {
    if (!grouped.has(entry.file)) grouped.set(entry.file, []);
    const value = values.get(entry.path);

    if (hasUsableValue(value)) {
      grouped.get(entry.file).push(`${entry.name}=${formatEnvValue(value)}`);
    }
  }

  return source.files.map((fileConfig) => ({
    file: fileConfig.file,
    lines: [
      '# Generated by scripts/deploy/render-env.mjs from SSM Parameter Store.',
      '# Do not edit this file manually on the host.',
      ...(grouped.get(fileConfig.file) || []),
      '',
    ],
  }));
}

async function writeFilesAtomically(files, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const tempDir = mkdtempSync(path.join(targetDir, '.misneach-env-'));

  try {
    for (const file of files) {
      const finalPath = path.join(targetDir, file.file);
      const tempPath = path.join(tempDir, file.file);
      writeFileSync(tempPath, file.lines.join('\n'), { mode: 0o600 });
      renameSync(tempPath, finalPath);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function formatEnvValue(value) {
  const stringValue = String(value);
  if (stringValue.includes('\n') || stringValue.includes('\r')) {
    fail('Env values may not contain newlines.');
  }

  if (stringValue === '') return '""';
  if (/^[A-Za-z0-9_./:@,%+=-]+$/.test(stringValue)) return stringValue;

  return JSON.stringify(stringValue);
}

function hasUsableValue(value) {
  return value !== undefined && value !== null && String(value).length > 0;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function printSummary(files, targetDir, isDryRun) {
  if (!summary) return;

  const mode = isDryRun ? 'Validated' : 'Rendered';
  console.log(`${mode} ${files.length} env files in ${targetDir}`);
  for (const file of files) {
    const count = Math.max(file.lines.length - 3, 0);
    console.log(`- ${file.file}: ${count} values`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
