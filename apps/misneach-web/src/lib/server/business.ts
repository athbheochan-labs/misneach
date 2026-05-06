import * as privateEnv from '$env/static/private';

function resolveBusinessBaseUrls(): string[] {
  const configured = (privateEnv.BUSINESS_SERVICE_URL || '').trim();
  const configuredList = (privateEnv.BUSINESS_SERVICE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const candidates = [
    configured,
    ...configuredList,
    'http://business:3018',
    'http://127.0.0.1:3018',
    'http://localhost:3018',
  ].filter(Boolean);

  return [...new Set(candidates.map((url) => url.replace(/\/+$/, '')))];
}

export async function forwardBusinessRequest(request: Request, path: string, search: string, method: string) {
  const headers = new Headers(request.headers);
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
  for (const header of hopByHopHeaders) headers.delete(header);

  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  let lastError: unknown;

  for (const baseUrl of resolveBusinessBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}/business/${path}${search}`, {
        method,
        headers,
        body,
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return new Response(JSON.stringify(await response.json()), {
          status: response.status,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(await response.text(), {
        status: response.status,
        headers: { 'content-type': contentType || 'text/plain' },
      });
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Business proxy failed';
  return new Response(JSON.stringify({ error: message }), {
    status: 502,
    headers: { 'content-type': 'application/json' },
  });
}
