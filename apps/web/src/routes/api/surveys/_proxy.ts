import { json, type RequestEvent } from '@sveltejs/kit';

function baseUrl() {
  return (process.env.BUSINESS_API_URL || 'http://business:3018').replace(/\/$/, '');
}

async function readBody(request: Request, method: string) {
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }
  return request.arrayBuffer();
}

export async function forwardSurveyRequest(event: RequestEvent, pathSuffix: string, method: string) {
  const upstream = `${baseUrl()}/surveys${pathSuffix}${event.url.search}`;
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

  try {
    const response = await event.fetch(upstream, {
      method,
      headers,
      body: await readBody(event.request, method),
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
    const message = error instanceof Error ? error.message : 'Survey proxy failed';
    return json({ error: message }, { status: 502 });
  }
}
