#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PublicApiStack } from '../lib/public-api-stack';

const app = new cdk.App();

const environmentName = app.node.tryGetContext('env') || process.env.DECYPHR_ENV || 'prod';
const stackName = `decyphr-${environmentName}-public-api`;

new PublicApiStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'eu-west-1',
  },
  environmentName,
  stackName,
  description: 'Serverless public API infrastructure for Misneach waitlist and survey flows.',
});
