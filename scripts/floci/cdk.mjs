#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const command = process.argv[2] || 'synth';
const forwardedArgs = process.argv.slice(3);
const endpoint = process.env.FLOCI_AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-1';

const env = {
  ...process.env,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'test',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  AWS_DEFAULT_REGION: region,
  AWS_REGION: region,
  AWS_ENDPOINT_URL: endpoint,
  FLOCI_AWS_ENDPOINT_URL: endpoint,
  CDK_DEFAULT_ACCOUNT: process.env.CDK_DEFAULT_ACCOUNT || '000000000000',
  CDK_DEFAULT_REGION: region,
  DECYPHR_ENV: 'local',
};

if (command === 'bootstrap' && isAlreadyBootstrapped()) {
  console.log(`Floci CDK bootstrap already exists at ${endpoint}; skipping.`);
  process.exit(0);
}

const args = ['run', command, '--workspace', '@decyphr/aws-infra', '--', ...forwardedArgs];
const result = spawnSync('npm', args, {
  cwd: new URL('../..', import.meta.url),
  env,
  encoding: 'utf8',
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (
  command === 'bootstrap' &&
  result.status !== 0 &&
  `${result.stdout || ''}\n${result.stderr || ''}`.includes('already exists')
) {
  console.warn('Floci CDK bootstrap resources already exist; continuing.');
  process.exit(0);
}

process.exit(result.status ?? 1);

function isAlreadyBootstrapped() {
  const result = spawnSync(
    'aws',
    [
      'ssm',
      'get-parameter',
      '--name',
      '/cdk-bootstrap/hnb659fds/version',
      '--endpoint-url',
      endpoint,
      '--region',
      region,
    ],
    {
      env,
      encoding: 'utf8',
    },
  );

  return result.status === 0;
}
