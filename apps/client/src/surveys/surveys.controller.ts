import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SurveysGatewayService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysGatewayService) {}

  @Get('templates/public/appetite')
  async getAppetiteTemplates() {
    return this.surveysService.get('/surveys/templates/public/appetite');
  }

  @Get('templates/:templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    return this.surveysService.get(
      `/surveys/templates/${encodeURIComponent(templateId)}`,
    );
  }

  @Get('templates/:templateId/aggregate')
  async getAggregate(
    @Param('templateId') templateId: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.surveysService.get(
      `/surveys/templates/${encodeURIComponent(templateId)}/aggregate`,
      { campaignId },
    );
  }

  @Post('campaigns')
  async registerCampaign(@Body() body: unknown) {
    return this.surveysService.post('/surveys/campaigns', body);
  }

  @Get('campaigns/by-token/:token')
  async getCampaignByToken(@Param('token') token: string) {
    return this.surveysService.get(
      `/surveys/campaigns/by-token/${encodeURIComponent(token)}`,
    );
  }

  @Get('campaigns/:campaignId/public')
  async getCampaignPublic(@Param('campaignId') campaignId: string) {
    return this.surveysService.get(
      `/surveys/campaigns/${encodeURIComponent(campaignId)}/public`,
    );
  }

  @Post('responses/:templateId')
  async submitResponse(
    @Param('templateId') templateId: string,
    @Body() body: unknown,
  ) {
    return this.surveysService.post(
      `/surveys/responses/${encodeURIComponent(templateId)}`,
      body,
    );
  }
}

