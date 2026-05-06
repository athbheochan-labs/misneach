import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { WaitlistModule } from './waitlist.module';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Waitlist gateway routes (integration)', () => {
  let app: INestApplication;
  let fetchMock: jest.Mock;

  beforeAll(async () => {
    process.env.WAITLIST_SERVICE_URL = 'http://waitlist:3021';
  });

  beforeEach(async () => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WaitlistModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  it('POST /waitlist/join returns 400 for invalid interest', async () => {
    const response = await request(app.getHttpServer())
      .post('/waitlist/join')
      .send({
        email: 'test@example.com',
        interest: 'invalid-interest',
      })
      .expect(400);

    expect(response.body.error).toBe('Invalid waitlist interest');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST /waitlist/join proxies valid payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/waitlist/join')
      .send({
        email: 'test@example.com',
        interest: 'business_pack',
        name: 'Test User',
        source: 'integration-test',
      })
      .expect(201);

    expect(response.body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://waitlist:3021/waitlist/join');
  });

  it('POST /waitlist/join maps unreachable upstream to 502', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const response = await request(app.getHttpServer())
      .post('/waitlist/join')
      .send({
        email: 'test@example.com',
        interest: 'business_pack',
      })
      .expect(502);

    expect(response.body.error).toContain('Waitlist service unreachable');
  });
});
