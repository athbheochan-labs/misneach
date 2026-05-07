import { Body, Controller, Post } from '@nestjs/common';
import { QuoteDiscountDto, RedeemDiscountDto } from './discounts.dto';
import { DiscountsGatewayService } from './discounts.service';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsGatewayService) {}

  @Post('quote')
  async quote(@Body() body: QuoteDiscountDto) {
    return this.discountsService.post('/discounts/quote', body);
  }

  @Post('redeem')
  async redeem(@Body() body: RedeemDiscountDto) {
    return this.discountsService.post('/discounts/redeem', body);
  }
}
