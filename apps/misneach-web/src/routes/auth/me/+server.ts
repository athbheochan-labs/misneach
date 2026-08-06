import type { RequestHandler } from './$types';
import { forwardAuthRequest } from '$lib/server/auth';

export const GET: RequestHandler = (event) => forwardAuthRequest(event, '/me', 'GET');
