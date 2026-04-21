import type { RequestHandler } from './$types';
import { nestFetch } from '$lib/server/api';

export const GET: RequestHandler = async (event) => {
  const accessToken = event.url.searchParams.get('accessToken')?.trim() || '';
  if (!event.locals.auth && !accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  let upstream: Response;
  try {
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    upstream = await nestFetch(
      event,
      '/phrasebook/stream',
      {
        method: 'GET',
        headers,
      },
      true,
    );
  } catch (error) {
    console.error('Phrasebook stream upstream fetch failed', error);
    return new Response('Failed to open stream', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Failed to open stream', { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
};
