import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nestFetch } from '$lib/server/api';

async function forward(event: Parameters<RequestHandler>[0], method: string) {
  let attemptedPath = `/admin/${event.params.path || ''}${event.url.search}`;

  try {
    const headers = new Headers(event.request.headers);
    const hopByHopHeaders = [
      'host',
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ];
    for (const header of hopByHopHeaders) {
      headers.delete(header);
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await event.request.arrayBuffer();
    }

    const response = await nestFetch(event, attemptedPath, init, true);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return json(await response.json(), { status: response.status });
    }

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'content-type': contentType || 'text/plain',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy error';
    console.error('Admin API proxy failed', {
      method,
      path: attemptedPath,
      message,
    });

    const status = message === 'Unauthenticated' ? 401 : 502;
    return json({ error: message }, { status });
  }
}

export const GET: RequestHandler = (event) => forward(event, 'GET');
export const POST: RequestHandler = (event) => forward(event, 'POST');
export const PUT: RequestHandler = (event) => forward(event, 'PUT');
export const PATCH: RequestHandler = (event) => forward(event, 'PATCH');
export const DELETE: RequestHandler = (event) => forward(event, 'DELETE');
