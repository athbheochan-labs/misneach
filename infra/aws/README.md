# AWS Infrastructure

AWS CDK workspace for Decyphr infrastructure. The initial stack establishes the serverless public API deployment boundary for Misneach waitlist and survey flows without changing application behavior.

## Layout

- `bin/decyphr-public.ts`: CDK app entrypoint.
- `lib/public-api-stack.ts`: stack for public Misneach serverless resources.
- `cdk.json`: CDK command configuration.

## Environment

The current serverless stack targets production only.

The stack name convention is:

```txt
decyphr-prod-public-api
```

The CDK app defaults to `prod`. A different environment can be added later with CDK context or `DECYPHR_ENV`, but the supported deployment path for now is production:

```bash
npm run synth --workspace @decyphr/aws-infra
```

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

Deploy:

```bash
npm run deploy --workspace @decyphr/aws-infra
```

Future tickets will add Lambda, API Gateway, DynamoDB, and local Floci deployment support to this workspace.
