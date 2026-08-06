# public-api

Lambda runtime package for public Misneach API handlers.

## Waitlist

`POST /waitlist/join` accepts the current public waitlist payload:

```json
{
  "email": "hello@example.com",
  "name": "Optional",
  "interest": "business_pack",
  "source": "/waitlist"
}
```

The response shape matches the existing service:

```json
{
  "ok": true,
  "alreadyJoined": false,
  "id": "..."
}
```

## Local Floci Integration

Run a Floci/local AWS endpoint that exposes DynamoDB, then set `AWS_ENDPOINT_URL` or `FLOCI_AWS_ENDPOINT_URL` before running:

```bash
AWS_ENDPOINT_URL=http://localhost:4566 npm run test:integration --workspace public-api
```

## Surveys

The surveys Lambda preserves the public response shapes from the existing `business` service for:

- `GET /surveys/templates/public/appetite`
- `GET /surveys/templates/:templateId`
- `GET /surveys/templates/:templateId/aggregate`
- `POST /surveys/campaigns`
- `GET /surveys/campaigns/by-token/:token`
- `GET /surveys/campaigns/:campaignId/public`
- `POST /surveys/responses/:templateId`

Set `SURVEYS_API_URL` in `misneach-web` to the CDK `PublicApiUrl` output to route the existing `/api/surveys/*` proxy to Lambda.
