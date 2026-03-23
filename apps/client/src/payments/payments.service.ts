import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsGatewayService {
  private readonly paymentUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment:3017';

  private async parseResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
      throw new Error(`Payment service error (${res.status}): ${body}`);
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

  async post(path: string, body?: unknown) {
    let res: Response;
    try {
      res = await fetch(`${this.paymentUrl}${path}`, {
        method: 'POST',
        headers: this.internalHeaders({
          'Content-Type': 'application/json',
        }),
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(
        `Payment service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return this.parseResponse(res);
  }
}
