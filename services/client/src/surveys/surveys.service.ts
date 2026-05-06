import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class SurveysGatewayService {
  private readonly businessUrl = process.env.BUSINESS_SERVICE_URL || 'http://business:3018';

  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.businessUrl}${path}`, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        { error: `Survey service unreachable: ${message}` },
        502,
      );
    }
  }

  private async parseResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? await res.json()
        : { error: await res.text() };
      const errorMessage =
        body?.error ||
        body?.message ||
        `Survey service error (${res.status})`;
      throw new HttpException(
        { error: String(errorMessage) },
        res.status,
      );
    }

    if (res.status === 204) return null;
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  }

  private internalHeaders(baseHeaders?: HeadersInit): Headers {
    const headers = new Headers(baseHeaders || {});
    if (process.env.INTERNAL_AUTH_SECRET) {
      headers.set('x-internal-auth', process.env.INTERNAL_AUTH_SECRET);
    }
    return headers;
  }

  private buildPath(
    path: string,
    query?: Record<string, string | undefined>,
  ) {
    if (!query) return path;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') {
        params.set(key, value);
      }
    }

    const qs = params.toString();
    if (!qs) return path;
    return `${path}${path.includes('?') ? '&' : '?'}${qs}`;
  }

  async get(path: string, query?: Record<string, string | undefined>) {
    const res = await this.request(this.buildPath(path, query), {
      method: 'GET',
    });
    return this.parseResponse(res);
  }

  async post(path: string, body?: unknown, query?: Record<string, string | undefined>) {
    const res = await this.request(this.buildPath(path, query), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  async adminGet(path: string) {
    const res = await this.request(path, {
      method: 'GET',
      headers: this.internalHeaders(),
    });
    return this.parseResponse(res);
  }

  async adminPost(path: string, body?: unknown) {
    const res = await this.request(path, {
      method: 'POST',
      headers: this.internalHeaders({ 'Content-Type': 'application/json' }),
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  async adminPut(path: string, body?: unknown) {
    const res = await this.request(path, {
      method: 'PUT',
      headers: this.internalHeaders({ 'Content-Type': 'application/json' }),
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  async adminDelete(path: string) {
    const res = await this.request(path, {
      method: 'DELETE',
      headers: this.internalHeaders(),
    });
    return this.parseResponse(res);
  }
}
