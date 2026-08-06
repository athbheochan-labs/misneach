import {
  aggregateSurveyResponses,
  buildSurveyCampaignEmailText,
  buildSurveyCampaignLinks,
  buildSurveyQrUrl,
  normalizeSurveyQuestions,
  PublicFlowValidationError,
  renderSurveyCampaignEmailHtml,
  validateSurveyAnswers,
  type SurveyCampaignLinks,
  type SurveyQuestionDefinition,
  type SurveyTemplateDefinition,
} from '@misneach/public-flows';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import {
  RegisterSurveyCampaignDto,
  SubmitSurveyResponseBodyDto,
  UpsertSurveyTemplateDto,
} from './surveys.dto';
import { SurveyCampaignEntity } from './survey-campaign.entity';
import { SurveyResponseEntity } from './survey-response.entity';
import { SurveyTemplateEntity } from './survey-template.entity';
import {
  defaultTemplateKey,
  SURVEY_TEMPLATES,
} from './surveys.templates';

type SurveyTemplateRecord = SurveyTemplateDefinition & {
  id: string;
  key: string;
  legacyId: string | null;
  description: string | null;
  isActive: boolean;
};

@Injectable()
export class SurveysService implements OnModuleInit {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectRepository(SurveyTemplateEntity)
    private readonly templateRepo: Repository<SurveyTemplateEntity>,
    @InjectRepository(SurveyCampaignEntity)
    private readonly campaignRepo: Repository<SurveyCampaignEntity>,
    @InjectRepository(SurveyResponseEntity)
    private readonly responseRepo: Repository<SurveyResponseEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  private surveyBaseUrl() {
    return process.env.SURVEY_PUBLIC_BASE_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:5173';
  }

  private qrUrl(rawUrl: string, format: 'png' | 'svg' = 'png') {
    return buildSurveyQrUrl(rawUrl, format);
  }

  private buildCampaignLinks(campaignId: string, manageToken: string) {
    return buildSurveyCampaignLinks({
      baseUrl: this.surveyBaseUrl(),
      campaignId,
      manageToken,
    });
  }

  private async sendCampaignLinksEmail(
    email: string,
    businessName: string,
    links: SurveyCampaignLinks,
  ) {
    const deliveryMode = process.env.EMAIL_DELIVERY || 'log';
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'no-reply@example.com';

    if (deliveryMode === 'log' || !resendKey) {
      this.logger.log('---- SURVEY LINKS EMAIL ----');
      this.logger.log(`To: ${email}`);
      this.logger.log(`Business: ${businessName}`);
      this.logger.log(`Staff: ${links.staffSurveyUrl}`);
      this.logger.log(`Customer: ${links.customersSurveyUrl}`);
      this.logger.log(`Manage: ${links.manageUrl}`);
      this.logger.log('----------------------------');
      return;
    }

    const payload = {
      from,
      to: email,
      subject: `Your Misneach appetite survey links for ${businessName}`,
      html: renderSurveyCampaignEmailHtml(businessName, links),
      text: buildSurveyCampaignEmailText(businessName, links),
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Failed to send survey links email (${response.status}): ${text}`);
      throw new InternalServerErrorException('Failed to send survey links email');
    }
  }

  private normalizeQuestions(raw: unknown): SurveyQuestionDefinition[] {
    try {
      return normalizeSurveyQuestions(raw);
    } catch (error) {
      if (error instanceof PublicFlowValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toRecord(entity: SurveyTemplateEntity): SurveyTemplateRecord {
    return {
      id: entity.id,
      key: entity.key,
      legacyId: entity.legacyId,
      title: entity.title,
      audience: entity.audience as 'staff' | 'customers',
      description: entity.description,
      questions: this.normalizeQuestions(entity.questions),
      isActive: entity.isActive,
    };
  }

  private async findTemplateByKeyOrLegacy(key: string) {
    const normalized = key.trim();
    if (!normalized) throw new NotFoundException('Survey template not found');

    const entity = await this.templateRepo
      .createQueryBuilder('template')
      .where('template.key = :normalized', { normalized })
      .orWhere('template.legacyId = :normalized', { normalized })
      .orWhere('template.id = :normalized', { normalized })
      .getOne();

    if (!entity || !entity.isActive) {
      throw new NotFoundException(`Unknown survey template: ${key}`);
    }

    return this.toRecord(entity);
  }

  private async requireCampaign(campaignId: string) {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Survey campaign not found');
    }
    return campaign;
  }

  private validateAnswers(template: SurveyTemplateRecord, answers: Record<string, unknown>) {
    try {
      validateSurveyAnswers(template.questions, answers);
    } catch (error) {
      if (error instanceof PublicFlowValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async aggregateTemplate(template: SurveyTemplateRecord, campaignId?: string) {
    const where = campaignId
      ? { templateKey: template.key, campaignId }
      : { templateKey: template.key };
    const responses = await this.responseRepo.find({ where });

    return aggregateSurveyResponses({
      templateKey: template.key,
      title: template.title,
      audience: template.audience,
      questions: template.questions,
      responses,
    });
  }

  private async buildInsightSnapshot() {
    const staff = await this.findTemplateByKeyOrLegacy('staff-appetite');
    const customers = await this.findTemplateByKeyOrLegacy('customers-appetite');

    const staffAgg = await this.aggregateTemplate(staff);
    const customerAgg = await this.aggregateTemplate(customers);

    const staffQ2 = staffAgg.questions.q2?.optionCounts || {};
    const staffInterested =
      (staffQ2["I'd love it - I'd want to be involved"] || 0) +
      (staffQ2["I'd be fine with it - happy to try if it's low-pressure"] || 0);

    const customerQ4 = customerAgg.questions.q4?.optionCounts || {};
    const customerTryIrish =
      (customerQ4["Yes - I'd do it straight away"] || 0) +
      (customerQ4["Probably - once I'd seen someone else do it"] || 0);

    const staffTotal = staffAgg.responseCount;
    const customerTotal = customerAgg.responseCount;

    return {
      generatedAt: new Date().toISOString(),
      stats: {
        staffInterestedCount: staffInterested,
        staffResponseCount: staffTotal,
        staffInterestedPercent: staffTotal ? Math.round((staffInterested / staffTotal) * 100) : 0,
        customerTryIrishCount: customerTryIrish,
        customerResponseCount: customerTotal,
        customerTryIrishPercent: customerTotal ? Math.round((customerTryIrish / customerTotal) * 100) : 0,
      },
      marketingLines: {
        staffInterest: `${staffInterested} people working in coffee shops said they want to use at least some Irish at work.`,
        customerInterest: `${customerTryIrish} customers said they'd likely try ordering in Irish if the door sign invited it.`,
      },
    };
  }

  private async seedDefaultTemplates() {
    for (const template of SURVEY_TEMPLATES) {
      const key = defaultTemplateKey(template.id);
      const existing = await this.templateRepo.findOne({ where: { key } });
      if (existing) continue;

      const created = this.templateRepo.create({
        key,
        legacyId: template.id,
        title: template.title,
        audience: template.audience,
        description: null,
        questions: template.questions,
        isActive: true,
      });
      await this.templateRepo.save(created);
    }
  }

  async listTemplates() {
    const templates = await this.templateRepo.find({ where: { isActive: true }, order: { audience: 'ASC' } });
    return {
      templates: templates.map((template) => {
        const record = this.toRecord(template);
        return {
          id: record.key,
          title: record.title,
          audience: record.audience,
          questions: record.questions,
        };
      }),
    };
  }

  async getTemplate(templateId: string) {
    const template = await this.findTemplateByKeyOrLegacy(templateId);
    return {
      template,
    };
  }

  async getAppetiteTemplates() {
    const staff = await this.findTemplateByKeyOrLegacy('staff-appetite');
    const customers = await this.findTemplateByKeyOrLegacy('customers-appetite');
    return {
      staff,
      customers,
    };
  }

  async registerCampaign(input: RegisterSurveyCampaignDto) {
    const manageToken = randomBytes(18).toString('base64url');

    const campaign = this.campaignRepo.create({
      manageToken,
      businessName: input.businessName.trim(),
      email: input.email.trim().toLowerCase(),
      town: input.town?.trim() || null,
    });
    const saved = await this.campaignRepo.save(campaign);

    const links = this.buildCampaignLinks(saved.id, saved.manageToken);
    await this.sendCampaignLinksEmail(saved.email, saved.businessName, links);

    return {
      campaign: {
        id: saved.id,
        businessName: saved.businessName,
        town: saved.town,
        createdAt: saved.createdAt.toISOString(),
      },
      links,
      qrCodes: {
        staff: {
          pngUrl: this.qrUrl(links.staffSurveyUrl, 'png'),
          svgUrl: this.qrUrl(links.staffSurveyUrl, 'svg'),
        },
        customers: {
          pngUrl: this.qrUrl(links.customersSurveyUrl, 'png'),
          svgUrl: this.qrUrl(links.customersSurveyUrl, 'svg'),
        },
      },
    };
  }

  async getCampaignByToken(token: string) {
    const campaign = await this.campaignRepo.findOne({ where: { manageToken: token } });
    if (!campaign) {
      throw new NotFoundException('Campaign token is invalid');
    }

    const links = this.buildCampaignLinks(campaign.id, token);
    const staff = await this.findTemplateByKeyOrLegacy('staff-appetite');
    const customers = await this.findTemplateByKeyOrLegacy('customers-appetite');

    return {
      campaign: {
        id: campaign.id,
        businessName: campaign.businessName,
        town: campaign.town,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
      links,
      qrCodes: {
        staff: {
          pngUrl: this.qrUrl(links.staffSurveyUrl, 'png'),
          svgUrl: this.qrUrl(links.staffSurveyUrl, 'svg'),
        },
        customers: {
          pngUrl: this.qrUrl(links.customersSurveyUrl, 'png'),
          svgUrl: this.qrUrl(links.customersSurveyUrl, 'svg'),
        },
      },
      results: {
        staff: await this.aggregateTemplate(staff, campaign.id),
        customers: await this.aggregateTemplate(customers, campaign.id),
      },
    };
  }

  async getCampaignPublic(campaignId: string) {
    const campaign = await this.requireCampaign(campaignId);
    return {
      campaign: {
        id: campaign.id,
        businessName: campaign.businessName,
        town: campaign.town,
      },
    };
  }

  async submitResponse(templateId: string, payload: SubmitSurveyResponseBodyDto) {
    const template = await this.findTemplateByKeyOrLegacy(templateId);
    const answers = payload.answers || {};
    this.validateAnswers(template, answers);

    let campaignId: string | null = null;
    if (payload.campaignId) {
      const campaign = await this.requireCampaign(payload.campaignId);
      campaignId = campaign.id;
    }

    const response = this.responseRepo.create({
      templateKey: template.key,
      campaignId,
      answers,
      meta: payload.meta || {},
    });
    const saved = await this.responseRepo.save(response);

    return {
      ok: true,
      responseId: saved.id,
      submittedAt: saved.submittedAt.toISOString(),
    };
  }

  async aggregate(templateId: string, campaignId?: string) {
    const template = await this.findTemplateByKeyOrLegacy(templateId);
    if (campaignId) await this.requireCampaign(campaignId);
    return this.aggregateTemplate(template, campaignId);
  }

  async aggregateAll() {
    const templates = await this.templateRepo.find({ where: { isActive: true } });
    const aggregates = await Promise.all(
      templates.map((template) => this.aggregateTemplate(this.toRecord(template))),
    );

    return {
      generatedAt: new Date().toISOString(),
      templates: aggregates,
      insights: await this.buildInsightSnapshot(),
    };
  }

  async listAdminTemplates() {
    const templates = await this.templateRepo.find({ order: { createdAt: 'ASC' } });
    return {
      templates: templates.map((template) => this.toRecord(template)),
    };
  }

  async createAdminTemplate(body: UpsertSurveyTemplateDto) {
    const existing = await this.templateRepo.findOne({ where: { key: body.key.trim() } });
    if (existing) {
      throw new BadRequestException('Template key already exists');
    }

    const template = this.templateRepo.create({
      key: body.key.trim(),
      legacyId: body.legacyId?.trim() || null,
      title: body.title.trim(),
      audience: body.audience,
      description: body.description?.trim() || null,
      questions: this.normalizeQuestions(body.questions),
      isActive: body.isActive ?? true,
    });

    const saved = await this.templateRepo.save(template);
    return { template: this.toRecord(saved) };
  }

  async updateAdminTemplate(id: string, body: UpsertSurveyTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Survey template not found');
    }

    const key = body.key.trim();
    if (key !== template.key) {
      const duplicate = await this.templateRepo.findOne({ where: { key } });
      if (duplicate) {
        throw new BadRequestException('Template key already exists');
      }
    }

    template.key = key;
    template.legacyId = body.legacyId?.trim() || null;
    template.title = body.title.trim();
    template.audience = body.audience;
    template.description = body.description?.trim() || null;
    template.questions = this.normalizeQuestions(body.questions);
    template.isActive = body.isActive ?? true;

    const saved = await this.templateRepo.save(template);
    return { template: this.toRecord(saved) };
  }

  async deleteAdminTemplate(id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Survey template not found');
    }

    await this.templateRepo.delete({ id });
    return { ok: true };
  }
}
