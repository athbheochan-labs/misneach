import { getInternalAuthSecret, resolveApiBaseUrls } from '$lib/server/upstreams';

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

export async function quoteDiscount(input: DiscountQuoteInput): Promise<DiscountQuoteResponse> {
  const baseUrls = resolveApiBaseUrls();
  let lastError: unknown;

  for (const baseUrl of baseUrls) {
    try {
      const headers = new Headers({ 'content-type': 'application/json' });
      const internalAuthSecret = getInternalAuthSecret();
      if (internalAuthSecret) {
        headers.set('x-internal-auth', internalAuthSecret);
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
