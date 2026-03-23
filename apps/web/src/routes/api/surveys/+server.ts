import type { RequestHandler } from './$types';
import { forwardSurveyRequest } from './_proxy';

export const GET: RequestHandler = (event) => forwardSurveyRequest(event, '', 'GET');
export const POST: RequestHandler = (event) => forwardSurveyRequest(event, '', 'POST');
