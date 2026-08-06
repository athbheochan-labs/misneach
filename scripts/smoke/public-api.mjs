#!/usr/bin/env node

const args = process.argv.slice(2);
const baseUrl = normalizeUrl(readArg('--base-url') || process.env.PUBLIC_API_URL || process.env.SURVEYS_API_URL || process.env.WAITLIST_API_URL || '');
const writeMode = args.includes('--write');

if (!baseUrl) {
  console.error('PUBLIC_API_URL or --base-url is required.');
  process.exit(1);
}

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

try {
  await smokeReadPaths();
  await smokeErrorPaths();
  if (writeMode) {
    await smokeWritePaths();
  } else {
    console.log('Read-only smoke passed. Re-run with --write to exercise waitlist/campaign/response writes.');
  }
} catch (error) {
  console.error('Public API smoke failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}

async function smokeReadPaths() {
  const templates = await expectJson('/surveys/templates/public/appetite', 200);
  assert(templates.staff?.key === 'staff-appetite', 'staff appetite template missing');
  assert(templates.customers?.key === 'customers-appetite', 'customer appetite template missing');

  const staffTemplate = await expectJson('/surveys/templates/staff-appetite', 200);
  assert(Array.isArray(staffTemplate.template?.questions), 'staff template questions missing');

  const aggregate = await expectJson('/surveys/templates/staff-appetite/aggregate', 200);
  assert(typeof aggregate.responseCount === 'number', 'aggregate responseCount missing');

  console.log('Read paths passed.');
}

async function smokeErrorPaths() {
  await expectJson(
    '/waitlist/join',
    400,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', interest: 'not-real' }),
    },
  );

  await expectJson(
    '/surveys/responses/staff-appetite',
    400,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: {} }),
    },
  );

  await expectJson('/surveys/campaigns/missing-campaign/public', 404);
  console.log('Error paths passed.');
}

async function smokeWritePaths() {
  const waitlist = await expectJson(
    '/waitlist/join',
    200,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `public-api-smoke+${unique}@example.com`,
        interest: 'business_pack',
        source: '/waitlist',
      }),
    },
  );
  assert(waitlist.ok === true && waitlist.alreadyJoined === false && waitlist.id, 'waitlist write shape changed');

  const campaignSetup = await expectJson(
    '/surveys/campaigns',
    201,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        businessName: `Smoke Cafe ${unique}`,
        email: `public-api-smoke+${unique}@example.com`,
        town: 'Galway',
      }),
    },
  );
  const campaignId = campaignSetup.campaign?.id;
  const manageToken = new URL(campaignSetup.links?.manageUrl).searchParams.get('t');
  assert(campaignId && manageToken, 'campaign setup did not return campaign id and manage token');

  const publicCampaign = await expectJson(`/surveys/campaigns/${campaignId}/public`, 200);
  assert(publicCampaign.campaign?.businessName === `Smoke Cafe ${unique}`, 'public campaign lookup mismatch');

  const staffTemplate = await expectJson('/surveys/templates/staff-appetite', 200);
  const answers = answersFor(staffTemplate.template);

  const response = await expectJson(
    '/surveys/responses/staff-appetite',
    201,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        answers,
        meta: { source: 'public-api-smoke' },
      }),
    },
  );
  assert(response.ok === true && response.responseId, 'survey response write shape changed');

  const campaignAggregate = await expectJson(`/surveys/templates/staff-appetite/aggregate?campaignId=${campaignId}`, 200);
  assert(campaignAggregate.responseCount >= 1, 'campaign aggregate did not include smoke response');

  const byToken = await expectJson(`/surveys/campaigns/by-token/${manageToken}`, 200);
  assert(byToken.campaign?.id === campaignId, 'manage token lookup mismatch');
  assert(byToken.results?.staff?.responseCount >= 1, 'manage token aggregate missing smoke response');

  console.log('Write paths passed.');
}

async function expectJson(path, expectedStatus, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}, expected ${expectedStatus}: ${text}`);
  }
  return body;
}

function answersFor(template) {
  assert(Array.isArray(template?.questions), 'template questions missing');
  return Object.fromEntries(
    template.questions.map((question) => {
      if (question.type === 'checkbox') return [question.id, [question.options?.[0]]];
      if (question.type === 'text') return [question.id, ''];
      return [question.id, question.options?.[0]];
    }),
  );
}

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
