# Local AWS With Floci

This directory contains the local AWS emulator setup for the public Misneach API stack.

## Start

```bash
npm run floci:start
```

The local AWS edge endpoint is:

```txt
http://localhost:4566
```

This uses the official Docker image `floci/floci:latest`.

## CDK

Synthesize the local stack:

```bash
npm run floci:cdk:synth
```

Bootstrap the local CDK toolkit stack once:

```bash
npm run floci:cdk:bootstrap
```

The bootstrap script is safe to rerun. If Floci already has CDK bootstrap resources, the script treats that as a no-op.

Deploy the local stack into Floci:

```bash
npm run floci:cdk:deploy
```

The local stack uses the `local` environment name, so resources are named like:

```txt
decyphr-local-waitlist
decyphr-local-survey-templates
decyphr-local-survey-campaigns
decyphr-local-survey-responses
```

## Tests

Run API-path integration tests against Floci DynamoDB:

```bash
npm run floci:test:public-api
```

The tests create isolated DynamoDB tables in Floci and exercise the Lambda handlers through a local HTTP API path.
