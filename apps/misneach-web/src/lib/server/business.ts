import { resolveBusinessBaseUrls } from '$lib/server/upstreams';

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
