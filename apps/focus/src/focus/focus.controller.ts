import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FocusService } from './focus.service';
import {
  AdjustFocusSessionDto,
  CreateFocusSessionDto,
  CreateGoalDto,
  GoalCheckoffDto,
  UpdateGoalDto,
} from './focus.dto';

@Controller()
export class FocusController {
  constructor(private readonly service: FocusService) {}

  private requireAdmin(req: Request) {
    const expectedInternalSecret = process.env.INTERNAL_AUTH_SECRET;
    if (expectedInternalSecret) {
      const provided = req.headers['x-internal-auth'];
      if (provided !== expectedInternalSecret) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const role = req.headers['x-user-role'] ?? req.headers['x-admin-user-role'];
    if (role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const userIdRaw = req.headers['x-user-id'] ?? req.headers['x-admin-user-id'];
    const userId = Number.parseInt(String(userIdRaw ?? ''), 10);
    if (!Number.isFinite(userId)) {
      throw new BadRequestException('Missing admin actor');
    }
  }

  @Get('/admin/analytics/overview')
  adminOverview(@Req() req: Request) {
    this.requireAdmin(req);
    return this.service.getAdminAnalyticsOverview();
  }

  @Post('/focus/sessions')
  createSession(@Query('clientId') clientId: string, @Body() dto: CreateFocusSessionDto) {
    return this.service.createSession(clientId, dto);
  }

  @Get('/focus/sessions/active')
  getActive(@Query('clientId') clientId: string) {
    return this.service.getActiveSession(clientId);
  }

  @Post('/focus/sessions/:id/pause')
  pause(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.pauseSession(clientId, id);
  }

  @Post('/focus/sessions/:id/resume')
  resume(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.resumeSession(clientId, id);
  }

  @Post('/focus/sessions/:id/adjust')
  adjust(
    @Query('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: AdjustFocusSessionDto,
  ) {
    return this.service.adjustSession(clientId, id, dto);
  }

  @Post('/focus/sessions/:id/complete')
  complete(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.completeSession(clientId, id);
  }

  @Post('/focus/sessions/:id/cancel')
  cancel(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.cancelSession(clientId, id);
  }

  @Get('/focus/sessions/history')
  history(
    @Query('clientId') clientId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.getHistory(clientId, query);
  }

  @Post('/goals')
  createGoal(@Query('clientId') clientId: string, @Body() dto: CreateGoalDto) {
    return this.service.createGoal(clientId, dto);
  }

  @Get('/goals')
  listGoals(@Query('clientId') clientId: string, @Query() query: Record<string, string | undefined>) {
    return this.service.getGoals(clientId, query);
  }

  @Get('/goals/progress/summary')
  summary(@Query('clientId') clientId: string, @Query() query: Record<string, string | undefined>) {
    return this.service.getProgressSummary(clientId, query);
  }

  @Get('/goals/:id')
  getGoal(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.getGoal(clientId, id);
  }

  @Patch('/goals/:id')
  patchGoal(
    @Query('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.service.updateGoal(clientId, id, dto);
  }

  @Post('/goals/:id/archive')
  archiveGoal(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.archiveGoal(clientId, id);
  }

  @Post('/goals/:id/checkoff')
  checkoff(
    @Query('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: GoalCheckoffDto,
  ) {
    return this.service.checkoffGoal(clientId, id, dto);
  }

  @Get('/goals/:id/progress')
  goalProgress(@Query('clientId') clientId: string, @Param('id') id: string) {
    return this.service.getGoalProgress(clientId, id);
  }
}
