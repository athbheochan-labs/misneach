import type { SurveyQuestionDefinition } from './templates';

export type SurveyResponseForAggregate = {
  answers?: Record<string, unknown> | null;
};

export type SurveyAggregate = {
  templateId: string;
  title: string;
  audience: 'staff' | 'customers';
  responseCount: number;
  questions: Record<string, { totalAnswers: number; optionCounts: Record<string, number> }>;
};

export function aggregateSurveyResponses(input: {
  templateKey: string;
  title: string;
  audience: 'staff' | 'customers';
  questions: SurveyQuestionDefinition[];
  responses: SurveyResponseForAggregate[];
}): SurveyAggregate {
  const byQuestion: SurveyAggregate['questions'] = {};
  for (const question of input.questions) {
    const optionCounts: Record<string, number> = {};
    for (const option of question.options || []) {
      optionCounts[option] = 0;
    }

    byQuestion[question.id] = {
      totalAnswers: 0,
      optionCounts,
    };
  }

  for (const response of input.responses) {
    for (const question of input.questions) {
      const value = response.answers?.[question.id];
      if (value === undefined || value === null || value === '') continue;

      if (question.type === 'radio' && typeof value === 'string') {
        byQuestion[question.id].totalAnswers += 1;
        if (byQuestion[question.id].optionCounts[value] !== undefined) {
          byQuestion[question.id].optionCounts[value] += 1;
        }
      }

      if (question.type === 'checkbox' && Array.isArray(value)) {
        byQuestion[question.id].totalAnswers += 1;
        for (const entry of value) {
          if (typeof entry !== 'string') continue;
          if (byQuestion[question.id].optionCounts[entry] !== undefined) {
            byQuestion[question.id].optionCounts[entry] += 1;
          }
        }
      }

      if (question.type === 'text' && typeof value === 'string') {
        byQuestion[question.id].totalAnswers += 1;
      }
    }
  }

  return {
    templateId: input.templateKey,
    title: input.title,
    audience: input.audience,
    responseCount: input.responses.length,
    questions: byQuestion,
  };
}
