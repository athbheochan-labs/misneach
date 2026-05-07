import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DailyNote } from './daily-note.entity';
import { DailyNotesController } from './daily-notes.controller';
import { DailyNotesService } from './daily-notes.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DailyNote])],
  controllers: [DailyNotesController],
  providers: [DailyNotesService],
})
export class DailyNotesModule {}
