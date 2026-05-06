const allowedHosts = new Set([
  'misneach.ie',
  'www.misneach.ie',
  'cleachtadh.misneach.site',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
]);

export function toInAppPath(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const isCustomScheme = url.protocol === 'ie.misneach.cleachtadh:';
    const isAllowedHttpHost =
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      allowedHosts.has(url.hostname);

    if (!isCustomScheme && !isAllowedHttpHost) return null;

    let pathname = url.pathname || '/';

    // Android may deliver custom-scheme links as:
    // - ie.misneach.cleachtadh:/auth/verify-request?...
    // - ie.misneach.cleachtadh://auth/verify-request?...
    // In the second form, "auth" is parsed as hostname and must be reattached.
    if (isCustomScheme && url.hostname) {
      const hostPart = url.hostname.startsWith('/') ? url.hostname : `/${url.hostname}`;
      pathname = `${hostPart}${pathname}`.replace(/\/{2,}/g, '/');
    }

    const path = `${pathname}${url.search}${url.hash}` || '/';
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return null;
  }
}
