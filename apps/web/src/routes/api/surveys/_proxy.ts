import { json, type RequestEvent } from '@sveltejs/kit';

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

async function readBody(request: Request, method: string) {
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }
  return request.arrayBuffer();
}

export async function forwardSurveyRequest(event: RequestEvent, pathSuffix: string, method: string) {
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

  for (const baseUrl of baseUrls()) {
    const upstream = `${baseUrl}/surveys${pathSuffix}${event.url.search}`;
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
    lastError instanceof Error ? lastError.message : 'Survey proxy failed';
  return json({ error: message }, { status: 502 });
}
