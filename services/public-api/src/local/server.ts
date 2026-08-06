import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler as surveysHandler } from '../surveys/handler';
import { handler as waitlistHandler } from '../waitlist/handler';

type LambdaHandler = (event: APIGatewayProxyEventV2) => Promise<{
  statusCode?: number;
  headers?: Record<string, string | number | boolean>;
  body?: string;
}>;

export function createLocalPublicApiServer() {
  return createServer(async (request, response) => {
    try {
      const path = new URL(request.url || '/', 'http://localhost').pathname;
      const handler = routeHandler(path);
      if (!handler) {
        writeResponse(response, 404, { 'content-type': 'application/json' }, JSON.stringify({ error: 'Not found' }));
        return;
      }

      const event = await toApiGatewayEvent(request);
      const result = await handler(event);
      writeResponse(response, result.statusCode || 200, stringifyHeaders(result.headers), result.body || '');
    } catch (error) {
      console.error('Local public API failed', error);
      writeResponse(response, 500, { 'content-type': 'application/json' }, JSON.stringify({ error: 'Local public API failed' }));
    }
  });
}

export function listenLocalPublicApiServer(port = 0): Promise<{ server: Server; url: string }> {
  const server = createLocalPublicApiServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Local public API server did not bind to a TCP port'));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

function routeHandler(path: string): LambdaHandler | null {
  if (path === '/waitlist/join') return waitlistHandler;
  if (path.startsWith('/surveys/')) return surveysHandler;
  return null;
}

async function toApiGatewayEvent(request: IncomingMessage): Promise<APIGatewayProxyEventV2> {
  const url = new URL(request.url || '/', 'http://localhost');
  const body = await readBody(request);
  return {
    version: '2.0',
    routeKey: `${request.method || 'GET'} ${url.pathname}`,
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers: headersToRecord(request.headers),
    queryStringParameters: queryToRecord(url.searchParams),
    requestContext: {
      accountId: 'local',
      apiId: 'local-public-api',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: request.method || 'GET',
        path: url.pathname,
        protocol: `HTTP/${request.httpVersion}`,
        sourceIp: request.socket.remoteAddress || '127.0.0.1',
        userAgent: String(request.headers['user-agent'] || ''),
      },
      requestId: randomUUID(),
      routeKey: `${request.method || 'GET'} ${url.pathname}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body: body || undefined,
  };
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('error', reject);
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function headersToRecord(headers: IncomingMessage['headers']) {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) record[key] = value.join(',');
    else if (typeof value === 'string') record[key] = value;
  }
  return record;
}

function queryToRecord(params: URLSearchParams) {
  const record: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    record[key] = value;
  }
  return Object.keys(record).length ? record : undefined;
}

function stringifyHeaders(headers: Record<string, string | number | boolean> | undefined) {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers || {})) {
    record[key] = String(value);
  }
  return record;
}

function writeResponse(response: ServerResponse, statusCode: number, headers: Record<string, string>, body: string) {
  response.writeHead(statusCode, headers);
  response.end(body);
}
