import type { RequestHandler } from './$types';
import { forwardBusinessRequest } from '$lib/server/business';

async function forward(event: Parameters<RequestHandler>[0], method: string) {
  const path = event.params.path || '';
  return forwardBusinessRequest(event.request, path, event.url.search, method);
}

export const GET: RequestHandler = (event) => forward(event, 'GET');
export const POST: RequestHandler = (event) => forward(event, 'POST');
export const PUT: RequestHandler = (event) => forward(event, 'PUT');
export const PATCH: RequestHandler = (event) => forward(event, 'PATCH');
export const DELETE: RequestHandler = (event) => forward(event, 'DELETE');
