import {
  buildLessonScreensFromPayload,
  type LessonPayload,
  type LessonScreen,
} from '@decyphr/misneach-ui';
import { nestFetch } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  let courseTitle = 'Coffee Shop Encounters';

  let screens: LessonScreen[] = [];

  try {
    const response = await nestFetch(event, '/courses/taster', { method: 'GET' }, false);
    if (!response.ok) {
      throw new Error(`Failed to load taster content (${response.status})`);
    }

    const payload = (await response.json()) as {
      lesson?: Record<string, unknown>;
      progress?: LessonPayload['progress'];
      pedagogy?: LessonPayload['pedagogy'];
    };

    const lesson = payload.lesson || {};
    const blocks = Array.isArray(lesson['blocks']) ? (lesson['blocks'] as LessonPayload['blocks']) : [];

    if (!blocks.length) {
      throw new Error('Taster lesson returned no content blocks');
    }

    courseTitle = String(lesson.courseTitle || courseTitle);

    const lessonPayloads: LessonPayload[] = [
      {
        lesson: {
          courseSlug: String(lesson.courseSlug || 'cafe'),
          courseTitle,
          lessonSlug: String(lesson.lessonSlug || 'taster'),
          lessonTitle: String(lesson.lessonTitle || 'Taster Lesson'),
          estimatedMinutes: Number(lesson.estimatedMinutes || 4),
          contentVersion: String(lesson.contentVersion || 'taster'),
        },
        progress: payload.progress || {
          status: 'not_started',
          progressPercent: 0,
          lastBlockId: null,
          contentVersion: String(lesson.contentVersion || 'taster'),
        },
        pedagogy: payload.pedagogy,
        blocks,
      },
    ];

    const intro: LessonScreen = {
      kind: 'intro',
      id: 'unit-screen-intro',
      tag: 'Unit 1 · Coffee Shop Encounters',
      title: 'An Caife.',
      subtitle: 'A full real-world encounter — from hello to goodbye.',
      chips: ['Greetings', 'Ordering', 'Payment', 'Add-ons', 'Milk swaps', 'Real world challenge'],
    };

    const allLessonScreens = lessonPayloads.flatMap((lessonPayload, idx) =>
      buildLessonScreensFromPayload(lessonPayload, {
        idPrefix: `unit1-${idx + 1}`,
        includeIntro: false,
        includeRecap: false,
        includeFinal: false,
        includeFallbackNotes: false,
      }),
    );

    const final: LessonScreen = {
      kind: 'final',
      id: 'unit-screen-final',
      headline: 'Aonad 1 criochnaithe.',
      body: 'Unit 1 complete. You covered the full coffee shop encounter in Irish.',
    };

    screens = [intro, ...allLessonScreens, final];
  } catch (error) {
    console.error('Failed to load taster unit screens', error);
    screens = [];
  }

  return {
    courseTitle,
    screens,
  };
};
