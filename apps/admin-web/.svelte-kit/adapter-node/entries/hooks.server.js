import { jwtVerify } from "jose";
const SESSION_COOKIE = "web_session";
const encoder = new TextEncoder();
function getSecret() {
  const raw = process.env.WEB_SESSION_SECRET;
  if (!raw) throw new Error("WEB_SESSION_SECRET is required");
  return encoder.encode(raw);
}
async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: Number(payload.userId),
      clientId: String(payload.clientId),
      sessionId: String(payload.sessionId),
      email: payload.email ? String(payload.email) : void 0,
      role: payload.role === "admin" || payload.role === "learner" ? payload.role : "learner"
    };
  } catch {
    return null;
  }
}
function sessionCookieName() {
  return SESSION_COOKIE;
}
const handle = async ({ event, resolve }) => {
  if (process.env.ADMIN_UI_ENABLED === "false") {
    return new Response("Admin UI disabled", { status: 404 });
  }
  const token = event.cookies.get(sessionCookieName());
  event.locals.auth = token ? await verifySession(token) : null;
  if (!event.locals.auth) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${process.env.LEARNER_WEB_BASE_URL || "http://localhost:5173"}/auth/login`
      }
    });
  }
  if (event.locals.auth.role !== "admin") {
    return new Response("Admin access required", { status: 403 });
  }
  return resolve(event);
};
export {
  handle
};
