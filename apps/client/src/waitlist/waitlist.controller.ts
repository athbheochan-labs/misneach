import { Body, Controller, Post } from '@nestjs/common';
import { WaitlistGatewayService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistGatewayService) {}

  @Post('join')
  async join(@Body() body: unknown) {
    return this.waitlistService.join((body || {}) as Record<string, unknown>);
  }
}

