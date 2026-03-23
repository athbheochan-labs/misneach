import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

  const waitlistUrl = process.env.WAITLIST_API_URL || 'http://waitlist:3021';
  const source = String(body?.source || url.pathname).trim();

  const response = await fetch(`${waitlistUrl}/waitlist/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      name: name || undefined,
      interest,
      source,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return json({ error: payload?.error || 'Failed to join waitlist' }, { status: response.status });
  }

  return json(payload, { status: 200 });
};
