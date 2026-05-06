import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ActivateBusinessAccountDto,
  BusinessDetailsDto,
  CreateBusinessPaymentIntentDto,
  PromoValidationDto,
  StaffInviteDto,
} from './business.dto';
import { BusinessService } from './business.service';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  private requireClientId(clientId: string) {
    if (!clientId) {
      throw new BadRequestException('Missing clientId');
    }
    return clientId;
  }

  @Get('onboarding')
  getOnboarding(@Query('clientId') clientId: string) {
    return this.businessService.getOnboarding(this.requireClientId(clientId));
  }

  @Post('onboarding/details')
  saveDetails(@Query('clientId') clientId: string, @Body() body: BusinessDetailsDto) {
    return this.businessService.saveDetails(this.requireClientId(clientId), body);
  }

  @Post('onboarding/staff')
  saveStaff(@Query('clientId') clientId: string, @Body() body: StaffInviteDto) {
    return this.businessService.saveStaff(this.requireClientId(clientId), body.staffEmails);
  }

  @Post('onboarding/promo/validate')
  validatePromo(@Query('clientId') clientId: string, @Body() body: PromoValidationDto) {
    return this.businessService.validatePromo(this.requireClientId(clientId), body.promoCode);
  }

  @Post('onboarding/payment-intent')
  createPaymentIntent(
    @Query('clientId') clientId: string,
    @Body() body: CreateBusinessPaymentIntentDto,
  ) {
    return this.businessService.createPaymentIntent(this.requireClientId(clientId), body.promoCode);
  }

  @Post('onboarding/activate')
  activateAccount(@Query('clientId') clientId: string, @Body() body: ActivateBusinessAccountDto) {
    return this.businessService.activateAccount(this.requireClientId(clientId), body);
  }

  @Get('onboarding/kit-assets')
  listKitAssets(@Query('clientId') clientId: string) {
    return this.businessService.listKitAssets(this.requireClientId(clientId));
  }
}
