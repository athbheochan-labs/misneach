import { Module } from '@nestjs/common';
import { SurveysController } from './surveys.controller';
import { SurveysGatewayService } from './surveys.service';

@Module({
  controllers: [SurveysController],
  providers: [SurveysGatewayService],
  exports: [SurveysGatewayService],
})
export class SurveysModule {}
