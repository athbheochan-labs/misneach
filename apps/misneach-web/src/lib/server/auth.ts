import { json, type RequestEvent } from '@sveltejs/kit';
import { resolveApiBaseUrls } from '$lib/server/upstreams';

async function readBody(request: Request, method: string) {
  if (method === 'GET' || method === 'HEAD') return undefined;
  return request.arrayBuffer();
}

function cleanHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  for (const header of [
    'host',
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
  ]) {
    headers.delete(header);
  }
  return headers;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Auth proxy failed';
  }
}

export async function forwardAuthRequest(event: RequestEvent, path: string, method: string) {
  const body = await readBody(event.request, method);
  const headers = cleanHeaders(event.request);
  let lastError: unknown;

  for (const baseUrl of resolveApiBaseUrls()) {
    try {
      const response = await event.fetch(`${baseUrl}/auth${path}${event.url.search}`, {
        method,
        headers,
        body,
      });
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        return json(await response.json(), { status: response.status });
      }

      return new Response(await response.text(), {
        status: response.status,
        headers: { 'content-type': contentType || 'text/plain' },
      });
    } catch (error) {
      lastError = error;
    }
  }

  return json({ error: `Auth service unavailable: ${stringifyError(lastError)}` }, { status: 502 });
}
