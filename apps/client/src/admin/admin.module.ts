import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ChallengesModule } from 'src/challenges/challenges.module';
import { CoursesModule } from 'src/courses/courses.module';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { FocusModule } from 'src/focus/focus.module';
import { SurveysModule } from 'src/surveys/surveys.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminDiscountCodesController } from './admin-discount-codes.controller';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminSurveysController } from './admin-surveys.controller';

@Module({
  imports: [AuthModule, CoursesModule, DiscountsModule, FocusModule, ChallengesModule, SurveysModule],
  controllers: [AdminCoursesController, AdminDiscountCodesController, AdminAnalyticsController, AdminSurveysController],
})
export class AdminModule {}
