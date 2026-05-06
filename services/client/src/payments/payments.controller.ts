import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { AuthService } from 'src/auth/auth.service';
import { PaymentsGatewayService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly authService: AuthService,
    private readonly paymentsService: PaymentsGatewayService,
  ) {}

  @Post('intents')
  async createIntent(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.paymentsService.post('/payments/intents', {
      ...body,
      clientId,
    });
  }

  @Post('intents/:paymentIntentId/confirm')
  async confirmIntent(
    @Req() req: AuthenticatedRequest,
    @Param('paymentIntentId') paymentIntentId: string,
  ) {
    await this.authService.getClientIdFromSession(req);
    return this.paymentsService.post('/payments/intents/confirm', {
      paymentIntentId,
    });
  }
}
