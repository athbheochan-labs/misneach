import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { DiscountsGatewayService } from 'src/discounts/discounts.service';
import { ToggleDiscountCodeDto, UpsertDiscountCodeDto } from 'src/discounts/discounts.dto';

@Controller('admin/discount-codes')
@UseGuards(AdminGuard)
export class AdminDiscountCodesController {
  constructor(private readonly discountsService: DiscountsGatewayService) {}

  @Get()
  async list() {
    return this.discountsService.get('/admin/discount-codes');
  }

  @Post()
  async create(@Body() body: UpsertDiscountCodeDto) {
    return this.discountsService.post('/admin/discount-codes', body);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpsertDiscountCodeDto,
  ) {
    return this.discountsService.put(`/admin/discount-codes/${id}`, body);
  }

  @Patch(':id/enabled')
  async toggleEnabled(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ToggleDiscountCodeDto,
  ) {
    return this.discountsService.patch(`/admin/discount-codes/${id}/enabled`, body);
  }
}
