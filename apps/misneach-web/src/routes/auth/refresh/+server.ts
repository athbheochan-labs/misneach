import type { RequestHandler } from './$types';
import { forwardAuthRequest } from '$lib/server/auth';

export const POST: RequestHandler = (event) => forwardAuthRequest(event, '/refresh', 'POST');
