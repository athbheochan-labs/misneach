import { Injectable } from '@nestjs/common';

type AdminForwardContext = {
  userId: number;
  clientId: string;
  role: 'admin' | 'learner';
};

@Injectable()
export class CoursesGatewayService {
  private readonly coursesUrl = process.env.COURSES_SERVICE_URL || 'http://courses:3015';

  private async parseResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
      throw new Error(`Courses service error (${res.status}): ${body}`);
    }

    if (res.status === 204) return null;
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  }

  private async fetchWithRetry(url: string, init?: RequestInit, retries = 2) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  private buildUrl(path: string, clientId?: string, query?: Record<string, string | undefined>) {
    const url = new URL(`${this.coursesUrl}${path}`);
    if (clientId) {
      url.searchParams.set('clientId', clientId);
    }

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value != null && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }

    return url.toString();
  }

  async get(path: string, clientId: string, query?: Record<string, string | undefined>) {
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, clientId, query));
    } catch (error) {
      throw new Error(
        `Courses service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }

  async post(path: string, clientId: string, body?: unknown, query?: Record<string, string | undefined>) {
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, clientId, query), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(
        `Courses service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }

  private adminHeaders(context: AdminForwardContext, baseHeaders?: HeadersInit): Headers {
    const headers = new Headers(baseHeaders || {});
    headers.set('x-admin-user-id', String(context.userId));
    headers.set('x-admin-client-id', context.clientId);
    headers.set('x-admin-user-role', context.role);
    if (process.env.INTERNAL_AUTH_SECRET) {
      headers.set('x-internal-auth', process.env.INTERNAL_AUTH_SECRET);
    }
    return headers;
  }

  async adminGet(
    path: string,
    context: AdminForwardContext,
    query?: Record<string, string | undefined>,
  ) {
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, undefined, query), {
        headers: this.adminHeaders(context),
      });
    } catch (error) {
      throw new Error(
        `Courses service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }

  async adminPost(
    path: string,
    context: AdminForwardContext,
    body?: unknown,
    query?: Record<string, string | undefined>,
  ) {
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, undefined, query), {
        method: 'POST',
        headers: this.adminHeaders(context, {
          'Content-Type': 'application/json',
        }),
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(
        `Courses service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }

  async adminPut(
    path: string,
    context: AdminForwardContext,
    body?: unknown,
    query?: Record<string, string | undefined>,
  ) {
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, undefined, query), {
        method: 'PUT',
        headers: this.adminHeaders(context, {
          'Content-Type': 'application/json',
        }),
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(
        `Courses service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }
}
