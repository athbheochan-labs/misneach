import { Body, Controller, Headers, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

type TelemetryType = 'event' | 'error';

type MobileTelemetryBody = {
  type?: unknown;
  event?: unknown;
  message?: unknown;
  stack?: unknown;
  route?: unknown;
  meta?: unknown;
  app?: unknown;
  reportedAt?: unknown;
};

function clampText(value: unknown, max = 300): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function clampJson(value: unknown, max = 1200): string | undefined {
  if (value == null) return undefined;
  try {
    const json = JSON.stringify(value);
    if (!json || json === '{}') return undefined;
    return json.length > max ? `${json.slice(0, max)}…` : json;
  } catch {
    return undefined;
  }
}

function normalizeType(value: unknown): TelemetryType {
  return value === 'error' ? 'error' : 'event';
}

@Controller('mobile')
export class MobileTelemetryController {
  private readonly logger = new Logger(MobileTelemetryController.name);

  @Post('telemetry')
  ingest(
    @Body() body: MobileTelemetryBody,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() req: Request & { authContext?: unknown },
  ) {
    const type = normalizeType(body?.type);
    const event = clampText(body?.event, 120) || 'unknown_event';
    const message = clampText(body?.message, 500);
    const stack = clampText(body?.stack, 2500);
    const route = clampText(body?.route, 300);
    const app = clampJson(body?.app, 600);
    const meta = clampJson(body?.meta, 1400);
    const reportedAt = clampText(body?.reportedAt, 80);
    const authContext = clampJson(req.authContext, 220);

    const payload = {
      source: 'mobile_app',
      type,
      event,
      route,
      message,
      app,
      meta,
      reportedAt,
      userAgent: clampText(userAgent, 180),
      auth: authContext,
    };

    const line = JSON.stringify(payload);
    if (type === 'error') {
      this.logger.error(line, stack);
    } else {
      this.logger.log(line);
    }

    return { ok: true };
  }
}
