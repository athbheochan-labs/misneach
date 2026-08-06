import type { RequestHandler } from './$types';
import { forwardClientApiRequest } from '../../_client-proxy';

function suffix(path: string) {
  return path ? `/${path}` : '';
}

export const GET: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/challenges', suffix(event.params.path || ''), 'GET');
export const PATCH: RequestHandler = (event) =>
  forwardClientApiRequest(event, '/challenges', suffix(event.params.path || ''), 'PATCH');
