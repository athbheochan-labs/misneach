import { Module } from '@nestjs/common';
import { DiscountsController } from './discounts.controller';
import { DiscountsGatewayService } from './discounts.service';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsGatewayService],
  exports: [DiscountsGatewayService],
})
export class DiscountsModule {}
