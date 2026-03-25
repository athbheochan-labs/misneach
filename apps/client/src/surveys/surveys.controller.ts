import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { SurveysGatewayService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysGatewayService) {}

  private asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({ error: 'Invalid request body' });
    }
    return value as Record<string, unknown>;
  }

  private requiredParam(name: string, value: string): string {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      throw new BadRequestException({ error: `${name} is required` });
    }
    return trimmed;
  }

  private validateCampaignBody(body: unknown): Record<string, unknown> {
    const input = this.asObject(body);
    const businessName = String(input.businessName || '').trim();
    const email = String(input.email || '').trim();
    const town = String(input.town || '').trim();

    if (!businessName) {
      throw new BadRequestException({ error: 'businessName is required' });
    }

    if (!email) {
      throw new BadRequestException({ error: 'email is required' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      throw new BadRequestException({ error: 'Invalid email' });
    }

    return {
      ...input,
      businessName,
      email,
      town: town || undefined,
    };
  }

  private validateSurveyResponseBody(body: unknown): Record<string, unknown> {
    const input = this.asObject(body);
    const rawCampaignId = input.campaignId;
    const campaignId = String(rawCampaignId ?? '').trim();
    const answers = input.answers;

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new BadRequestException({ error: 'answers is required' });
    }

    if (Object.keys(answers as Record<string, unknown>).length === 0) {
      throw new BadRequestException({
        error: 'answers must include at least one response',
      });
    }

    if (rawCampaignId != null && !campaignId) {
      throw new BadRequestException({ error: 'campaignId cannot be empty' });
    }

    return {
      ...input,
      campaignId: campaignId || undefined,
      answers,
    };
  }

  @Get('templates/public/appetite')
  async getAppetiteTemplates() {
    return this.surveysService.get('/surveys/templates/public/appetite');
  }

  @Get('templates/:templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    const validTemplateId = this.requiredParam('templateId', templateId);
    return this.surveysService.get(
      `/surveys/templates/${encodeURIComponent(validTemplateId)}`,
    );
  }

  @Get('templates/:templateId/aggregate')
  async getAggregate(
    @Param('templateId') templateId: string,
    @Query('campaignId') campaignId?: string,
  ) {
    const validTemplateId = this.requiredParam('templateId', templateId);
    const normalizedCampaignId = String(campaignId || '').trim() || undefined;
    return this.surveysService.get(
      `/surveys/templates/${encodeURIComponent(validTemplateId)}/aggregate`,
      { campaignId: normalizedCampaignId },
    );
  }

  @Post('campaigns')
  async registerCampaign(@Body() body: unknown) {
    return this.surveysService.post(
      '/surveys/campaigns',
      this.validateCampaignBody(body),
    );
  }

  @Get('campaigns/by-token/:token')
  async getCampaignByToken(@Param('token') token: string) {
    const validToken = this.requiredParam('token', token);
    return this.surveysService.get(
      `/surveys/campaigns/by-token/${encodeURIComponent(validToken)}`,
    );
  }

  @Get('campaigns/:campaignId/public')
  async getCampaignPublic(@Param('campaignId') campaignId: string) {
    const validCampaignId = this.requiredParam('campaignId', campaignId);
    return this.surveysService.get(
      `/surveys/campaigns/${encodeURIComponent(validCampaignId)}/public`,
    );
  }

  @Post('responses/:templateId')
  async submitResponse(
    @Param('templateId') templateId: string,
    @Body() body: unknown,
  ) {
    const validTemplateId = this.requiredParam('templateId', templateId);
    return this.surveysService.post(
      `/surveys/responses/${encodeURIComponent(validTemplateId)}`,
      this.validateSurveyResponseBody(body),
    );
  }
}
