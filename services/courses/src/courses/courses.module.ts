import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesAdminController } from './courses.admin.controller';
import {
  AdminAuditLog,
  CourseActiveRelease,
  CourseDraft,
  CourseLexiconEvent,
  CourseProgress,
  CourseRelease,
  CourseReleaseLesson,
  LessonDraft,
} from './courses.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseProgress,
      CourseLexiconEvent,
      CourseDraft,
      LessonDraft,
      CourseRelease,
      CourseReleaseLesson,
      CourseActiveRelease,
      AdminAuditLog,
    ]),
  ],
  controllers: [CoursesController, CoursesAdminController],
  providers: [CoursesService],
})
export class CoursesModule {}
