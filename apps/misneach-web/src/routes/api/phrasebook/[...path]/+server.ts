import type { RequestHandler } from './$types';
import { forwardClientApiRequest } from '../../_client-proxy';

function suffix(path: string) {
  return path ? `/${path}` : '';
}

export const GET: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/phrasebook', suffix(event.params.path || ''), 'GET');

export const POST: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/phrasebook', suffix(event.params.path || ''), 'POST');

export const PUT: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/phrasebook', suffix(event.params.path || ''), 'PUT');

export const DELETE: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/phrasebook', suffix(event.params.path || ''), 'DELETE');
