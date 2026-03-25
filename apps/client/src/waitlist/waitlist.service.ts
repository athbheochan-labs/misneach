import { BadRequestException, Injectable } from '@nestjs/common';

type JoinWaitlistInput = {
  email?: string;
  name?: string;
  interest?: string;
  source?: string;
};

@Injectable()
export class WaitlistGatewayService {
  private readonly waitlistUrl =
    process.env.WAITLIST_SERVICE_URL || 'http://waitlist:3021';

  private readonly allowedInterests = new Set([
    'business_pack',
    'individual_course_access',
  ]);

  private sanitizeInput(body: JoinWaitlistInput) {
    const email = String(body?.email || '').trim();
    const name = String(body?.name || '').trim();
    const interest = String(body?.interest || '').trim();
    const source = String(body?.source || '').trim();

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    if (!this.allowedInterests.has(interest)) {
      throw new BadRequestException('Invalid waitlist interest');
    }

    return {
      email,
      name: name || undefined,
      interest,
      source: source || undefined,
    };
  }

  async join(body: JoinWaitlistInput) {
    const payload = this.sanitizeInput(body);

    let res: Response;
    try {
      res = await fetch(`${this.waitlistUrl}/waitlist/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(
        `Waitlist service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const responseBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        responseBody?.error
          ? `Waitlist service error (${res.status}): ${responseBody.error}`
          : `Waitlist service error (${res.status})`,
      );
    }

    return responseBody;
  }
}

