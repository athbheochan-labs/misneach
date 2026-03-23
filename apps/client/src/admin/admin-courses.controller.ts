import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { CoursesGatewayService } from 'src/courses/courses.service';

@Controller('admin/courses')
@UseGuards(AdminGuard)
export class AdminCoursesController {
  constructor(
    private readonly authService: AuthService,
    private readonly coursesService: CoursesGatewayService,
  ) {}

  private async adminContext(req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    return {
      userId: user.id,
      clientId: user.clientId,
      role: user.role,
    } as const;
  }

  @Get()
  async listCourses(@Req() req: AuthenticatedRequest) {
    return this.coursesService.adminGet('/admin/courses', await this.adminContext(req));
  }

  @Get('releases')
  async listReleases(@Req() req: AuthenticatedRequest) {
    return this.coursesService.adminGet('/admin/courses/releases', await this.adminContext(req));
  }

  @Get(':courseSlug/lessons/:lessonSlug/draft')
  async getDraft(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.coursesService.adminGet(
      `/admin/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}/draft`,
      await this.adminContext(req),
    );
  }

  @Put(':courseSlug/lessons/:lessonSlug/draft')
  async saveDraft(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: unknown,
  ) {
    return this.coursesService.adminPut(
      `/admin/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}/draft`,
      await this.adminContext(req),
      body,
    );
  }

  @Post('releases/preview-token')
  async issuePreviewToken(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.coursesService.adminPost(
      '/admin/courses/releases/preview-token',
      await this.adminContext(req),
      body,
    );
  }

  @Post('releases/publish')
  async publish(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.coursesService.adminPost(
      '/admin/courses/releases/publish',
      await this.adminContext(req),
      body,
    );
  }
}
