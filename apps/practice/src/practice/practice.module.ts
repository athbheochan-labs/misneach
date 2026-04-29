import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeAttempt, PracticeProfile } from './practice.entity';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [TypeOrmModule.forFeature([PracticeProfile, PracticeAttempt])],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
