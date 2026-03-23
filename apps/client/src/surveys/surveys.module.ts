import { Module } from '@nestjs/common';
import { SurveysGatewayService } from './surveys.service';

@Module({
  providers: [SurveysGatewayService],
  exports: [SurveysGatewayService],
})
export class SurveysModule {}
