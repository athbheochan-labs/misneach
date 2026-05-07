import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedRequest } from '../auth/types/request';
import { CreateDailyNoteDto } from './daily-notes.dto';
import { DailyNotesService } from './daily-notes.service';

@Controller('daily-notes')
export class DailyNotesController {
  constructor(
    private readonly authService: AuthService,
    private readonly dailyNotesService: DailyNotesService,
  ) {}

  @Get()
  async listDailyNotes(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    return this.dailyNotesService.listForUser(user);
  }

  @Post()
  async createDailyNote(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateDailyNoteDto,
  ) {
    const user = await this.authService.getUserFromSession(req);
    return this.dailyNotesService.createForUser(user, body);
  }
}
