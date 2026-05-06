import { Body, Controller, Post } from '@nestjs/common';
import { JoinWaitlistDto } from './waitlist.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly service: WaitlistService) {}

  @Post('join')
  async join(@Body() dto: JoinWaitlistDto) {
    return this.service.join(dto);
  }
}
