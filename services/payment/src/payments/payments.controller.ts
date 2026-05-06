import { Body, Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  ConfirmPaymentIntentDto,
  CreateCheckoutSessionDto,
  CreatePaymentIntentDto,
} from './payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private verifyInternalAccess(req: Request) {
    const expectedInternalSecret = process.env.INTERNAL_AUTH_SECRET;
    if (!expectedInternalSecret) return;

    const providedInternalSecret = req.headers['x-internal-auth'];
    if (providedInternalSecret !== expectedInternalSecret) {
      throw new ForbiddenException('Forbidden');
    }
  }

  @Post('intents')
  async createIntent(@Req() req: Request, @Body() body: CreatePaymentIntentDto) {
    this.verifyInternalAccess(req);
    return this.paymentsService.createIntent(body);
  }

  @Post('intents/confirm')
  async confirmIntent(@Req() req: Request, @Body() body: ConfirmPaymentIntentDto) {
    this.verifyInternalAccess(req);
    return this.paymentsService.confirmIntent(body.paymentIntentId);
  }

  @Post('checkout-sessions')
  async createCheckoutSession(@Req() req: Request, @Body() body: CreateCheckoutSessionDto) {
    this.verifyInternalAccess(req);
    return this.paymentsService.createCheckoutSession(body);
  }
}
