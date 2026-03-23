import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { AuthService } from 'src/auth/auth.service';
import { BusinessGatewayService } from './business.service';

@Controller('business')
export class BusinessController {
  constructor(
    private readonly authService: AuthService,
    private readonly businessService: BusinessGatewayService,
  ) {}

  @Get('onboarding')
  async getOnboarding(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.get('/business/onboarding', clientId);
  }

  @Post('onboarding/details')
  async saveDetails(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.post('/business/onboarding/details', clientId, body);
  }

  @Post('onboarding/staff')
  async saveStaff(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.post('/business/onboarding/staff', clientId, body);
  }

  @Post('onboarding/promo/validate')
  async validatePromo(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.post('/business/onboarding/promo/validate', clientId, body);
  }

  @Post('onboarding/payment-intent')
  async createPaymentIntent(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.post('/business/onboarding/payment-intent', clientId, body);
  }

  @Post('onboarding/activate')
  async activateAccount(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.post('/business/onboarding/activate', clientId, body);
  }

  @Get('onboarding/kit-assets')
  async listKitAssets(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.businessService.get('/business/onboarding/kit-assets', clientId);
  }
}
