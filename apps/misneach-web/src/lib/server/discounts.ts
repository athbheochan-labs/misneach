import * as privateEnv from '$env/static/private';

type DiscountQuoteInput = {
  code: string;
  audience: 'learner' | 'business';
  appliesTo: 'monthly' | 'annual' | 'business-kit' | 'any';
  baseCents: number;
  currency?: string;
};

type DiscountQuoteResponse = {
  valid: boolean;
  reason: string | null;
  promoCode: string | null;
  discountCents: number;
  totalCents: number;
  currency: string;
  discountType?: 'percent' | 'fixed_cents';
  discountValue?: number;
};

function resolveClientBaseUrls(): string[] {
  const configured = (privateEnv.DISCOUNT_SERVICE_URL || '').trim();
  const configuredList = (privateEnv.DISCOUNT_SERVICE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const candidates = [
    configured,
    ...configuredList,
    'http://discounts:3020',
    'http://127.0.0.1:3020',
    'http://localhost:3020'
  ].filter(Boolean);

  return [...new Set(candidates)];
}

export async function quoteDiscount(input: DiscountQuoteInput): Promise<DiscountQuoteResponse> {
  const baseUrls = resolveClientBaseUrls();
  let lastError: unknown;

  for (const baseUrl of baseUrls) {
    try {
      const headers = new Headers({ 'content-type': 'application/json' });
      if (privateEnv.INTERNAL_AUTH_SECRET) {
        headers.set('x-internal-auth', privateEnv.INTERNAL_AUTH_SECRET);
      }

      const res = await fetch(`${baseUrl}/discounts/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discount quote failed (${res.status}): ${text}`);
      }

      return (await res.json()) as DiscountQuoteResponse;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? new Error(`All discount upstreams failed: ${lastError.message}`)
    : new Error('All discount upstreams failed');
}
