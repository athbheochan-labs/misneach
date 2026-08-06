import {
  mapSurveyCampaignRow,
  mapSurveyResponseRow,
  mapSurveyTemplateRow,
  mapWaitlistRow,
} from './mariadb-to-dynamodb';

describe('MariaDB to DynamoDB migration mappers', () => {
  const timestamp = new Date('2026-08-06T12:00:00.000Z');

  it('maps waitlist rows to the serverless table shape', () => {
    expect(
      mapWaitlistRow({
        id: 'waitlist-1',
        email: 'HELLO@example.com',
        name: null,
        interest: 'business_pack',
        source: '/waitlist',
        createdAt: timestamp,
        updatedAt: timestamp,
      } as never),
    ).toEqual({
      entryKey: 'hello@example.com#business_pack',
      id: 'waitlist-1',
      email: 'hello@example.com',
      interest: 'business_pack',
      source: '/waitlist',
      createdAt: '2026-08-06T12:00:00.000Z',
      updatedAt: '2026-08-06T12:00:00.000Z',
    });
  });

  it('maps survey templates and keeps the old MariaDB id searchable', () => {
    expect(
      mapSurveyTemplateRow({
        id: 'template-uuid',
        key: 'staff-appetite',
        legacyId: 'staff-cafe-v1',
        title: 'Staff',
        audience: 'staff',
        description: null,
        questions: JSON.stringify([{ id: 'q1', label: 'Q1', type: 'radio', required: true, options: ['a', 'b'] }]),
        isActive: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as never),
    ).toMatchObject({
      id: 'staff-appetite',
      key: 'staff-appetite',
      legacyId: 'staff-cafe-v1',
      legacyMariaDbId: 'template-uuid',
      isActive: true,
    });
  });

  it('maps campaigns and responses to indexable DynamoDB records', () => {
    expect(
      mapSurveyCampaignRow({
        id: 'campaign-1',
        manageToken: 'token-1',
        businessName: 'Cafe Beag',
        email: 'HELLO@example.com',
        town: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as never),
    ).toMatchObject({
      id: 'campaign-1',
      manageToken: 'token-1',
      email: 'hello@example.com',
    });

    expect(
      mapSurveyResponseRow({
        id: 'response-1',
        templateKey: 'customers-cafe-v1',
        campaignId: 'campaign-1',
        answers: '{"q1":"None at all"}',
        meta: null,
        submittedAt: timestamp,
      } as never),
    ).toEqual({
      id: 'response-1',
      templateKey: 'customers-appetite',
      campaignId: 'campaign-1',
      templateCampaignKey: 'customers-appetite#campaign-1',
      answers: { q1: 'None at all' },
      meta: {},
      submittedAt: '2026-08-06T12:00:00.000Z',
    });
  });
});
