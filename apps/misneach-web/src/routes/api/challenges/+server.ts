import type { RequestHandler } from './$types';
import { forwardClientApiRequest } from '../_client-proxy';

export const GET: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/challenges', '', 'GET');
