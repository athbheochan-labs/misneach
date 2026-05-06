import { Body, Controller, Post } from '@nestjs/common';
import { QuoteDiscountDto } from './discounts.dto';
import { DiscountsGatewayService } from './discounts.service';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsGatewayService) {}

  @Post('quote')
  async quote(@Body() body: QuoteDiscountDto) {
    return this.discountsService.post('/discounts/quote', body);
  }
}
