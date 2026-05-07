import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  QuoteDiscountDto,
  RedeemDiscountDto,
  ToggleDiscountCodeDto,
  UpsertDiscountCodeDto,
} from './discounts.dto';
import { DiscountsService } from './discounts.service';

@Controller()
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  private verifyInternalAccess(req: Request) {
    const expectedInternalSecret = process.env.INTERNAL_AUTH_SECRET;
    if (!expectedInternalSecret) return;

    const providedInternalSecret = req.headers['x-internal-auth'];
    if (providedInternalSecret !== expectedInternalSecret) {
      throw new ForbiddenException('Forbidden');
    }
  }

  @Post('discounts/quote')
  async quote(@Req() req: Request, @Body() body: QuoteDiscountDto) {
    this.verifyInternalAccess(req);
    return this.discountsService.quote(body);
  }

  @Post('discounts/redeem')
  async redeem(@Req() req: Request, @Body() body: RedeemDiscountDto) {
    this.verifyInternalAccess(req);
    return this.discountsService.redeem(body);
  }

  @Get('admin/discount-codes')
  async list(@Req() req: Request) {
    this.verifyInternalAccess(req);
    return {
      codes: await this.discountsService.adminList(),
    };
  }

  @Post('admin/discount-codes')
  async create(@Req() req: Request, @Body() body: UpsertDiscountCodeDto) {
    this.verifyInternalAccess(req);
    return {
      code: await this.discountsService.adminCreate(body),
    };
  }

  @Put('admin/discount-codes/:id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpsertDiscountCodeDto,
  ) {
    this.verifyInternalAccess(req);
    return {
      code: await this.discountsService.adminUpdate(id, body),
    };
  }

  @Patch('admin/discount-codes/:id/enabled')
  async toggleEnabled(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ToggleDiscountCodeDto,
  ) {
    this.verifyInternalAccess(req);
    return {
      code: await this.discountsService.adminToggle(id, body.isEnabled),
    };
  }
}
