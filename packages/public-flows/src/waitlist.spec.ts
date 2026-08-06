import { normalizeWaitlistJoin, PublicFlowValidationError } from '.';

describe('waitlist public flow helpers', () => {
  it('normalizes a valid waitlist payload', () => {
    expect(
      normalizeWaitlistJoin({
        email: ' HELLO@Example.COM ',
        name: ' Aaron ',
        interest: 'business_pack',
        source: ' /waitlist ',
      }),
    ).toEqual({
      email: 'hello@example.com',
      name: 'Aaron',
      interest: 'business_pack',
      source: '/waitlist',
    });
  });

  it('rejects a missing email', () => {
    expect(() => normalizeWaitlistJoin({ interest: 'business_pack' })).toThrow(
      new PublicFlowValidationError('Email is required'),
    );
  });

  it('rejects an invalid interest', () => {
    expect(() =>
      normalizeWaitlistJoin({ email: 'hello@example.com', interest: 'something_else' }),
    ).toThrow(new PublicFlowValidationError('Invalid waitlist interest'));
  });
});
