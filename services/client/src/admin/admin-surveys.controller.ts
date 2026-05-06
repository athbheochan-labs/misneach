import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { SurveysGatewayService } from 'src/surveys/surveys.service';

@Controller('admin/surveys')
@UseGuards(AdminGuard)
export class AdminSurveysController {
  constructor(private readonly surveysService: SurveysGatewayService) {}

  @Get('templates')
  async listTemplates() {
    return this.surveysService.adminGet('/surveys/admin/templates');
  }

  @Post('templates')
  async createTemplate(@Body() body: unknown) {
    return this.surveysService.adminPost('/surveys/admin/templates', body);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() body: unknown) {
    return this.surveysService.adminPut(`/surveys/admin/templates/${encodeURIComponent(id)}`, body);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return this.surveysService.adminDelete(`/surveys/admin/templates/${encodeURIComponent(id)}`);
  }
}
