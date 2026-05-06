import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { SurveysModule } from './surveys.module';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Surveys gateway routes (integration)', () => {
  let app: INestApplication;
  let fetchMock: jest.Mock;

  beforeAll(async () => {
    process.env.BUSINESS_SERVICE_URL = 'http://business:3018';
  });

  beforeEach(async () => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SurveysModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  it('POST /surveys/campaigns returns 400 when email is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/surveys/campaigns')
      .send({
        businessName: 'Test Cafe',
      })
      .expect(400);

    expect(response.body.error).toBe('email is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST /surveys/responses/:templateId returns 400 when answers missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/surveys/responses/customers-appetite')
      .send({
        campaignId: 'abc',
      })
      .expect(400);

    expect(response.body.error).toBe('answers is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('GET /surveys/templates/public/appetite proxies success response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        staff: { key: 'staff-appetite' },
        customers: { key: 'customers-appetite' },
      }),
    );

    const response = await request(app.getHttpServer())
      .get('/surveys/templates/public/appetite')
      .expect(200);

    expect(response.body.staff.key).toBe('staff-appetite');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://business:3018/surveys/templates/public/appetite',
    );
  });

  it('GET /surveys/templates/public/appetite maps unreachable upstream to 502', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const response = await request(app.getHttpServer())
      .get('/surveys/templates/public/appetite')
      .expect(502);

    expect(response.body.error).toContain('Survey service unreachable');
  });

  it('POST /surveys/responses/:templateId preserves downstream status with normalized error body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          message: 'Template is archived',
        },
        409,
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/surveys/responses/customers-appetite')
      .send({
        campaignId: 'abc',
        answers: { q1: 'yes' },
      })
      .expect(409);

    expect(response.body.error).toBe('Template is archived');
  });
});
