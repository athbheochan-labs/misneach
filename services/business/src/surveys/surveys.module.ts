import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyCampaignEntity } from './survey-campaign.entity';
import { SurveyResponseEntity } from './survey-response.entity';
import { SurveysController } from './surveys.controller';
import { SurveyTemplateEntity } from './survey-template.entity';
import { SurveysService } from './surveys.service';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyTemplateEntity, SurveyCampaignEntity, SurveyResponseEntity])],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
