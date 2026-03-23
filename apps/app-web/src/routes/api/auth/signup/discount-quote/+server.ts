import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { quoteDiscount } from '$lib/server/discounts';

function resolvePlan(input: unknown): 'monthly' | 'annual' | null {
  if (input === 'monthly' || input === 'annual') return input;
  return null;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const code = String(body?.code || '').trim();
    const plan = resolvePlan(body?.plan);

    if (!code || !plan) {
      return json({ error: 'Invalid discount request' }, { status: 400 });
    }

    const baseCents = plan === 'monthly' ? 499 : 4900;
    const quote = await quoteDiscount({
      code,
      audience: 'learner',
      appliesTo: plan,
      baseCents,
      currency: 'eur',
    });

    return json(quote);
  } catch (error) {
    console.error('Signup discount quote failed', error);
    return json({ error: 'Unable to validate discount code' }, { status: 500 });
  }
};
