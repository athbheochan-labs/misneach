import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { quoteDiscount } from '$lib/server/discounts';
import { nestFetch } from '$lib/server/api';

type Plan = 'monthly' | 'annual';

type IntentResponse = {
  id: string;
  url?: string | null;
  status: string;
  amountCents: number;
  currency: string;
  provider: 'stripe';
  livemode: boolean;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function resolvePlan(input: unknown): Plan | null {
  if (input === 'monthly' || input === 'annual') return input;
  return null;
}

function resolvePaymentBaseUrls(): string[] {
  const configured = (process.env.PAYMENT_SERVICE_URL || '').trim();
  const configuredList = (process.env.PAYMENT_SERVICE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const candidates = [
    configured,
    ...configuredList,
    'http://payment:3017',
    'http://127.0.0.1:3017',
    'http://localhost:3017'
  ].filter(Boolean);

  return [...new Set(candidates)];
}

async function postPayment(path: string, body: unknown): Promise<Response> {
  const baseUrls = resolvePaymentBaseUrls();
  let lastError: unknown;

  for (const baseUrl of baseUrls) {
    try {
      const headers = new Headers({ 'content-type': 'application/json' });
      if (process.env.INTERNAL_AUTH_SECRET) {
        headers.set('x-internal-auth', process.env.INTERNAL_AUTH_SECRET);
      }

      return await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? new Error(`All payment upstreams failed: ${lastError.message}`)
    : new Error('All payment upstreams failed');
}

async function resolveSignupUser(event: Parameters<RequestHandler>[0], email: string) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (process.env.INTERNAL_AUTH_SECRET) {
    headers.set('x-internal-auth', process.env.INTERNAL_AUTH_SECRET);
  }

  const response = await nestFetch(
    event,
    '/auth/internal/resolve-email',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
    },
    false,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to resolve signup user: ${text}`);
  }

  const payload = (await response.json()) as {
    user?: { id: number; email: string; clientId: string; signupComplete: boolean };
  };
  const user = payload?.user;
  if (!user?.id || !user?.clientId) {
    throw new Error('Resolved signup user payload was invalid');
  }
  return user;
}

async function markSignupComplete(event: Parameters<RequestHandler>[0], userId: number) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (process.env.INTERNAL_AUTH_SECRET) {
    headers.set('x-internal-auth', process.env.INTERNAL_AUTH_SECRET);
  }

  const response = await nestFetch(
    event,
    '/auth/internal/mark-signup-complete',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId }),
    },
    false,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to mark signup complete: ${text}`);
  }
}

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const plan = resolvePlan(body?.plan);
    const promoCode = typeof body?.promoCode === 'string' ? body.promoCode : '';

    if (!isValidEmail(email) || !plan) {
      return json({ error: 'Invalid signup payment request' }, { status: 400 });
    }

    const user = await resolveSignupUser(event, email);
    const baseCents = plan === 'monthly' ? 499 : 4900;
    const quote = promoCode
      ? await quoteDiscount({
          code: promoCode,
          audience: 'learner',
          appliesTo: plan,
          baseCents,
          currency: 'eur',
        })
      : {
          valid: false,
          reason: null,
          promoCode: null,
          discountCents: 0,
          totalCents: baseCents,
          currency: 'eur',
        };
    const amountCents = quote.totalCents;

    if (amountCents === 0) {
      await markSignupComplete(event, user.id);
      return json({
        ok: true,
        payment: {
          id: `free_${Date.now()}`,
          status: 'succeeded',
          amountCents: 0,
          currency: 'eur',
          provider: 'stripe',
          livemode: false
        }
      });
    }

    const successUrl =
      process.env.SIGNUP_PAYMENT_SUCCESS_URL?.trim() || `${event.url.origin}/dashboard`;
    const cancelUrl =
      process.env.SIGNUP_PAYMENT_CANCEL_URL?.trim() ||
      `${event.url.origin}/auth/signup?payment=cancelled`;

    const checkoutRes = await postPayment('/payments/checkout-sessions', {
      clientId: user.clientId,
      amountCents,
      currency: 'eur',
      description: `Misneach ${plan} signup`,
      successUrl,
      cancelUrl,
      metadata: {
        email,
        plan,
        promoCode: quote.promoCode || 'none'
      }
    });

    if (!checkoutRes.ok) {
      const text = await checkoutRes.text();
      return json({ error: `Payment checkout failed: ${text}` }, { status: 502 });
    }

    const checkout = (await checkoutRes.json()) as IntentResponse;

    if (checkout.status === 'succeeded') {
      await markSignupComplete(event, user.id);
      return json({ ok: true, payment: checkout });
    }

    if (checkout.url) {
      await markSignupComplete(event, user.id);
      return json({
        ok: true,
        payment: checkout,
        redirectUrl: checkout.url
      });
    }

    return json({ error: 'Payment requires checkout redirect.' }, { status: 402 });
  } catch (error) {
    console.error('Signup payment route failed', error);
    return json({ error: 'Unable to process payment' }, { status: 500 });
  }
};
