import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessModule } from './business/business.module';
import { SurveyCampaignEntity } from './surveys/survey-campaign.entity';
import { SurveyResponseEntity } from './surveys/survey-response.entity';
import { SurveysModule } from './surveys/surveys.module';
import { SurveyTemplateEntity } from './surveys/survey-template.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST || 'mariadb',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'user',
      entities: [SurveyTemplateEntity, SurveyCampaignEntity, SurveyResponseEntity],
      synchronize: true,
    }),
    BusinessModule,
    SurveysModule,
  ],
})
export class AppModule {}
