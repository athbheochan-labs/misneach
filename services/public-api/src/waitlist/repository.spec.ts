import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { WaitlistRepository, waitlistEntryKey } from './repository';

describe('WaitlistRepository', () => {
  it('writes a new waitlist entry with a uniqueness condition', async () => {
    const send = jest.fn().mockResolvedValueOnce({});
    const repo = new WaitlistRepository(
      { send } as never,
      'waitlist-table',
      () => new Date('2026-08-06T12:00:00.000Z'),
      () => 'entry-id',
    );

    await expect(
      repo.join({
        email: 'hello@example.com',
        interest: 'business_pack',
        name: 'Aaron',
        source: '/waitlist',
      }),
    ).resolves.toEqual({
      ok: true,
      alreadyJoined: false,
      id: 'entry-id',
    });

    expect(send).toHaveBeenCalledTimes(1);
    const putCommand = send.mock.calls[0][0];
    expect(putCommand.input).toMatchObject({
      TableName: 'waitlist-table',
      ConditionExpression: 'attribute_not_exists(entryKey)',
      Item: {
        entryKey: 'hello@example.com#business_pack',
        id: 'entry-id',
        email: 'hello@example.com',
        interest: 'business_pack',
        name: 'Aaron',
        source: '/waitlist',
      },
    });
  });

  it('returns the existing id when the unique key already exists', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(
        new ConditionalCheckFailedException({
          message: 'duplicate',
          $metadata: {},
        }),
      )
      .mockResolvedValueOnce({ Item: { id: 'existing-id' } });
    const repo = new WaitlistRepository(
      { send } as never,
      'waitlist-table',
      () => new Date('2026-08-06T12:00:00.000Z'),
      () => 'new-id',
    );

    await expect(
      repo.join({
        email: 'hello@example.com',
        interest: 'business_pack',
      }),
    ).resolves.toEqual({
      ok: true,
      alreadyJoined: true,
      id: 'existing-id',
    });
  });

  it('builds a stable unique key from normalized email and interest', () => {
    expect(waitlistEntryKey('hello@example.com', 'individual_course_access')).toBe(
      'hello@example.com#individual_course_access',
    );
  });
});
