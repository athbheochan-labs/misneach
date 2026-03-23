import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AdminCourseLessonDraftUpdateDto,
  AdminPreviewTokenRequestDto,
  AdminPublishReleaseRequestDto,
} from './courses.dto';
import { CoursesService } from './courses.service';

type AdminActor = {
  userId: number;
  clientId: string;
  role: 'admin';
};

@Controller('admin/courses')
export class CoursesAdminController {
  constructor(private readonly coursesService: CoursesService) {}

  private requireAdmin(req: Request): AdminActor {
    const expectedInternalSecret = process.env.INTERNAL_AUTH_SECRET;
    if (expectedInternalSecret) {
      const providedInternalSecret = req.headers['x-internal-auth'];
      if (providedInternalSecret !== expectedInternalSecret) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const role = req.headers['x-admin-user-role'];
    if (role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const userIdRaw = req.headers['x-admin-user-id'];
    const clientIdRaw = req.headers['x-admin-client-id'];
    if (typeof userIdRaw !== 'string' || typeof clientIdRaw !== 'string') {
      throw new BadRequestException('Missing admin actor headers');
    }
    const userId = Number.parseInt(userIdRaw, 10);
    if (!Number.isFinite(userId)) {
      throw new BadRequestException('Invalid admin user id');
    }
    return {
      userId,
      clientId: clientIdRaw,
      role: 'admin',
    };
  }

  @Get()
  listCourses(@Req() req: Request) {
    return this.coursesService.adminListCourses(this.requireAdmin(req));
  }

  @Get('releases')
  listReleases(@Req() req: Request) {
    return this.coursesService.adminListReleases(this.requireAdmin(req));
  }

  @Get('analytics/engagement')
  engagementAnalytics(@Req() req: Request) {
    return this.coursesService.adminEngagementAnalytics(this.requireAdmin(req));
  }

  @Get(':courseSlug/lessons/:lessonSlug/draft')
  getLessonDraft(
    @Req() req: Request,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.coursesService.adminGetLessonDraft(
      this.requireAdmin(req),
      courseSlug,
      lessonSlug,
    );
  }

  @Put(':courseSlug/lessons/:lessonSlug/draft')
  upsertLessonDraft(
    @Req() req: Request,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: AdminCourseLessonDraftUpdateDto,
  ) {
    return this.coursesService.adminUpsertLessonDraft(
      this.requireAdmin(req),
      courseSlug,
      lessonSlug,
      body,
    );
  }

  @Post('releases/preview-token')
  issuePreviewToken(@Req() req: Request, @Body() body: AdminPreviewTokenRequestDto) {
    return this.coursesService.adminIssuePreviewToken(this.requireAdmin(req), body);
  }

  @Post('releases/publish')
  publish(@Req() req: Request, @Body() body: AdminPublishReleaseRequestDto) {
    return this.coursesService.adminPublishRelease(this.requireAdmin(req), body);
  }
}
