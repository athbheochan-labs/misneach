import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import { SURVEY_TEMPLATES } from '@misneach/public-flows';
import { listenLocalPublicApiServer } from './server';
import type { Server } from 'http';

const maybeDescribe = process.env.RUN_FLOCI_INTEGRATION ? describe : describe.skip;

maybeDescribe('Public API Floci integration', () => {
  const endpoint = process.env.FLOCI_AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
  const suffix = `${Date.now()}-${process.pid}`;
  const tableNames = {
    waitlist: `public-api-waitlist-${suffix}`,
    templates: `public-api-survey-templates-${suffix}`,
    campaigns: `public-api-survey-campaigns-${suffix}`,
    responses: `public-api-survey-responses-${suffix}`,
  };
  const dynamo = new DynamoDBClient({
    endpoint,
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });

  let server: Server | undefined;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.WAITLIST_TABLE_NAME = tableNames.waitlist;
    process.env.SURVEY_TEMPLATES_TABLE_NAME = tableNames.templates;
    process.env.SURVEY_CAMPAIGNS_TABLE_NAME = tableNames.campaigns;
    process.env.SURVEY_RESPONSES_TABLE_NAME = tableNames.responses;
    process.env.AWS_ENDPOINT_URL = endpoint;
    process.env.FLOCI_AWS_ENDPOINT_URL = endpoint;
    process.env.AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
    process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test';
    process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test';
    process.env.WEB_PUBLIC_URL = 'http://localhost:5173';

    await assertFlociReachable();
    await Promise.all([
      createWaitlistTable(tableNames.waitlist),
      createSurveyTemplatesTable(tableNames.templates),
      createSurveyCampaignsTable(tableNames.campaigns),
      createSurveyResponsesTable(tableNames.responses),
    ]);
    await Promise.all(Object.values(tableNames).map((TableName) => waitForTable(TableName)));

    const listening = await listenLocalPublicApiServer();
    server = listening.server;
    baseUrl = listening.url;
  }, 30_000);

  afterAll(async () => {
    const activeServer = server;
    if (activeServer) {
      await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    }
    await Promise.all(
      Object.values(tableNames).map((TableName) =>
        dynamo.send(new DeleteTableCommand({ TableName })).catch(() => undefined),
      ),
    );
    dynamo.destroy();
  });

  it('joins the waitlist idempotently through the public API path', async () => {
    const payload = {
      email: 'hello@example.com',
      interest: 'business_pack',
      source: '/waitlist',
    };

    const firstResponse = await postJson('/waitlist/join', payload);
    const secondResponse = await postJson('/waitlist/join', payload);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const first = await firstResponse.json();
    const second = await secondResponse.json();

    expect(first).toMatchObject({ ok: true, alreadyJoined: false });
    expect(second).toEqual({ ok: true, alreadyJoined: true, id: first.id });
  });

  it('runs survey setup, submission, campaign lookup, token lookup, and aggregate over the public API path', async () => {
    const templatesResponse = await fetch(`${baseUrl}/surveys/templates/public/appetite`);
    expect(templatesResponse.status).toBe(200);

    const templates = await templatesResponse.json();
    expect(templates.staff.key).toBe('staff-appetite');
    expect(templates.customers.key).toBe('customers-appetite');

    const campaignResponse = await postJson('/surveys/campaigns', {
      businessName: 'Cafe Beag',
      email: 'hello@example.com',
      town: 'Galway',
    });
    expect(campaignResponse.status).toBe(201);

    const campaignSetup = await campaignResponse.json();
    expect(campaignSetup.campaign.businessName).toBe('Cafe Beag');
    expect(campaignSetup.links.manageUrl).toContain('/survey/manage?t=');
    expect(new URL(campaignSetup.links.staffSurveyUrl).searchParams.get('c')).toBe(campaignSetup.campaign.id);

    const campaignId = campaignSetup.campaign.id;
    const manageToken = new URL(campaignSetup.links.manageUrl).searchParams.get('t');
    expect(manageToken).toBeTruthy();

    const publicCampaignResponse = await fetch(`${baseUrl}/surveys/campaigns/${campaignId}/public`);
    expect(publicCampaignResponse.status).toBe(200);
    expect(await publicCampaignResponse.json()).toEqual({
      campaign: {
        id: campaignId,
        businessName: 'Cafe Beag',
        town: 'Galway',
      },
    });

    const submittedResponse = await postJson('/surveys/responses/staff-appetite', {
      campaignId,
      answers: staffAnswers(),
      meta: { source: 'floci-integration' },
    });
    expect(submittedResponse.status).toBe(201);
    expect(await submittedResponse.json()).toMatchObject({ ok: true });

    const aggregateResponse = await fetch(`${baseUrl}/surveys/templates/staff-appetite/aggregate?campaignId=${campaignId}`);
    expect(aggregateResponse.status).toBe(200);
    const aggregate = await aggregateResponse.json();
    expect(aggregate.responseCount).toBe(1);
    expect(aggregate.questions.q1.optionCounts['None at all - it never stuck']).toBe(1);

    const tokenResponse = await fetch(`${baseUrl}/surveys/campaigns/by-token/${manageToken}`);
    expect(tokenResponse.status).toBe(200);
    const managePayload = await tokenResponse.json();
    expect(managePayload.campaign.id).toBe(campaignId);
    expect(managePayload.results.staff.responseCount).toBe(1);
  });

  it('returns 400 and 404 through the public API path', async () => {
    const invalidJoin = await postJson('/waitlist/join', {
      email: 'hello@example.com',
      interest: 'not-real',
    });
    expect(invalidJoin.status).toBe(400);

    const invalidSurvey = await postJson('/surveys/responses/staff-appetite', {
      answers: {},
    });
    expect(invalidSurvey.status).toBe(400);

    const missingCampaign = await fetch(`${baseUrl}/surveys/campaigns/missing/public`);
    expect(missingCampaign.status).toBe(404);
  });

  function postJson(path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async function createWaitlistTable(TableName: string) {
    await dynamo.send(
      new CreateTableCommand({
        TableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: 'entryKey', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'entryKey', KeyType: 'HASH' }],
      }),
    );
  }

  async function createSurveyTemplatesTable(TableName: string) {
    await dynamo.send(
      new CreateTableCommand({
        TableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }],
      }),
    );
  }

  async function createSurveyCampaignsTable(TableName: string) {
    await dynamo.send(
      new CreateTableCommand({
        TableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'manageToken', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'manageTokenIndex',
            KeySchema: [{ AttributeName: 'manageToken', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    );
  }

  async function createSurveyResponsesTable(TableName: string) {
    await dynamo.send(
      new CreateTableCommand({
        TableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'templateKey', AttributeType: 'S' },
          { AttributeName: 'templateCampaignKey', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'templateKeyIndex',
            KeySchema: [{ AttributeName: 'templateKey', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'templateCampaignKeyIndex',
            KeySchema: [{ AttributeName: 'templateCampaignKey', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    );
  }

  async function waitForTable(TableName: string) {
    await waitUntilTableExists(
      {
        client: dynamo,
        maxWaitTime: 10,
        minDelay: 1,
        maxDelay: 2,
      },
      { TableName },
    );
  }

  async function assertFlociReachable() {
    try {
      await dynamo.send(new ListTablesCommand({ Limit: 1 }));
    } catch {
      throw new Error(
        `Floci DynamoDB is not reachable at ${endpoint}. Start it with npm run floci:start before running npm run floci:test:public-api.`,
      );
    }
  }
});

function staffAnswers() {
  const template = SURVEY_TEMPLATES.find((entry) => entry.id === 'staff-cafe-v1');
  if (!template) throw new Error('Staff survey template is missing');

  return Object.fromEntries(
    template.questions.map((question) => {
      if (question.type === 'checkbox') return [question.id, [question.options?.[0]]];
      if (question.type === 'text') return [question.id, ''];
      return [question.id, question.options?.[0]];
    }),
  );
}
