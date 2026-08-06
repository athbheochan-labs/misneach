import { PublicFlowValidationError } from '../errors';
import type { SurveyQuestionDefinition } from './templates';

export function normalizeSurveyQuestions(raw: unknown): SurveyQuestionDefinition[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PublicFlowValidationError('questions must be a non-empty array');
  }

  return raw.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new PublicFlowValidationError(`Invalid question at index ${index}`);
    }

    const question = entry as Record<string, unknown>;
    const id = String(question.id || '').trim();
    const label = String(question.label || '').trim();
    const type = String(question.type || '').trim();
    const required = Boolean(question.required);

    if (!id || !label || !['radio', 'checkbox', 'text'].includes(type)) {
      throw new PublicFlowValidationError(`Invalid question at index ${index}`);
    }

    const options = Array.isArray(question.options)
      ? question.options.map((option) => String(option)).filter((option) => option.trim().length > 0)
      : undefined;

    if ((type === 'radio' || type === 'checkbox') && (!options || options.length < 2)) {
      throw new PublicFlowValidationError(`Question ${id} requires at least two options`);
    }

    const maxLength = question.maxLength == null ? undefined : Number(question.maxLength);

    return {
      id,
      label,
      type: type as SurveyQuestionDefinition['type'],
      required,
      options,
      maxLength: Number.isFinite(maxLength as number) ? (maxLength as number) : undefined,
    };
  });
}

export function validateSurveyAnswers(
  questions: SurveyQuestionDefinition[],
  answers: Record<string, unknown>,
) {
  for (const question of questions) {
    const value = answers[question.id];

    if (question.required && (value === undefined || value === null || value === '')) {
      throw new PublicFlowValidationError(`Missing required answer for ${question.id}`);
    }

    if (!question.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    if (question.type === 'radio') {
      if (typeof value !== 'string' || !question.options?.includes(value)) {
        throw new PublicFlowValidationError(`Invalid answer for ${question.id}`);
      }
    }

    if (question.type === 'checkbox') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new PublicFlowValidationError(`Invalid answer for ${question.id}`);
      }
      const invalid = value.some((entry) => typeof entry !== 'string' || !question.options?.includes(entry));
      if (invalid) {
        throw new PublicFlowValidationError(`Invalid answer for ${question.id}`);
      }
    }

    if (question.type === 'text') {
      if (typeof value !== 'string') {
        throw new PublicFlowValidationError(`Invalid answer for ${question.id}`);
      }
      const maxLength = question.maxLength || 1000;
      if (value.length > maxLength) {
        throw new PublicFlowValidationError(`Answer too long for ${question.id}`);
      }
    }
  }
}
