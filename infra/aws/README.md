# AWS Infrastructure

AWS CDK workspace for Decyphr infrastructure. The initial stack establishes the serverless public API deployment boundary for Misneach waitlist and survey flows without changing application behavior.

## Layout

- `bin/decyphr-public.ts`: CDK app entrypoint.
- `lib/public-api-stack.ts`: stack for public Misneach serverless resources.
- `cdk.json`: CDK command configuration.

## Environment

The real AWS serverless stack targets production. Local Floci deployments use the `local` environment name through the Floci scripts.

The stack name convention is:

```txt
decyphr-prod-public-api
```

The CDK app defaults to `prod` for real AWS deployments:

```bash
npm run synth --workspace @decyphr/aws-infra
```

Local Floci resources use names like `decyphr-local-public-api`, `decyphr-local-waitlist`, and `decyphr-local-survey-responses`.

## Commands

Bootstrap an AWS account/region once:

```bash
npm run bootstrap --workspace @decyphr/aws-infra -- aws://<account-id>/<region>
```

Preview generated CloudFormation:

```bash
npm run synth --workspace @decyphr/aws-infra
```

Preview changes:

```bash
npm run diff --workspace @decyphr/aws-infra
```

Deploy to AWS:

```bash
npm run deploy --workspace @decyphr/aws-infra
```

## Local Floci

Start local AWS services:

```bash
npm run floci:start
```

Synthesize against local settings:

```bash
npm run floci:cdk:synth
```

Bootstrap the local CDK toolkit stack once:

```bash
npm run floci:cdk:bootstrap
```

This command is safe to rerun locally. If Floci already has CDK bootstrap resources, the script treats that as a no-op.

Deploy the public API stack to Floci:

```bash
npm run floci:cdk:deploy
```

Run API-path integration tests against Floci DynamoDB:

```bash
npm run floci:test:public-api
```

The local stack includes HTTP API Gateway routes, Lambda handlers, and DynamoDB tables for waitlist and survey flows. Lambda functions in the local stack receive `AWS_ENDPOINT_URL`/`FLOCI_AWS_ENDPOINT_URL` so they use emulated DynamoDB.

## Public API Outputs

The stack outputs `PublicApiUrl`. Set `misneach-web` server-side `WAITLIST_API_URL` and `SURVEYS_API_URL` to that value to route the existing proxies to Lambda:

```txt
WAITLIST_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
SURVEYS_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
```
