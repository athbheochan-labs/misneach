process.env.SURVEY_TEMPLATES_TABLE_NAME = 'survey-templates';
process.env.SURVEY_CAMPAIGNS_TABLE_NAME = 'survey-campaigns';
process.env.SURVEY_RESPONSES_TABLE_NAME = 'survey-responses';
process.env.WEB_PUBLIC_URL = 'https://misneach.ie';

const send = jest.fn();

jest.mock('../aws/dynamodb', () => ({
  createDynamoDocumentClient: () => ({ send }),
}));

jest.mock('./email', () => ({
  sendSurveyCampaignLinksEmail: jest.fn().mockResolvedValue(undefined),
}));

import { handler } from './handler';
import { sendSurveyCampaignLinksEmail } from './email';

describe('survey Lambda handler', () => {
  beforeEach(() => {
    send.mockReset();
  });

  it('returns 400 for invalid JSON bodies', async () => {
    const response = await handler({
      rawPath: '/surveys/campaigns',
      requestContext: { http: { method: 'POST' } },
      body: '{nope',
      isBase64Encoded: false,
    } as never);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Invalid JSON body');
  });

  it('routes campaign creation and sends campaign email', async () => {
    send.mockResolvedValue({});

    const response = await handler({
      rawPath: '/surveys/campaigns',
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({ businessName: 'Cafe Beag', email: 'hello@example.com' }),
      isBase64Encoded: false,
    } as never);

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).campaign.businessName).toBe('Cafe Beag');
    expect(sendSurveyCampaignLinksEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for unknown routes', async () => {
    const response = await handler({
      rawPath: '/surveys/nope',
      requestContext: { http: { method: 'GET' } },
      isBase64Encoded: false,
    } as never);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('Not found');
  });
});
