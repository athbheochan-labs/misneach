import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UpdateChallengeDto } from './challenges.dto';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

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
    return this.challengesService.adminOverview();
  }

  @Get()
  listChallenges(@Query('clientId') clientId: string) {
    return this.challengesService.listForClient(clientId);
  }

  @Patch(':id')
  patchChallenge(
    @Query('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.challengesService.setCompletion(clientId, id, dto.completed);
  }
}
