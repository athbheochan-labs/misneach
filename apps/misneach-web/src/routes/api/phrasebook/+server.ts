import type { RequestHandler } from './$types';
import { forwardClientApiRequest } from '../_client-proxy';

export const GET: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/phrasebook', '', 'GET');

export const POST: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/phrasebook', '', 'POST');
