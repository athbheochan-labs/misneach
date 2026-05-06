import { json, type RequestEvent } from '@sveltejs/kit';
import { resolveApiBaseUrls } from '$lib/server/upstreams';

async function readBody(request: Request, method: string) {
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }
  return request.arrayBuffer();
}

export async function forwardCoursesRequest(event: RequestEvent, pathSuffix: string, method: string) {
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

  const requestBody = await readBody(event.request, method);
  let lastError: unknown;

  for (const baseUrl of resolveApiBaseUrls()) {
    const upstream = `${baseUrl}/courses${pathSuffix}${event.url.search}`;
    try {
      const response = await event.fetch(upstream, {
        method,
        headers,
        body: requestBody,
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return json(await response.json(), { status: response.status });
      }

      return new Response(await response.text(), {
        status: response.status,
        headers: {
          'content-type': contentType || 'text/plain',
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Courses proxy failed';
  return json({ error: message }, { status: 502 });
}
