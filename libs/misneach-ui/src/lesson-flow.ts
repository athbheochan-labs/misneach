export type LessonProgress = {
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  lastBlockId: string | null;
  contentVersion?: string;
};

export type CorePhrase = {
  phraseId: string;
  blockId: string;
  speaker: string;
  text: string;
  pronunciation?: string;
  translation?: string;
  hint?: string;
  deepExplanation?: string;
  retrievalPrompt?: {
    type: 'translate_to_irish';
    prompt: string;
    expected: string;
  };
};

export type LessonBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'dialogue' | 'list';
  level?: number;
  text?: string;
  items?: string[];
  turns?: Array<{
    speaker: string;
    text: string;
    pronunciation?: string;
    translation?: string;
  }>;
};

export type LessonPayload = {
  lesson: {
    courseSlug: string;
    courseTitle: string;
    lessonSlug: string;
    lessonTitle: string;
    estimatedMinutes: number;
    contentVersion: string;
  };
  progress: LessonProgress;
  pedagogy?: {
    core_flow?: CorePhrase[];
  };
  blocks?: LessonBlock[];
};

export type VocabRow = { irish: string; pronunciation: string; english: string };
export type VocabSection = { title: string; rows: VocabRow[] };

export type QuizOption = {
  label: string;
  text: string;
  sub: string;
  correct: boolean;
};

export type LessonScreen =
  | {
      kind: 'intro';
      id: string;
      sourceId?: string;
      tag: string;
      title: string;
      subtitle: string;
      chips: string[];
    }
  | {
      kind: 'conversation';
      id: string;
      sourceId?: string;
      tag: string;
      lines: Array<{ speaker: string; text: string; pronunciation?: string; translation?: string; side?: 'left' | 'right' }>;
    }
  | {
      kind: 'phrase';
      id: string;
      sourceId?: string;
      tag: string;
      irish: string;
      pronunciation?: string;
      english?: string;
    }
  | {
      kind: 'explain';
      id: string;
      sourceId?: string;
      quoteIrish?: string;
      quotePron?: string;
      quoteEnglish?: string;
      paragraphs: string[];
    }
  | {
      kind: 'quiz';
      id: string;
      sourceId?: string;
      prompt: string;
      sub: string;
      options: QuizOption[];
    }
  | {
      kind: 'vocab';
      id: string;
      sourceId?: string;
      tag: string;
      sections: VocabSection[];
    }
  | {
      kind: 'recap';
      id: string;
      sourceId?: string;
      headline: string;
      body: string;
      chips: string[];
    }
  | {
      kind: 'final';
      id: string;
      sourceId?: string;
      headline: string;
      body: string;
    };

export type MarkdownLesson = {
  slug: string;
  title: string;
  estimatedMinutes: number;
  body: string;
  courseTitle: string;
  courseSlug?: string;
};

function normalizeText(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseVocabDetailsHtml(text: string): VocabSection | null {
  if (!text.includes('<details')) return null;
  const summaryMatch = text.match(/<summary[^>]*>(.*?)<\/summary>/i);
  if (!summaryMatch) return null;

  const summaryRaw = summaryMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!summaryRaw) return null;

  const rows: VocabRow[] = [];
  const liMatches = text.matchAll(/<li>([\s\S]*?)<\/li>/gi);

  for (const li of liMatches) {
    const raw = li[1] || '';
    const phraseMatch = raw.match(/<strong>(.*?)<\/strong>/i);
    const phrase = phraseMatch ? normalizeText(phraseMatch[1].replace(/<[^>]+>/g, ' ')) : '';
    const remainder = normalizeText(raw.replace(/<[^>]+>/g, ' '));
    const pronMatch = remainder.match(/\(([^)]+)\)/);
    const pronunciation = pronMatch ? normalizeText(pronMatch[1]) : '';
    const english = normalizeText(remainder.replace(/^.*?:\s*/, ''));

    if (!phrase) continue;
    rows.push({
      irish: phrase,
      pronunciation,
      english: english || '',
    });
  }

  return rows.length ? { title: summaryRaw, rows } : null;
}

function splitIntoParagraphScreens(paragraphs: string[]) {
  const screens: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += 2) {
    screens.push(paragraphs.slice(i, i + 2));
  }
  return screens;
}

function buildQuizOptions(expected: string, pool: string[]) {
  const cleanExpected = normalizeText(expected);
  const distractors = Array.from(new Set(pool.map(normalizeText).filter((item) => item && item !== cleanExpected)));
  const picked = distractors.slice(0, 2);
  const fallbackDistractors = ['Dia duit', 'Go raibh maith agat', 'Le do thoil'].filter(
    (item) => normalizeText(item) !== cleanExpected && !picked.includes(item),
  );
  const mix = [cleanExpected, ...picked, ...fallbackDistractors].slice(0, 3);

  while (mix.length < 3) {
    mix.push(`Option ${mix.length + 1}`);
  }

  const labels = ['A', 'B', 'C'];
  return mix
    .sort(() => Math.random() - 0.5)
    .map((item, idx) => ({
      label: labels[idx],
      text: item,
      sub: '',
      correct: item === cleanExpected,
    }));
}

function extractDialogueLines(source: LessonPayload) {
  const fromCore = (source.pedagogy?.core_flow || []).map((row) => ({
    speaker: row.speaker,
    text: row.text,
    pronunciation: row.pronunciation,
    translation: row.translation,
    side: /customer|you/i.test(row.speaker) ? ('right' as const) : ('left' as const),
    sourceId: row.blockId,
  }));

  if (fromCore.length > 0) return fromCore;

  const fromBlocks: Array<{
    speaker: string;
    text: string;
    pronunciation?: string;
    translation?: string;
    side: 'left' | 'right';
    sourceId: string;
  }> = [];

  for (const block of source.blocks || []) {
    if (block.type !== 'dialogue' || !Array.isArray(block.turns)) continue;
    for (const turn of block.turns) {
      fromBlocks.push({
        speaker: turn.speaker,
        text: turn.text,
        pronunciation: turn.pronunciation,
        translation: turn.translation,
        side: /customer|you/i.test(turn.speaker) ? 'right' : 'left',
        sourceId: block.id,
      });
    }
  }

  return fromBlocks;
}

function prefixed(prefix: string | undefined, id: string) {
  if (!prefix) return id;
  return `${prefix}-${id}`;
}

export function buildLessonScreensFromPayload(
  source: LessonPayload,
  opts: {
    idPrefix?: string;
    includeIntro?: boolean;
    includeFinal?: boolean;
    includeRecap?: boolean;
    includeFallbackNotes?: boolean;
  } = {},
): LessonScreen[] {
  const built: LessonScreen[] = [];
  const dialogueLines = extractDialogueLines(source);
  const coreFlow = source.pedagogy?.core_flow || [];
  const lessonBlocks = source.blocks || [];
  const includeIntro = opts.includeIntro ?? true;
  const includeFinal = opts.includeFinal ?? true;
  const includeRecap = opts.includeRecap ?? true;
  const includeFallbackNotes = opts.includeFallbackNotes ?? true;

  const chips = [
    source.lesson.courseTitle,
    `${source.lesson.estimatedMinutes || 4} min`,
    coreFlow.length > 0 ? `${coreFlow.length} phrase${coreFlow.length === 1 ? '' : 's'}` : `${dialogueLines.length} lines`,
  ];

  if (includeIntro) {
    built.push({
      kind: 'intro',
      id: prefixed(opts.idPrefix, 'screen-intro'),
      tag: 'Lesson',
      title: source.lesson.lessonTitle,
      subtitle: source.lesson.courseTitle,
      chips,
    });
  }

  if (dialogueLines.length > 1) {
    built.push({
      kind: 'conversation',
      id: prefixed(opts.idPrefix, 'screen-conversation'),
      sourceId: dialogueLines[0]?.sourceId,
      tag: 'Read through first',
      lines: dialogueLines,
    });
  }

  if (coreFlow.length > 0) {
    const pool = coreFlow.map((row) => row.text);
    for (const [rowIndex, row] of coreFlow.entries()) {
      const phraseKey = `${rowIndex}-${row.phraseId || row.blockId || 'phrase'}`;
      built.push({
        kind: 'phrase',
        id: prefixed(opts.idPrefix, `screen-phrase-${phraseKey}`),
        sourceId: row.blockId,
        tag: row.speaker,
        irish: row.text,
        pronunciation: row.pronunciation,
        english: row.translation,
      });

      const explainParts = [row.hint, row.deepExplanation].filter((value): value is string => Boolean(value && value.trim()));
      if (explainParts.length > 0) {
        built.push({
          kind: 'explain',
          id: prefixed(opts.idPrefix, `screen-explain-${phraseKey}`),
          sourceId: row.blockId,
          quoteIrish: row.text,
          quotePron: row.pronunciation,
          quoteEnglish: row.translation,
          paragraphs: explainParts,
        });
      }

      if (row.retrievalPrompt?.expected) {
        built.push({
          kind: 'quiz',
          id: prefixed(opts.idPrefix, `screen-quiz-${phraseKey}`),
          sourceId: row.blockId,
          prompt: row.retrievalPrompt.prompt || 'Choose the best answer',
          sub: 'Answer to continue',
          options: buildQuizOptions(row.retrievalPrompt.expected, pool),
        });
      }
    }
  } else {
    const noteParagraphs = lessonBlocks.flatMap((block) => {
      if (block.type === 'paragraph' && typeof block.text === 'string' && !String(block.text).includes('<details')) {
        return [{ id: block.id, text: String(block.text) }];
      }

      if (block.type === 'heading' && typeof block.text === 'string' && String(block.text).trim()) {
        return [{ id: block.id, text: `**${String(block.text).trim()}**` }];
      }

      if (block.type === 'list' && Array.isArray(block.items) && block.items.length > 0) {
        return block.items
          .map((item, idx) => String(item || '').trim())
          .filter(Boolean)
          .map((item, idx) => ({ id: `${block.id}-item-${idx + 1}`, text: `- ${item}` }));
      }

      return [];
    });

    for (const block of lessonBlocks) {
      if (block.type === 'dialogue' && Array.isArray(block.turns) && block.turns.length > 0) {
        const turn = block.turns[0];
        built.push({
          kind: 'phrase',
          id: prefixed(opts.idPrefix, `screen-dialogue-${block.id}`),
          sourceId: block.id,
          tag: turn.speaker,
          irish: turn.text,
          pronunciation: turn.pronunciation,
          english: turn.translation,
        });
      }
    }

    if (includeFallbackNotes) {
      const chunks = splitIntoParagraphScreens(noteParagraphs.map((item) => item.text));
      chunks.forEach((chunk, idx) => {
        built.push({
          kind: 'explain',
          id: prefixed(opts.idPrefix, `screen-notes-${idx + 1}`),
          sourceId: noteParagraphs[idx * 2]?.id,
          paragraphs: chunk,
        });
      });
    }
  }

  const vocabSections = lessonBlocks
    .filter((block) => block.type === 'paragraph' && typeof block.text === 'string')
    .map((block) => parseVocabDetailsHtml(String(block.text)))
    .filter((item): item is VocabSection => Boolean(item));

  if (vocabSections.length > 0) {
    built.push({
      kind: 'vocab',
      id: prefixed(opts.idPrefix, 'screen-vocab'),
      sourceId: 'vocab',
      tag: 'Vocabulary reference',
      sections: vocabSections,
    });
  }

  if (includeRecap) {
    built.push({
      kind: 'recap',
      id: prefixed(opts.idPrefix, 'screen-recap'),
      headline: 'You now have the full pattern.',
      body: 'You can use these phrases at a real counter today. One phrase is enough to make the lesson real.',
      chips: ['Greeting', 'Ordering', 'Payment', 'Goodbye'],
    });
  }

  if (includeFinal) {
    built.push({
      kind: 'final',
      id: prefixed(opts.idPrefix, 'screen-final'),
      headline: 'Criochnaithe.',
      body: 'Lesson complete. Move to the next step in your journey.',
    });
  }

  return built;
}

function markdownToBlocks(body: string): LessonBlock[] {
  const sections = String(body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const blocks: LessonBlock[] = [];
  let blockIndex = 0;
  const nextId = () => `md-${++blockIndex}`;

  for (const section of sections) {
    const lines = section.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;

    if (lines[0].startsWith('# ')) {
      blocks.push({ id: nextId(), type: 'heading', level: 1, text: lines[0].slice(2).trim() });
      continue;
    }

    if (lines[0].startsWith('- ') && lines.slice(1).every((line) => line.startsWith('> '))) {
      const speaker = lines[0].slice(2).trim();
      const turns = lines.slice(1).map((line) => line.slice(2).trim()).filter(Boolean);
      if (turns[0]) {
        blocks.push({
          id: nextId(),
          type: 'dialogue',
          turns: [
            {
              speaker,
              text: turns[0] || '',
              pronunciation: turns[1] || '',
              translation: turns[2] || '',
            },
          ],
        });
      }
      continue;
    }

    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({
        id: nextId(),
        type: 'list',
        items: lines.map((line) => line.slice(2).trim()),
      });
      continue;
    }

    blocks.push({
      id: nextId(),
      type: 'paragraph',
      text: lines.join(' '),
    });
  }

  return blocks;
}

export function buildUnitScreensFromMarkdownLessons(
  lessons: MarkdownLesson[],
  opts: {
    includeGlobalIntro?: boolean;
    includeGlobalFinal?: boolean;
    courseTitle?: string;
  } = {},
): LessonScreen[] {
  const includeGlobalIntro = opts.includeGlobalIntro ?? true;
  const includeGlobalFinal = opts.includeGlobalFinal ?? true;
  const courseTitle = opts.courseTitle || lessons[0]?.courseTitle || 'Coffee Shop Encounters';

  const screens: LessonScreen[] = [];

  if (includeGlobalIntro) {
    screens.push({
      kind: 'intro',
      id: 'unit-screen-intro',
      tag: 'Unit 1',
      title: courseTitle,
      subtitle: `${lessons.length} lesson${lessons.length === 1 ? '' : 's'} in this unit`,
      chips: ['Conversation-first', 'Real scenarios', 'Out loud'],
    });
  }

  lessons.forEach((lesson, index) => {
    const payload: LessonPayload = {
      lesson: {
        courseSlug: lesson.courseSlug || 'cafe',
        courseTitle: lesson.courseTitle,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        estimatedMinutes: lesson.estimatedMinutes,
        contentVersion: 'markdown',
      },
      progress: {
        status: 'not_started',
        progressPercent: 0,
        lastBlockId: null,
        contentVersion: 'markdown',
      },
      blocks: markdownToBlocks(lesson.body),
      pedagogy: { core_flow: [] },
    };

    screens.push(
      ...buildLessonScreensFromPayload(payload, {
        idPrefix: `unit-${index + 1}`,
        includeFinal: false,
        includeRecap: true,
      }),
    );
  });

  if (includeGlobalFinal) {
    screens.push({
      kind: 'final',
      id: 'unit-screen-final',
      headline: "That's not nothing. That's a start.",
      body: 'You completed the first unit. Keep going whenever you are ready.',
    });
  }

  return screens;
}
