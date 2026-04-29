import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NLPAdapter } from './tokeniser/adapters/nlp.adapter';
import { TokeniserService } from './tokeniser/tokeniser.service';

@Module({
  imports: [HttpModule],
  providers: [TokeniserService, NLPAdapter],
  exports: [TokeniserService],
})
export class CommonModule { }
