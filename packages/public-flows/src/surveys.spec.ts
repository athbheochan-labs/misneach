import {
  aggregateSurveyResponses,
  buildSurveyCampaignLinks,
  buildSurveyQrUrl,
  normalizeSurveyQuestions,
  PublicFlowValidationError,
  SURVEY_TEMPLATES,
  validateSurveyAnswers,
} from '.';

describe('survey public flow helpers', () => {
  const staffTemplate = SURVEY_TEMPLATES[0];

  it('validates answers for the default staff survey', () => {
    expect(() =>
      validateSurveyAnswers(staffTemplate.questions, {
        q1: 'None at all - it never stuck',
        q2: "I'd love it - I'd want to be involved",
        q3: "Yes - I'd genuinely like to do that",
        q4: 'A simple greeting',
        q5_open: 'Keep it low pressure.',
      }),
    ).not.toThrow();
  });

  it('rejects missing required survey answers', () => {
    expect(() => validateSurveyAnswers(staffTemplate.questions, {})).toThrow(
      new PublicFlowValidationError('Missing required answer for q1'),
    );
  });

  it('rejects invalid option answers', () => {
    expect(() =>
      validateSurveyAnswers(staffTemplate.questions, {
        q1: 'nope',
        q2: "I'd love it - I'd want to be involved",
        q3: "Yes - I'd genuinely like to do that",
        q4: 'A simple greeting',
      }),
    ).toThrow(new PublicFlowValidationError('Invalid answer for q1'));
  });

  it('normalizes valid survey questions and rejects invalid definitions', () => {
    expect(
      normalizeSurveyQuestions([
        {
          id: 'q1',
          label: 'Question?',
          type: 'radio',
          required: true,
          options: ['Yes', 'No'],
        },
      ]),
    ).toEqual([
      {
        id: 'q1',
        label: 'Question?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
        maxLength: undefined,
      },
    ]);

    expect(() => normalizeSurveyQuestions([{ id: 'q1', label: 'Question?', type: 'radio' }])).toThrow(
      new PublicFlowValidationError('Question q1 requires at least two options'),
    );
  });

  it('builds campaign links and QR URLs', () => {
    const links = buildSurveyCampaignLinks({
      baseUrl: 'https://misneach.ie/',
      campaignId: 'campaign one',
      manageToken: 'token one',
    });

    expect(links).toEqual({
      staffSurveyUrl: 'https://misneach.ie/survey/staff/appetite?c=campaign%20one',
      customersSurveyUrl: 'https://misneach.ie/survey/customers/appetite?c=campaign%20one',
      manageUrl: 'https://misneach.ie/survey/manage?t=token%20one',
    });
    expect(buildSurveyQrUrl(links.staffSurveyUrl, 'svg')).toContain('format=svg');
  });

  it('aggregates radio, checkbox, and text answers', () => {
    const customerTemplate = SURVEY_TEMPLATES[1];
    const aggregate = aggregateSurveyResponses({
      templateKey: 'customers-appetite',
      title: customerTemplate.title,
      audience: customerTemplate.audience,
      questions: customerTemplate.questions,
      responses: [
        {
          answers: {
            q1: 'None at all',
            q2: 'Never',
            q3: 'Pleasantly surprised',
            q4: "Yes - I'd do it straight away",
            q5: ['A sign on the door saying Irish is welcome', "Nothing - I'd just do it"],
            q6: "Probably - it's a nice thing to do",
          },
        },
      ],
    });

    expect(aggregate.responseCount).toBe(1);
    expect(aggregate.questions.q4.optionCounts["Yes - I'd do it straight away"]).toBe(1);
    expect(aggregate.questions.q5.totalAnswers).toBe(1);
    expect(aggregate.questions.q5.optionCounts["Nothing - I'd just do it"]).toBe(1);
  });
});
