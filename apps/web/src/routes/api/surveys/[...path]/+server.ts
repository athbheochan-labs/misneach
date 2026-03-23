import type { RequestHandler } from './$types';
import { forwardSurveyRequest } from '../_proxy';

function suffix(path: string) {
  return path ? `/${path}` : '';
}

export const GET: RequestHandler = (event) =>
  forwardSurveyRequest(event, suffix(event.params.path || ''), 'GET');
export const POST: RequestHandler = (event) =>
  forwardSurveyRequest(event, suffix(event.params.path || ''), 'POST');
