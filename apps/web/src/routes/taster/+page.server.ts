import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  buildLessonScreensFromPayload,
  type LessonPayload,
  type LessonScreen,
} from '@decyphr/misneach-ui';
import type { PageServerLoad } from './$types';

async function resolveLessonsDir() {
  const relative = 'apps/courses/src/content/lessons/cafe';
  const candidates = [
    path.resolve('/app', relative),
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), '..', relative),
    path.resolve(process.cwd(), '..', '..', relative),
    path.resolve(process.cwd(), '..', '..', '..', relative),
  ];

  for (const candidate of candidates) {
    try {
      await readdir(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  return null;
}

function parseOrderFromSlug(fileName: string) {
  const match = fileName.match(/lesson-(\d+)-(\d+)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1] || '0', 10) * 100 + Number.parseInt(match[2] || '0', 10);
}

export const load: PageServerLoad = async () => {
  const lessonsDir = await resolveLessonsDir();
  const courseTitle = 'Coffee Shop Encounters';

  let screens: LessonScreen[] = [];

  try {
    if (!lessonsDir) {
      throw new Error('Unable to locate compiled course lesson content directory');
    }

    const files = (await readdir(lessonsDir))
      .filter((name) => /^cafe-first-encounters-lesson-1-\d+.*\.json$/i.test(name))
      .sort((a, b) => parseOrderFromSlug(a) - parseOrderFromSlug(b));

    if (!files.length) {
      throw new Error(`No lesson JSON files found in ${lessonsDir}`);
    }

    const lessonPayloads: LessonPayload[] = [];

    for (const file of files) {
      const fullPath = path.join(lessonsDir, file);
      const source = await readFile(fullPath, 'utf8');
      const raw = JSON.parse(source) as Record<string, unknown>;

      lessonPayloads.push({
        lesson: {
          courseSlug: String(raw.courseSlug || 'cafe'),
          courseTitle: String(raw.courseTitle || courseTitle),
          lessonSlug: String(raw.lessonSlug || file.replace(/\.json$/i, '')),
          lessonTitle: String(raw.lessonTitle || raw.title || file.replace(/\.json$/i, '')),
          estimatedMinutes: Number(raw.estimatedMinutes || 4),
          contentVersion: 'static-json',
        },
        progress: {
          status: 'not_started',
          progressPercent: 0,
          lastBlockId: null,
          contentVersion: 'static-json',
        },
        pedagogy: raw.pedagogy as LessonPayload['pedagogy'],
        blocks: (raw.blocks || []) as LessonPayload['blocks'],
      });
    }

    const intro: LessonScreen = {
      kind: 'intro',
      id: 'unit-screen-intro',
      tag: 'Unit 1 · Coffee Shop Encounters',
      title: 'An Caife.',
      subtitle: 'A full real-world encounter — from hello to goodbye.',
      chips: ['Greetings', 'Ordering', 'Payment', 'Add-ons', 'Milk swaps', 'Real world challenge'],
    };

    const allLessonScreens = lessonPayloads.flatMap((payload, idx) =>
      buildLessonScreensFromPayload(payload, {
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
