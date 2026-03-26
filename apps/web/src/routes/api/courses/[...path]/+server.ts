import type { RequestHandler } from './$types';
import { forwardCoursesRequest } from '../_proxy';

function suffix(path: string) {
  return path ? `/${path}` : '';
}

export const GET: RequestHandler = (event) =>
  forwardCoursesRequest(event, suffix(event.params.path || ''), 'GET');
export const POST: RequestHandler = (event) =>
  forwardCoursesRequest(event, suffix(event.params.path || ''), 'POST');
