import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { CoursesGatewayService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly authService: AuthService,
    private readonly coursesService: CoursesGatewayService,
  ) {}

  @Get('catalog')
  async getCatalog(
    @Req() req: AuthenticatedRequest,
    @Query('previewToken') previewToken?: string,
  ) {
    if (previewToken) {
      const user = await this.authService.getUserFromSession(req);
      if (user.role !== 'admin') {
        throw new ForbiddenException('Preview is only available to admins');
      }
    }
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.get('/courses/catalog', clientId, {
      previewToken,
    });
  }

  @Get('taster')
  async getTaster() {
    return this.coursesService.getPublic('/courses/taster');
  }

  @Get(':courseSlug/lessons/:lessonSlug')
  async getLesson(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Query('previewToken') previewToken?: string,
  ) {
    if (previewToken) {
      const user = await this.authService.getUserFromSession(req);
      if (user.role !== 'admin') {
        throw new ForbiddenException('Preview is only available to admins');
      }
    }
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.get(`/courses/${courseSlug}/lessons/${lessonSlug}`, clientId, {
      previewToken,
    });
  }

  @Post(':courseSlug/lessons/:lessonSlug/progress')
  async updateProgress(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: any,
    @Query('previewToken') previewToken?: string,
  ) {
    if (previewToken) {
      const user = await this.authService.getUserFromSession(req);
      if (user.role !== 'admin') {
        throw new ForbiddenException('Preview is only available to admins');
      }
    }
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.post(
      `/courses/${courseSlug}/lessons/${lessonSlug}/progress`,
      clientId,
      body,
      { previewToken },
    );
  }

  @Post(':courseSlug/lessons/:lessonSlug/lexicon-exposure')
  async recordExposure(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: any,
    @Query('previewToken') previewToken?: string,
  ) {
    if (previewToken) {
      const user = await this.authService.getUserFromSession(req);
      if (user.role !== 'admin') {
        throw new ForbiddenException('Preview is only available to admins');
      }
    }
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.post(
      `/courses/${courseSlug}/lessons/${lessonSlug}/lexicon-exposure`,
      clientId,
      body,
      { previewToken },
    );
  }

  @Post(':courseSlug/lessons/:lessonSlug/gloss')
  async lookupGloss(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: any,
    @Query('previewToken') previewToken?: string,
  ) {
    if (previewToken) {
      const user = await this.authService.getUserFromSession(req);
      if (user.role !== 'admin') {
        throw new ForbiddenException('Preview is only available to admins');
      }
    }
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.post(`/courses/${courseSlug}/lessons/${lessonSlug}/gloss`, clientId, body, {
      previewToken,
    });
  }
}
