import { Module } from '@nestjs/common';
import { MobileTelemetryController } from './mobile.controller';

@Module({
  controllers: [MobileTelemetryController],
})
export class MobileModule {}
