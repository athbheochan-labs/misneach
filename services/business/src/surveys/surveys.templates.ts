export type SurveyQuestionType = 'radio' | 'checkbox' | 'text';

export type SurveyQuestionDefinition = {
  id: string;
  type: SurveyQuestionType;
  label: string;
  options?: string[];
  required: boolean;
  maxLength?: number;
};

export type SurveyTemplateDefinition = {
  id: string;
  title: string;
  audience: 'staff' | 'customers';
  questions: SurveyQuestionDefinition[];
};

export const SURVEY_TEMPLATES: SurveyTemplateDefinition[] = [
  {
    id: 'staff-cafe-v1',
    title: 'Irish at work - what do you think?',
    audience: 'staff',
    questions: [
      {
        id: 'q1',
        type: 'radio',
        label: 'How would you describe your Irish?',
        required: true,
        options: [
          'None at all - it never stuck',
          'A few words - slan, go raibh maith agat, that kind of thing',
          'Enough to get by - I could manage a basic exchange',
          'More than I let on - rusty but there',
          'Fairly conversational or fluent',
        ],
      },
      {
        id: 'q2',
        type: 'radio',
        label:
          'How would you feel if your cafe used a small bit of Irish as part of how it operates?',
        required: true,
        options: [
          "I'd love it - I'd want to be involved",
          "I'd be fine with it - happy to try if it's low-pressure",
          "Neutral - I wouldn't mind either way",
          "A bit uncertain - I'd want to know more first",
          "Not for me - I'd rather not be involved",
        ],
      },
      {
        id: 'q3',
        type: 'radio',
        label: 'If the cafe offered a short, paid Irish course as part of the job, interested?',
        required: true,
        options: [
          "Yes - I'd genuinely like to do that",
          'Possibly - depends how long it takes',
          "Maybe - I'd want to see it first",
          "Probably not - it's not really for me",
          "No - I'm not interested in learning Irish",
        ],
      },
      {
        id: 'q4',
        type: 'radio',
        label: 'If you were to use any Irish at work, what would you be most comfortable with?',
        required: true,
        options: [
          'A word or two if a customer started it',
          'A simple greeting',
          'A full order exchange',
          "I'd rather not use Irish at work at all",
        ],
      },
      {
        id: 'q5_open',
        type: 'text',
        label: "Anything you'd want your manager to know?",
        required: false,
        maxLength: 800,
      },
    ],
  },
  {
    id: 'customers-cafe-v1',
    title: 'Would Irish work here?',
    audience: 'customers',
    questions: [
      {
        id: 'q1',
        type: 'radio',
        label: 'How would you describe your Irish?',
        required: true,
        options: [
          'None at all',
          'A few words - slan, go raibh maith agat',
          'Enough to order a coffee',
          'More than I let on - rusty but there',
          'Conversational or fluent',
        ],
      },
      {
        id: 'q2',
        type: 'radio',
        label: 'When did you last use Irish with a stranger?',
        required: true,
        options: ['Recently - this year', 'A few years ago', 'School - and not since', 'Never'],
      },
      {
        id: 'q3',
        type: 'radio',
        label: 'If a member of staff greeted you in Irish, how would you feel?',
        required: true,
        options: [
          "Delighted - I'd try to reply",
          'Pleasantly surprised',
          'Fine either way',
          "A bit awkward - I wouldn't know what to say",
          "I'd prefer they didn't",
        ],
      },
      {
        id: 'q4',
        type: 'radio',
        label: 'If there was a sign saying Irish was welcome, would you try ordering in Irish?',
        required: true,
        options: [
          "Yes - I'd do it straight away",
          "Probably - once I'd seen someone else do it",
          "Maybe - I'd need to feel ready first",
          "Probably not - my Irish isn't good enough",
          "No - I'm happy ordering in English",
        ],
      },
      {
        id: 'q5',
        type: 'checkbox',
        label: 'What would make you more likely to use Irish here?',
        required: true,
        options: [
          'A sign on the door saying Irish is welcome',
          'Knowing the staff had some Irish',
          'A cheatsheet on the counter with key phrases',
          'Seeing other customers do it first',
          "Just knowing it wouldn't be weird",
          "Nothing - I'd just do it",
        ],
      },
      {
        id: 'q6',
        type: 'radio',
        label: 'Would it make you feel better about this place if Irish was part of how it operated?',
        required: true,
        options: [
          'Yes - it would feel more like a community place',
          "Probably - it's a nice thing to do",
          "Neutral - it wouldn't change how I feel",
          'Not really - I come for the coffee',
        ],
      },
    ],
  },
];

export const SURVEY_TEMPLATE_MAP = new Map(SURVEY_TEMPLATES.map((template) => [template.id, template]));

export function defaultTemplateKey(templateId: string) {
  if (templateId === 'staff-cafe-v1') return 'staff-appetite';
  if (templateId === 'customers-cafe-v1') return 'customers-appetite';
  return templateId;
}
