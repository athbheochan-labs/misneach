import { handler } from './handler';

jest.mock('../aws/dynamodb', () => ({
  createDynamoDocumentClient: () => ({
    send: jest.fn().mockResolvedValue({}),
  }),
}));

process.env.WAITLIST_TABLE_NAME = 'waitlist-table';

describe('waitlist Lambda handler', () => {
  it('returns 400 for invalid interests', async () => {
    const response = await handler({
      body: JSON.stringify({
        email: 'hello@example.com',
        interest: 'nope',
      }),
      isBase64Encoded: false,
    } as never);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Invalid waitlist interest',
    });
  });

  it('returns the existing response shape for valid joins', async () => {
    const response = await handler({
      body: JSON.stringify({
        email: 'HELLO@example.com',
        interest: 'business_pack',
      }),
      isBase64Encoded: false,
    } as never);

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toMatchObject({
      ok: true,
      alreadyJoined: false,
    });
    expect(typeof payload.id).toBe('string');
  });
});
