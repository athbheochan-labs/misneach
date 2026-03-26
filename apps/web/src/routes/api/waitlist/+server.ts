import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function baseUrls() {
  const configured = (process.env.CLIENT_API_URL || '').trim();
  const configuredNest = (process.env.NEST_INTERNAL_URL || '').trim();
  const candidates = [
    configured,
    configuredNest,
    'http://client:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ]
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, ''));

  return [...new Set(candidates)];
}

export const POST: RequestHandler = async ({ request, fetch, url }) => {
  const body = await request.json().catch(() => null);

  const email = String(body?.email || '').trim();
  const name = String(body?.name || '').trim();
  const interest = String(body?.interest || '').trim();

  if (!email) {
    return json({ error: 'Email is required' }, { status: 400 });
  }

  if (!['business_pack', 'individual_course_access'].includes(interest)) {
    return json({ error: 'Invalid waitlist interest' }, { status: 400 });
  }

  const source = String(body?.source || url.pathname).trim();
  const payload = {
    email,
    name: name || undefined,
    interest,
    source,
  };

  let lastError: unknown;
  for (const baseUrl of baseUrls()) {
    try {
      const response = await fetch(`${baseUrl}/waitlist/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return json(
          { error: responsePayload?.error || 'Failed to join waitlist' },
          { status: response.status },
        );
      }

      return json(responsePayload, { status: 200 });
    } catch (error) {
      lastError = error;
    }
  }

  return json(
    {
      error:
        lastError instanceof Error
          ? `Failed to join waitlist: ${lastError.message}`
          : 'Failed to join waitlist',
    },
    { status: 502 },
  );
};
