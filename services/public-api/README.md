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

Start Floci, then run the API-path integration suite:

```bash
npm run floci:start
npm run floci:test:public-api
```

The integration tests create isolated local DynamoDB tables, start a local HTTP adapter over the Lambda handlers, and exercise the public routes with `fetch()`.

To run the public API HTTP adapter manually:

```bash
WAITLIST_TABLE_NAME=decyphr-local-waitlist \
SURVEY_TEMPLATES_TABLE_NAME=decyphr-local-survey-templates \
SURVEY_CAMPAIGNS_TABLE_NAME=decyphr-local-survey-campaigns \
SURVEY_RESPONSES_TABLE_NAME=decyphr-local-survey-responses \
AWS_ENDPOINT_URL=http://localhost:4566 \
npm run start:local --workspace public-api
```

The adapter starts at port `5174` by default and tries the next ports if that one is already in use. Override the starting port with `PUBLIC_API_LOCAL_PORT`.

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
