import {
  buildLessonScreensFromPayload,
  type CorePhrase,
  type LessonPayload,
  type LessonScreen,
} from '@decyphr/misneach-ui';
import tasterLesson from '../../../../../services/courses/src/content/lessons/cafe/cafe-first-encounters-lesson-1-1-conversation.json';
import type { LessonContent } from '../../../../../services/courses/src/courses/courses.types';

const bundledTasterLesson = tasterLesson as LessonContent;

function buildCoreFlow(lesson: LessonContent): CorePhrase[] {
  const coreFlow: CorePhrase[] = [];

  for (const block of lesson.blocks) {
    if (block.type !== 'dialogue') continue;

    for (const [index, turn] of (block.turns || []).entries()) {
      if (!turn.text) continue;

      coreFlow.push({
        phraseId: `${lesson.lessonSlug}:${block.id}:${index + 1}`,
        blockId: block.id,
        speaker: turn.speaker || 'Speaker',
        text: turn.text,
        pronunciation: turn.pronunciation,
        translation: turn.translation,
        retrievalPrompt: turn.translation
          ? {
              type: 'translate_to_irish',
              prompt: `How do you say: "${turn.translation}"`,
              expected: turn.text,
            }
          : undefined,
      });
    }
  }

  return coreFlow;
}

function buildTasterPayload(lesson: LessonContent): LessonPayload {
  return {
    lesson: {
      courseSlug: lesson.courseSlug,
      courseTitle: lesson.courseTitle,
      lessonSlug: lesson.lessonSlug,
      lessonTitle: lesson.lessonTitle,
      estimatedMinutes: lesson.estimatedMinutes,
      contentVersion: lesson.contentVersion,
    },
    progress: {
      status: 'not_started',
      progressPercent: 0,
      lastBlockId: lesson.blocks[0]?.id ?? null,
      contentVersion: lesson.contentVersion,
    },
    pedagogy: {
      core_flow: buildCoreFlow(lesson),
    },
    blocks: lesson.blocks,
  };
}

export function loadBundledTasterUnit(): {
  courseTitle: string;
  screens: LessonScreen[];
} {
  const lessonPayload = buildTasterPayload(bundledTasterLesson);

  const intro: LessonScreen = {
    kind: 'intro',
    id: 'unit-screen-intro',
    tag: 'Unit 1 · Coffee Shop Encounters',
    title: 'An Caife.',
    subtitle: 'A full real-world encounter — from hello to goodbye.',
    chips: ['Greetings', 'Ordering', 'Payment', 'Add-ons', 'Milk swaps', 'Real world challenge'],
  };

  const lessonScreens = buildLessonScreensFromPayload(lessonPayload, {
    idPrefix: 'unit1-1',
    includeIntro: false,
    includeRecap: false,
    includeFinal: false,
    includeFallbackNotes: false,
  });

  const final: LessonScreen = {
    kind: 'final',
    id: 'unit-screen-final',
    headline: 'Aonad 1 criochnaithe.',
    body: 'Unit 1 complete. You covered the full coffee shop encounter in Irish.',
  };

  return {
    courseTitle: bundledTasterLesson.courseTitle,
    screens: [intro, ...lessonScreens, final],
  };
}
