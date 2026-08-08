#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const args = parseArgs(process.argv.slice(2));
const manifestPath = args.manifest || 'deploy/env/manifest.json';
const envDir = args['env-dir'] || '';
const dryRun = Boolean(args['dry-run']);
const summary = args.summary !== false;
const overwrite = args.overwrite !== false && !args['no-overwrite'];

if (!envDir) {
  fail('Pass --env-dir <path> containing the current production *.env files.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const parameterRoot = String(args['parameter-root'] || manifest.parameterRoot || '').replace(/\/$/, '');

if (!parameterRoot) {
  fail('Manifest must declare parameterRoot, or pass --parameter-root.');
}

if (!Array.isArray(manifest.files)) {
  fail('Manifest must contain a files array.');
}

const parameters = collectParameters(manifest, parameterRoot, envDir);
const missing = parameters
  .filter((parameter) => parameter.required && !hasUsableValue(parameter.value))
  .map((parameter) => `${parameter.file}:${parameter.name} (${parameter.path})`);

if (missing.length) {
  fail(`Missing required env values:\n${missing.map((item) => `- ${item}`).join('\n')}`);
}

const parametersToWrite = parameters.filter((parameter) => hasUsableValue(parameter.value));

if (dryRun) {
  printSummary(parametersToWrite, true);
  process.exit(0);
}

writeParameters(parametersToWrite, overwrite);
printSummary(parametersToWrite, false);

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

function collectParameters(source, root, sourceEnvDir) {
  return source.files.flatMap((fileConfig) => {
    if (!fileConfig.file || !Array.isArray(fileConfig.parameters)) {
      fail('Each manifest file entry must declare file and parameters.');
    }

    const filePath = path.join(sourceEnvDir, fileConfig.file);
    if (!existsSync(filePath)) {
      fail(`Missing env file: ${filePath}`);
    }

    const envValues = parseEnvFile(filePath);
    const servicePath = String(fileConfig.parameterPath || fileConfig.service || path.basename(fileConfig.file, '.env'));

    return fileConfig.parameters.map((parameter) => {
      if (!parameter.name) {
        fail(`Manifest entry for ${fileConfig.file} includes a parameter without a name.`);
      }

      return {
        file: fileConfig.file,
        name: parameter.name,
        path: parameter.path || `${root}/${servicePath}/${parameter.name}`,
        required: parameter.required !== false,
        type: parameter.type || 'String',
        value: envValues.get(parameter.name),
      };
    });
  });
}

function parseEnvFile(filePath) {
  const values = new Map();
  const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const withoutExport = line.startsWith('export ') ? line.slice('export '.length).trimStart() : line;
    const equalsIndex = withoutExport.indexOf('=');
    if (equalsIndex < 1) continue;

    const key = withoutExport.slice(0, equalsIndex).trim();
    const rawValue = withoutExport.slice(equalsIndex + 1).trim();
    if (!key) continue;

    values.set(key, parseEnvValue(rawValue));
  }

  return values;
}

function parseEnvValue(rawValue) {
  if (rawValue.length < 2) return rawValue;

  const first = rawValue[0];
  const last = rawValue[rawValue.length - 1];

  if (first === '"' && last === '"') {
    return JSON.parse(rawValue);
  }

  if (first === "'" && last === "'") {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function writeParameters(items, shouldOverwrite) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'misneach-ssm-seed-'));

  try {
    for (const item of items) {
      const payloadPath = path.join(tempDir, `${safeFileName(item.path)}.json`);
      writeFileSync(
        payloadPath,
        JSON.stringify({
          Name: item.path,
          Type: item.type,
          Value: item.value,
          Overwrite: shouldOverwrite,
        }),
        { mode: 0o600 },
      );

      const result = spawnSync(
        'aws',
        ['ssm', 'put-parameter', '--cli-input-json', `file://${payloadPath}`, '--output', 'json'],
        { encoding: 'utf-8' },
      );

      if (result.status !== 0) {
        fail(`Unable to write SSM parameter ${item.path}. AWS CLI exited ${result.status}.\n${result.stderr.trim()}`);
      }
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function safeFileName(value) {
  return value.replace(/[^A-Za-z0-9_.-]/g, '_');
}

function hasUsableValue(value) {
  return value !== undefined && value !== null && String(value).length > 0;
}

function printSummary(items, isDryRun) {
  if (!summary) return;

  const byType = items.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});

  console.log(`${isDryRun ? 'Validated' : 'Seeded'} ${items.length} SSM parameters from env files.`);
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`- ${type}: ${count}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
