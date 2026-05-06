import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { WaitlistGatewayService } from './waitlist.service';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistGatewayService],
})
export class WaitlistModule {}

