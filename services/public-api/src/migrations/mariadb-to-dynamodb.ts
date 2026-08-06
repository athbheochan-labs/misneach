import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { defaultTemplateKey } from '@misneach/public-flows';
import { createDynamoDocumentClient } from '../aws/dynamodb';
import { waitlistEntryKey } from '../waitlist/repository';
import { buildTemplateCampaignKey } from '../surveys/repository';

type MigrationTables = {
  waitlistTableName: string;
  surveyTemplatesTableName: string;
  surveyCampaignsTableName: string;
  surveyResponsesTableName: string;
};

type MigrationCounts = {
  waitlist: number;
  surveyTemplates: number;
  surveyCampaigns: number;
  surveyResponses: number;
};

type WaitlistRow = RowDataPacket & {
  id: string;
  email: string;
  name: string | null;
  interest: string;
  source: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SurveyTemplateRow = RowDataPacket & {
  id: string;
  key: string;
  legacyId: string | null;
  title: string;
  audience: string;
  description: string | null;
  questions: unknown;
  isActive: boolean | number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SurveyCampaignRow = RowDataPacket & {
  id: string;
  manageToken: string;
  businessName: string;
  email: string;
  town: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SurveyResponseRow = RowDataPacket & {
  id: string;
  templateKey: string;
  campaignId: string | null;
  answers: unknown;
  meta: unknown;
  submittedAt: Date | string;
};

const dryRun = !process.argv.includes('--write');

async function main() {
  const tables = readTablesFromEnv();
  const pool = createPool({
    host: process.env.DB_HOST || process.env.MARIA_DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.MARIA_DB_PORT || '3306'),
    user: process.env.DB_USER || process.env.MARIA_DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MARIA_DB_PASSWORD || 'password',
    database: process.env.DB_NAME || process.env.MARIA_DB_NAME || 'decyphr',
    connectionLimit: 4,
  });

  try {
    const counts = dryRun
      ? await dryRunMigration(pool)
      : await writeMigration(pool, tables);

    console.log(
      `${dryRun ? 'Dry-run mapped' : 'Migrated'} ${counts.waitlist} waitlist entries, ` +
        `${counts.surveyTemplates} survey templates, ${counts.surveyCampaigns} survey campaigns, ` +
        `${counts.surveyResponses} survey responses.`,
    );

    if (dryRun) {
      console.log('No DynamoDB writes were performed. Re-run with --write to migrate data.');
    }
  } finally {
    await pool.end();
  }
}

async function dryRunMigration(pool: Pool): Promise<MigrationCounts> {
  const [waitlistRows] = await pool.query<WaitlistRow[]>('select * from waitlist_entries');
  const [templateRows] = await pool.query<SurveyTemplateRow[]>('select * from survey_templates');
  const [campaignRows] = await pool.query<SurveyCampaignRow[]>('select * from survey_campaigns');
  const [responseRows] = await pool.query<SurveyResponseRow[]>('select * from survey_responses');

  waitlistRows.map(mapWaitlistRow);
  templateRows.map(mapSurveyTemplateRow);
  campaignRows.map(mapSurveyCampaignRow);
  responseRows.map(mapSurveyResponseRow);

  return {
    waitlist: waitlistRows.length,
    surveyTemplates: templateRows.length,
    surveyCampaigns: campaignRows.length,
    surveyResponses: responseRows.length,
  };
}

async function writeMigration(pool: Pool, tables: MigrationTables): Promise<MigrationCounts> {
  const client = createDynamoDocumentClient();
  const [waitlistRows] = await pool.query<WaitlistRow[]>('select * from waitlist_entries');
  const [templateRows] = await pool.query<SurveyTemplateRow[]>('select * from survey_templates');
  const [campaignRows] = await pool.query<SurveyCampaignRow[]>('select * from survey_campaigns');
  const [responseRows] = await pool.query<SurveyResponseRow[]>('select * from survey_responses');

  const counts: MigrationCounts = {
    waitlist: 0,
    surveyTemplates: 0,
    surveyCampaigns: 0,
    surveyResponses: 0,
  };

  for (const row of waitlistRows) {
    const item = mapWaitlistRow(row);
    await putIfMissing(client, tables.waitlistTableName, item, 'attribute_not_exists(entryKey)');
    counts.waitlist += 1;
  }

  for (const row of templateRows) {
    const item = mapSurveyTemplateRow(row);
    await putIfMissing(client, tables.surveyTemplatesTableName, item, 'attribute_not_exists(#key)', { '#key': 'key' });
    counts.surveyTemplates += 1;
  }

  for (const row of campaignRows) {
    const item = mapSurveyCampaignRow(row);
    await putIfMissing(client, tables.surveyCampaignsTableName, item, 'attribute_not_exists(id)');
    counts.surveyCampaigns += 1;
  }

  for (const row of responseRows) {
    const item = mapSurveyResponseRow(row);
    await putIfMissing(client, tables.surveyResponsesTableName, item, 'attribute_not_exists(id)');
    counts.surveyResponses += 1;
  }

  return counts;
}

async function putIfMissing(
  client: ReturnType<typeof createDynamoDocumentClient>,
  tableName: string,
  item: Record<string, unknown>,
  conditionExpression: string,
  expressionAttributeNames?: Record<string, string>,
) {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: conditionExpression,
      ...(expressionAttributeNames ? { ExpressionAttributeNames: expressionAttributeNames } : {}),
    }),
  ).catch((error) => {
    if (isConditionalCheckFailed(error)) return undefined;
    throw error;
  });
}

export function mapWaitlistRow(row: WaitlistRow) {
  const email = String(row.email || '').trim().toLowerCase();
  const interest = String(row.interest || '').trim();
  return withoutUndefined({
    entryKey: waitlistEntryKey(email, interest),
    id: row.id,
    email,
    interest,
    name: nullableString(row.name),
    source: nullableString(row.source),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

export function mapSurveyTemplateRow(row: SurveyTemplateRow) {
  const key = defaultTemplateKey(String(row.key || row.legacyId || row.id).trim());
  return withoutUndefined({
    id: key,
    key,
    legacyId: nullableString(row.legacyId),
    legacyMariaDbId: nullableString(row.id),
    title: row.title,
    audience: row.audience,
    description: nullableString(row.description),
    questions: parseJson(row.questions, []),
    isActive: Boolean(row.isActive),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

export function mapSurveyCampaignRow(row: SurveyCampaignRow) {
  return withoutUndefined({
    id: row.id,
    manageToken: row.manageToken,
    businessName: row.businessName,
    email: String(row.email || '').trim().toLowerCase(),
    town: nullableString(row.town),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

export function mapSurveyResponseRow(row: SurveyResponseRow) {
  const templateKey = defaultTemplateKey(String(row.templateKey || '').trim());
  const campaignId = nullableString(row.campaignId) || null;
  return withoutUndefined({
    id: row.id,
    templateKey,
    campaignId,
    templateCampaignKey: buildTemplateCampaignKey(templateKey, campaignId),
    answers: parseJson(row.answers, {}),
    meta: parseJson(row.meta, {}),
    submittedAt: toIso(row.submittedAt),
  });
}

function readTablesFromEnv(): MigrationTables {
  const tables = {
    waitlistTableName: process.env.WAITLIST_TABLE_NAME || 'decyphr-prod-waitlist',
    surveyTemplatesTableName: process.env.SURVEY_TEMPLATES_TABLE_NAME || 'decyphr-prod-survey-templates',
    surveyCampaignsTableName: process.env.SURVEY_CAMPAIGNS_TABLE_NAME || 'decyphr-prod-survey-campaigns',
    surveyResponsesTableName: process.env.SURVEY_RESPONSES_TABLE_NAME || 'decyphr-prod-survey-responses',
  };
  for (const [key, value] of Object.entries(tables)) {
    if (!value) throw new Error(`${key} is required`);
  }
  return tables;
}

function parseJson(value: unknown, fallback: unknown) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  return JSON.parse(value);
}

function nullableString(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function toIso(value: Date | string) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function withoutUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function isConditionalCheckFailed(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ConditionalCheckFailedException'
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Public API data migration failed', error);
    process.exitCode = 1;
  });
}
