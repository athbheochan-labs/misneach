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
