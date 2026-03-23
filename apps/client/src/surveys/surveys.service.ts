import { Injectable } from '@nestjs/common';

@Injectable()
export class SurveysGatewayService {
  private readonly businessUrl = process.env.BUSINESS_SERVICE_URL || 'http://business:3018';

  private async parseResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
      throw new Error(`Survey service error (${res.status}): ${body}`);
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

  async adminGet(path: string) {
    const res = await fetch(`${this.businessUrl}${path}`, {
      method: 'GET',
      headers: this.internalHeaders(),
    });
    return this.parseResponse(res);
  }

  async adminPost(path: string, body?: unknown) {
    const res = await fetch(`${this.businessUrl}${path}`, {
      method: 'POST',
      headers: this.internalHeaders({ 'Content-Type': 'application/json' }),
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  async adminPut(path: string, body?: unknown) {
    const res = await fetch(`${this.businessUrl}${path}`, {
      method: 'PUT',
      headers: this.internalHeaders({ 'Content-Type': 'application/json' }),
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  async adminDelete(path: string) {
    const res = await fetch(`${this.businessUrl}${path}`, {
      method: 'DELETE',
      headers: this.internalHeaders(),
    });
    return this.parseResponse(res);
  }
}
