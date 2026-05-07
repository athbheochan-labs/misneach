import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/User';
import { CreateDailyNoteDto } from './daily-notes.dto';
import { DailyNote } from './daily-note.entity';

@Injectable()
export class DailyNotesService {
  constructor(
    @InjectRepository(DailyNote)
    private readonly dailyNotesRepo: Repository<DailyNote>,
  ) {}

  async listForUser(user: User) {
    const notes = await this.dailyNotesRepo.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      take: 12,
    });

    return {
      items: notes.map((note) => ({
        id: note.id,
        text: note.text,
        promptId: note.promptId,
        createdAt: note.createdAt.toISOString(),
      })),
    };
  }

  async createForUser(user: User, dto: CreateDailyNoteDto) {
    const text = String(dto?.text || '').trim();
    const promptId = String(dto?.promptId || '').trim();

    if (!text) {
      throw new BadRequestException('Text is required');
    }

    if (!promptId) {
      throw new BadRequestException('Prompt ID is required');
    }

    const note = this.dailyNotesRepo.create({
      text: text.slice(0, 8000),
      promptId,
      user,
    });

    const saved = await this.dailyNotesRepo.save(note);
    return {
      id: saved.id,
      text: saved.text,
      promptId: saved.promptId,
      createdAt: saved.createdAt.toISOString(),
    };
  }
}
