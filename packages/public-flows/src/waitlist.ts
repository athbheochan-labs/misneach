import { PublicFlowValidationError } from './errors';

export const WAITLIST_INTERESTS = ['business_pack', 'individual_course_access'] as const;

export type WaitlistInterest = (typeof WAITLIST_INTERESTS)[number];

export type JoinWaitlistInput = {
  email?: unknown;
  name?: unknown;
  interest?: unknown;
  source?: unknown;
};

export type NormalizedJoinWaitlistInput = {
  email: string;
  name?: string;
  interest: WaitlistInterest;
  source?: string;
};

export function isWaitlistInterest(value: unknown): value is WaitlistInterest {
  return typeof value === 'string' && WAITLIST_INTERESTS.includes(value as WaitlistInterest);
}

export function normalizeWaitlistJoin(input: JoinWaitlistInput): NormalizedJoinWaitlistInput {
  const email = String(input.email || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  const source = String(input.source || '').trim();

  if (!email) {
    throw new PublicFlowValidationError('Email is required');
  }

  if (email.length > 320) {
    throw new PublicFlowValidationError('Email must be at most 320 characters');
  }

  if (!isWaitlistInterest(input.interest)) {
    throw new PublicFlowValidationError('Invalid waitlist interest');
  }

  if (name.length > 120) {
    throw new PublicFlowValidationError('Name must be at most 120 characters');
  }

  if (source.length > 120) {
    throw new PublicFlowValidationError('Source must be at most 120 characters');
  }

  return {
    email,
    interest: input.interest,
    ...(name ? { name } : {}),
    ...(source ? { source } : {}),
  };
}
