#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const args = parseArgs(process.argv.slice(2));
const manifestPath = args.manifest || 'deploy/env/manifest.json';
const rootDir = args.root || process.cwd();

const serviceRoots = [
  ['translator', 'services/translation/translation-connector'],
  ['lexicon', 'services/lexicon'],
  ['phrasebook', 'services/phrasebook'],
  ['flashcards', 'services/flashcards'],
  ['focus', 'services/focus'],
  ['practice', 'services/practice'],
  ['courses', 'services/courses'],
  ['challenges', 'services/challenges'],
  ['payment', 'services/payment'],
  ['discounts', 'services/discounts'],
  ['business', 'services/business'],
  ['waitlist', 'services/waitlist'],
  ['client', 'services/client'],
];

const globallyIgnored = new Set([
  'AWS_ACCESS_KEY_ID',
  'AWS_DEFAULT_REGION',
  'AWS_ENDPOINT_URL',
  'AWS_REGION',
  'AWS_SECRET_ACCESS_KEY',
  'DISABLE_EXPRESS_SESSION',
  'NODE_ENV',
]);

const serviceIgnored = {
  business: [
    'DB_HOST',
    'DB_NAME',
    'DB_PASSWORD',
    'DB_PORT',
    'DB_USER',
    'DISCOUNT_SERVICE_URL',
    'EMAIL_DELIVERY',
    'EMAIL_FROM',
    'INTERNAL_AUTH_SECRET',
    'RESEND_API_KEY',
    'SURVEY_PUBLIC_BASE_URL',
    'WEB_PUBLIC_URL',
  ],
  challenges: ['DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT', 'DB_USER'],
  client: [
    'AUTH_TOKEN_SECRET',
    'CORS_ORIGINS',
    'DISCOUNT_SERVICE_URL',
    'LEXICON_INTERNAL_URL',
    'LEXICON_INTERNAL_URLS',
    'NLP_SERVICE_URL',
    'PHRASEBOOK_URL',
    'SESSION_SECRET',
  ],
  courses: [
    'COURSES_CONTENT_DIR',
    'COURSES_DB_BOOTSTRAP_FROM_FILES',
    'COURSES_PREVIEW_TOKEN_TTL_SEC',
    'DB_HOST',
    'DB_NAME',
    'DB_PASSWORD',
    'DB_PORT',
    'DB_USER',
    'FLASHCARDS_SERVICE_URL',
    'LEXICON_SERVICE_URL',
    'PHRASEBOOK_SERVICE_URL',
    'WEB_SESSION_SECRET',
  ],
  focus: ['DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT', 'DB_USER', 'INTERNAL_AUTH_SECRET'],
  flashcards: ['DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT', 'DB_USER', 'LEXICON_SERVICE_URL'],
  payment: ['STRIPE_API_BASE', 'STRIPE_AUTOCONFIRM'],
  practice: ['DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT', 'DB_USER', 'LEXICON_SERVICE_URL'],
};

const manifest = JSON.parse(readFileSync(path.resolve(rootDir, manifestPath), 'utf-8'));
const manifestByService = new Map(
  manifest.files.map((fileConfig) => [
    fileConfig.service || path.basename(fileConfig.file, '.env'),
    {
      file: fileConfig.file,
      keys: new Set(fileConfig.parameters.map((parameter) => parameter.name)),
    },
  ]),
);

const failures = [];
let discoveredCount = 0;

for (const [service, serviceRoot] of serviceRoots) {
  const manifestEntry = manifestByService.get(service);
  if (!manifestEntry) {
    failures.push(`${service}: missing service entry in ${manifestPath}`);
    continue;
  }

  const examplePath = path.resolve(rootDir, 'deploy/env/examples', `${manifestEntry.file}.example`);
  const exampleKeys = readExampleKeys(examplePath);
  const sourceFiles = collectSourceFiles(path.resolve(rootDir, serviceRoot));
  const discovered = new Map();

  for (const sourceFile of sourceFiles) {
    const content = readFileSync(sourceFile, 'utf-8');
    for (const key of discoverEnvKeys(content)) {
      if (globallyIgnored.has(key)) continue;
      if ((serviceIgnored[service] || []).includes(key)) continue;

      if (!discovered.has(key)) discovered.set(key, []);
      discovered.get(key).push(path.relative(rootDir, sourceFile));
    }
  }

  discoveredCount += discovered.size;

  for (const [key, files] of discovered.entries()) {
    if (!manifestEntry.keys.has(key)) {
      failures.push(`${service}: ${key} is used in ${files[0]} but missing from ${manifestPath}`);
    }

    if (!exampleKeys.has(key)) {
      failures.push(`${service}: ${key} is used in ${files[0]} but missing from ${examplePath}`);
    }
  }
}

if (failures.length) {
  console.error('Environment contract check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Environment contract check passed for ${serviceRoots.length} services and ${discoveredCount} declared runtime env usages.`);

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

function collectSourceFiles(directory) {
  if (!existsSync(directory)) return [];

  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (['build', 'coverage', 'dist', 'node_modules'].includes(entry)) continue;
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (!/\.(cjs|js|mjs|sh|ts)$/.test(entry)) continue;
    if (/\.(spec|test)\.(js|ts)$/.test(entry)) continue;
    files.push(fullPath);
  }

  return files;
}

function discoverEnvKeys(content) {
  const keys = new Set();
  const processEnvPattern = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const configGetPattern = /\.get(?:<[^>]+>)?\(\s*['"`]([A-Z][A-Z0-9_]*)['"`]/g;

  for (const match of content.matchAll(processEnvPattern)) {
    keys.add(match[1]);
  }

  for (const match of content.matchAll(configGetPattern)) {
    keys.add(match[1]);
  }

  return keys;
}

function readExampleKeys(examplePath) {
  if (!existsSync(examplePath)) return new Set();

  return new Set(
    readFileSync(examplePath, 'utf-8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0]?.trim())
      .filter(Boolean),
  );
}
