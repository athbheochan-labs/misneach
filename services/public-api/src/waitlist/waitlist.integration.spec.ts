import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { handler } from './handler';

const maybeDescribe = process.env.RUN_FLOCI_INTEGRATION ? describe : describe.skip;

maybeDescribe('WaitlistRepository Floci integration', () => {
  const endpoint = process.env.FLOCI_AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
  const tableName = `waitlist-integration-${Date.now()}`;
  const dynamo = new DynamoDBClient({
    endpoint,
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });
  beforeAll(async () => {
    process.env.WAITLIST_TABLE_NAME = tableName;
    process.env.AWS_ENDPOINT_URL = endpoint;
    process.env.AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
    process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test';
    process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test';

    await dynamo.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: 'entryKey', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'entryKey', KeyType: 'HASH' }],
      }),
    );
  });

  afterAll(async () => {
    await dynamo.send(new DeleteTableCommand({ TableName: tableName })).catch(() => undefined);
    dynamo.destroy();
  });

  it('is idempotent through the Lambda handler against local DynamoDB', async () => {
    const event = {
      body: JSON.stringify({
        email: 'hello@example.com',
        interest: 'business_pack',
        source: '/waitlist',
      }),
      isBase64Encoded: false,
    } as never;

    const firstResponse = await handler(event);
    const secondResponse = await handler(event);
    const first = JSON.parse(firstResponse.body);
    const second = JSON.parse(secondResponse.body);

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(first).toMatchObject({ ok: true, alreadyJoined: false });
    expect(second).toEqual({ ok: true, alreadyJoined: true, id: first.id });
  });
});
