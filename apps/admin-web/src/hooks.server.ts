import type { Handle } from '@sveltejs/kit';
import { sessionCookieName, verifySession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  if (process.env.ADMIN_UI_ENABLED === 'false') {
    return new Response('Admin UI disabled', { status: 404 });
  }

  const token = event.cookies.get(sessionCookieName());
  event.locals.auth = token ? await verifySession(token) : null;

  if (!event.locals.auth) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${process.env.LEARNER_WEB_BASE_URL || 'http://localhost:5173'}/auth/login`,
      },
    });
  }

  if (event.locals.auth.role !== 'admin') {
    return new Response('Admin access required', { status: 403 });
  }

  return resolve(event);
};
