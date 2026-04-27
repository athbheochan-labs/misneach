import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { PhrasebookService } from './phrasebook.service';
import { UpdatePhraseDto } from './phrasebook.dto';

@Controller('phrasebook')
export class PhrasebookController {
  constructor(
    private readonly authService: AuthService,
    private readonly phrasebookService: PhrasebookService,
  ) {}

  // ---------------- SSE ----------------

  @Get('/stream')
  async stream(@Res() res: Response, @Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    this.phrasebookService.registerSseClient(clientId, res);
  }

  // ---------------- Read ----------------

  @Get('/list')
  async getPhrasebook(
    @Req() req: AuthenticatedRequest,
    @Query('categoryId') categoryId?: string,
    @Query('groupId') groupId?: string,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.getPhrasebook(clientId, { categoryId, groupId });
  }

  @Get('/categories')
  async listCategories(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.listCategories(clientId);
  }

  @Post('/categories')
  async createCategory(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: string },
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.createCategory(clientId, body);
  }

  @Post('/categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: string; archived?: boolean },
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.updateCategory(clientId, id, body);
  }

  @Delete('/categories/:id')
  async deleteCategory(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.deleteCategory(clientId, id);
  }

  @Get('/groups')
  async listGroups(
    @Req() req: AuthenticatedRequest,
    @Query('categoryId') categoryId?: string,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.listGroups(clientId, categoryId);
  }

  @Post('/groups')
  async createGroup(
    @Req() req: AuthenticatedRequest,
    @Body() body: { categoryId?: number; name?: string },
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.createGroup(clientId, body);
  }

  @Post('/groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { categoryId?: number; name?: string; archived?: boolean },
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.updateGroup(clientId, id, body);
  }

  @Delete('/groups/:id')
  async deleteGroup(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.deleteGroup(clientId, id);
  }

  @Get('/:id')
  async getPhrase(@Param('id') id: string) {
    return this.phrasebookService.getPhrase(id);
  }

  // ---------------- Create ----------------

  @Post()
  async createPhrase(
    @Body() body: UpdatePhraseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.phrasebookService.createPhrase(req, body);
  }

  // ---------------- Update ----------------

  @Post('/:id')
  async updatePhrase(
    @Param('id') id: string,
    @Body() body: UpdatePhraseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.updatePhrase(id, clientId, body);
  }

  // ---------------- Delete ----------------

  @Delete('/:id')
  async deletePhrase(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.deletePhrase(id, clientId);
  }

  // ---------------- Translation ----------------

  @Post('/:id/translate')
  async generateTranslation(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.phrasebookService.generateTranslation(id, clientId);
  }
}
