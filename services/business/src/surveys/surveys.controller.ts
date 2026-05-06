import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RegisterSurveyCampaignDto,
  SubmitSurveyResponseBodyDto,
  UpsertSurveyTemplateDto,
} from './surveys.dto';
import { SurveysService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  private requireInternalAuth(token?: string) {
    const secret = process.env.INTERNAL_AUTH_SECRET;
    if (!secret) return;
    if (token !== secret) {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  @Get('templates')
  async listTemplates() {
    return this.surveysService.listTemplates();
  }

  @Get('templates/:templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    return this.surveysService.getTemplate(templateId);
  }

  @Get('templates/public/appetite')
  async getAppetiteTemplates() {
    return this.surveysService.getAppetiteTemplates();
  }

  @Get('templates/:templateId/aggregate')
  async getAggregate(@Param('templateId') templateId: string, @Query('campaignId') campaignId?: string) {
    return this.surveysService.aggregate(templateId, campaignId);
  }

  @Get('aggregate')
  async getAllAggregates() {
    return this.surveysService.aggregateAll();
  }

  @Post('campaigns')
  async registerCampaign(@Body() body: RegisterSurveyCampaignDto) {
    return this.surveysService.registerCampaign(body);
  }

  @Get('campaigns/by-token/:token')
  async getCampaignByToken(@Param('token') token: string) {
    return this.surveysService.getCampaignByToken(token);
  }

  @Get('campaigns/:campaignId/public')
  getCampaignPublic(@Param('campaignId') campaignId: string) {
    return this.surveysService.getCampaignPublic(campaignId);
  }

  @Post('responses/:templateId')
  async submitResponse(@Param('templateId') templateId: string, @Body() body: SubmitSurveyResponseBodyDto) {
    return this.surveysService.submitResponse(templateId, body);
  }

  @Get('admin/templates')
  async listAdminTemplates(@Headers('x-internal-auth') internalAuth?: string) {
    this.requireInternalAuth(internalAuth);
    return this.surveysService.listAdminTemplates();
  }

  @Post('admin/templates')
  async createAdminTemplate(
    @Headers('x-internal-auth') internalAuth: string | undefined,
    @Body() body: UpsertSurveyTemplateDto,
  ) {
    this.requireInternalAuth(internalAuth);
    return this.surveysService.createAdminTemplate(body);
  }

  @Put('admin/templates/:id')
  async updateAdminTemplate(
    @Headers('x-internal-auth') internalAuth: string | undefined,
    @Param('id') id: string,
    @Body() body: UpsertSurveyTemplateDto,
  ) {
    this.requireInternalAuth(internalAuth);
    return this.surveysService.updateAdminTemplate(id, body);
  }

  @Delete('admin/templates/:id')
  async deleteAdminTemplate(
    @Headers('x-internal-auth') internalAuth: string | undefined,
    @Param('id') id: string,
  ) {
    this.requireInternalAuth(internalAuth);
    return this.surveysService.deleteAdminTemplate(id);
  }
}
