import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PhrasebookService } from './phrasebook.service';
import {
  PhraseCategoryDto,
  PhraseGroupDto,
  PhrasebookPageDto,
  UpdatePhraseDto,
} from './phrasebook.dto';

@Controller()
export class PhrasebookController {
  constructor(private readonly service: PhrasebookService) {}

  // ---------------- CRUD ----------------

  @Get('phrases')
  getPhrasebook(
    @Query('clientId') clientId: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
    @Query('categoryId') categoryId?: string,
    @Query('groupId') groupId?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PhrasebookPageDto> {
    return this.service.getPhrasebook(clientId, {
      search,
      filter,
      categoryId: categoryId ? Number(categoryId) : undefined,
      groupId: groupId ? Number(groupId) : undefined,
      sort,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('phrases/:id')
  getPhrase(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPhrase(id);
  }

  @Post('phrases')
  createPhrase(
    @Query('clientId') clientId: string,
    @Body() body: UpdatePhraseDto,
  ) {
    return this.service.createPhrase(clientId, body);
  }

  @Put('phrases/:id')
  updatePhrasePut(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePhraseDto,
  ) {
    return this.service.updatePhrase(id, body);
  }

  @Post('phrases/:id')
  updatePhrase(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePhraseDto,
  ) {
    return this.service.updatePhrase(id, body);
  }

  @Delete('phrases/:id')
  deletePhrase(@Param('id', ParseIntPipe) id: number) {
    return this.service.deletePhrase(id);
  }

  @Post('phrases/:id/translate')
  generateTranslation(
    @Param('id', ParseIntPipe) id: number,
    @Query('clientId') clientId: string,
  ) {
    return this.service.generateTranslation(id, clientId);
  }

  @Get('categories')
  listCategories(@Query('clientId') clientId: string): Promise<PhraseCategoryDto[]> {
    return this.service.listCategories(clientId);
  }

  @Post('categories')
  createCategory(
    @Query('clientId') clientId: string,
    @Body() body: { name?: string },
  ): Promise<PhraseCategoryDto> {
    return this.service.createCategory(clientId, body?.name || '');
  }

  @Post('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('clientId') clientId: string,
    @Body() body: { name?: string; archived?: boolean },
  ): Promise<PhraseCategoryDto> {
    return this.service.updateCategory(clientId, id, body);
  }

  @Delete('categories/:id')
  deleteCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('clientId') clientId: string,
  ) {
    return this.service.deleteCategory(clientId, id);
  }

  @Get('groups')
  listGroups(
    @Query('clientId') clientId: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<PhraseGroupDto[]> {
    return this.service.listGroups(
      clientId,
      categoryId ? Number(categoryId) : undefined,
    );
  }

  @Post('groups')
  createGroup(
    @Query('clientId') clientId: string,
    @Body() body: { categoryId?: number; name?: string },
  ): Promise<PhraseGroupDto> {
    return this.service.createGroup(clientId, body?.categoryId, body?.name || '');
  }

  @Post('groups/:id')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Query('clientId') clientId: string,
    @Body() body: { categoryId?: number; name?: string; archived?: boolean },
  ): Promise<PhraseGroupDto> {
    return this.service.updateGroup(clientId, id, body);
  }

  @Delete('groups/:id')
  deleteGroup(
    @Param('id', ParseIntPipe) id: number,
    @Query('clientId') clientId: string,
  ) {
    return this.service.deleteGroup(clientId, id);
  }
}
