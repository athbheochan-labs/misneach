import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInterfaceController } from './ai-interface.controller';
import { AiInterfaceService } from './ai-interface.service';
import { Translation } from './translation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Translation])],
  providers: [AiInterfaceService],
  controllers: [AiInterfaceController],
})
export class AiInterfaceModule {}
