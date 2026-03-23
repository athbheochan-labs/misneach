import { j as json } from './index-CoD1IJuy.js';

function resolveNestBaseUrls() {
  const configured = (process.env.NEST_INTERNAL_URL || "").trim();
  const configuredList = (process.env.NEST_INTERNAL_URLS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const candidates = [
    configured,
    ...configuredList,
    "http://client:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8000"
  ].filter(Boolean);
  return [...new Set(candidates)];
}
async function nestFetch(event, path, init = {}, requireAuth = true) {
  const baseUrls = resolveNestBaseUrls();
  const headers = new Headers(init.headers || {});
  if (requireAuth) {
    if (!event.locals.auth) {
      throw new Error("Unauthenticated");
    }
    headers.set("x-user-id", String(event.locals.auth.userId));
    headers.set("x-client-id", event.locals.auth.clientId);
    headers.set("x-session-id", event.locals.auth.sessionId);
    if (event.locals.auth.email) {
      headers.set("x-user-email", event.locals.auth.email);
    }
    if (event.locals.auth.role) {
      headers.set("x-user-role", event.locals.auth.role);
    }
    if (process.env.INTERNAL_AUTH_SECRET) {
      headers.set("x-internal-auth", process.env.INTERNAL_AUTH_SECRET);
    }
  }
  let lastError;
  for (const baseUrl of baseUrls) {
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? new Error(`All upstreams failed for path ${path}: ${lastError.message}`) : new Error(`All upstreams failed for path ${path}`);
}
async function forward(event, method) {
  let attemptedPath = `/admin/${event.params.path || ""}${event.url.search}`;
  try {
    const headers = new Headers(event.request.headers);
    const hopByHopHeaders = [
      "host",
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade"
    ];
    for (const header of hopByHopHeaders) {
      headers.delete(header);
    }
    const init = {
      method,
      headers
    };
    if (method !== "GET" && method !== "HEAD") {
      init.body = await event.request.arrayBuffer();
    }
    const response = await nestFetch(event, attemptedPath, init, true);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return json(await response.json(), { status: response.status });
    }
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": contentType || "text/plain"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy error";
    console.error("Admin API proxy failed", {
      method,
      path: attemptedPath,
      message
    });
    const status = message === "Unauthenticated" ? 401 : 502;
    return json({ error: message }, { status });
  }
}
const GET = (event) => forward(event, "GET");
const POST = (event) => forward(event, "POST");
const PUT = (event) => forward(event, "PUT");
const PATCH = (event) => forward(event, "PATCH");
const DELETE = (event) => forward(event, "DELETE");

export { DELETE, GET, PATCH, POST, PUT };
//# sourceMappingURL=_server.ts-BmBI78_p.js.map
