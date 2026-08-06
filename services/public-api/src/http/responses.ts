export type JsonResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const jsonHeaders = {
  'content-type': 'application/json',
};

export function jsonResponse(statusCode: number, payload: unknown): JsonResponse {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  };
}

export function parseJsonBody(body: string | null | undefined, isBase64Encoded = false) {
  if (!body) return null;
  const raw = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
  return JSON.parse(raw);
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
