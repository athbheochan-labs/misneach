import { apiFetch } from '$lib/api/client';
import { compareLessonsByHierarchy } from '$lib/course-order';

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export type CourseLesson = {
  lessonSlug: string;
  lessonTitle: string;
  moduleKey?: string;
  moduleName?: string;
  unitKey?: string;
  unitName?: string;
  group?: string;
  order: number;
  estimatedMinutes: number;
  summary?: string | null;
  contentVersion: string;
  progress: {
    status: LessonProgressStatus;
    progressPercent: number;
    lastBlockId: string | null;
    lastSeenAt?: string | null;
  };
};

export type CourseCatalogItem = {
  courseSlug: string;
  courseTitle: string;
  lang: string;
  summary?: string | null;
  contentVersion: string;
  lessons: CourseLesson[];
  summaryProgress: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
  };
  resumeTarget: {
    courseSlug: string;
    lessonSlug: string;
    lastBlockId: string | null;
  } | null;
};

export type CourseCatalog = {
  generatedAt: string;
  contentVersion: string;
  activityStreak?: {
    currentDays: number;
    lastActivityDate: string | null;
  };
  courses: CourseCatalogItem[];
};

export type CourseUnit = {
  unitNumber: number;
  unitKey: string;
  unitName: string;
  lessons: CourseLesson[];
  completedLessons: number;
  totalLessons: number;
  percent: number;
  status: LessonProgressStatus;
  href: string;
};

export async function getCourseCatalog(): Promise<CourseCatalog> {
  const res = await apiFetch('/api/courses/catalog', { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Unable to load courses');
  }
  return data as CourseCatalog;
}

export function lessonHref(courseSlug: string, lesson: CourseLesson) {
  return `/courses/${courseSlug}/${lesson.lessonSlug}`;
}

export function selectCurrentCourse(courses: CourseCatalogItem[]): CourseCatalogItem | null {
  if (!courses.length) return null;

  const timestamp = (course: CourseCatalogItem) =>
    Math.max(
      0,
      ...course.lessons.map((lesson) =>
        lesson.progress.lastSeenAt ? new Date(lesson.progress.lastSeenAt).getTime() || 0 : 0,
      ),
    );

  const inProgress = courses.filter((course) =>
    course.lessons.some((lesson) => lesson.progress.status === 'in_progress'),
  );
  if (inProgress.length) return inProgress.sort((a, b) => timestamp(b) - timestamp(a))[0];

  const withActivity = courses.filter((course) => timestamp(course) > 0);
  if (withActivity.length) return withActivity.sort((a, b) => timestamp(b) - timestamp(a))[0];

  return courses.find((course) => course.summaryProgress.percent < 100) || courses[0];
}

export function nextLessonForCourse(course: CourseCatalogItem | null): CourseLesson | null {
  if (!course?.lessons.length) return null;
  if (course.resumeTarget?.lessonSlug) {
    const resume = course.lessons.find((lesson) => lesson.lessonSlug === course.resumeTarget?.lessonSlug);
    if (resume) return resume;
  }
  return course.lessons.find((lesson) => lesson.progress.status !== 'completed') || course.lessons[0];
}

function unitNumberFromLesson(lesson: CourseLesson, fallback: number) {
  const match = /(?:^|-)lesson-(\d+)(?:-|$)/.exec(String(lesson.lessonSlug || ''));
  const parsed = Number(match?.[1] || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function unitsForCourse(course: CourseCatalogItem | null): CourseUnit[] {
  if (!course) return [];

  const byUnit = new Map<string, CourseUnit>();
  const orderedLessons = course.lessons.slice().sort(compareLessonsByHierarchy);

  for (const lesson of orderedLessons) {
    const unitNumber = unitNumberFromLesson(lesson, byUnit.size + 1);
    const unitKey = lesson.unitKey || `unit-${unitNumber}`;
    const unitName = lesson.unitName || `Unit ${unitNumber}`;
    const key = `${unitNumber}:${unitKey}`;
    const current = byUnit.get(key) || {
      unitNumber,
      unitKey,
      unitName,
      lessons: [],
      completedLessons: 0,
      totalLessons: 0,
      percent: 0,
      status: 'not_started' as LessonProgressStatus,
      href: lessonHref(course.courseSlug, lesson),
    };
    current.lessons.push(lesson);
    byUnit.set(key, current);
  }

  return Array.from(byUnit.values()).map((unit) => {
    const completedLessons = unit.lessons.filter((lesson) => lesson.progress.status === 'completed').length;
    const started = unit.lessons.some(
      (lesson) => lesson.progress.status === 'in_progress' || lesson.progress.progressPercent > 0,
    );
    const firstOpen = unit.lessons.find((lesson) => lesson.progress.status !== 'completed') || unit.lessons[0];
    const totalProgress = unit.lessons.reduce(
      (sum, lesson) => sum + Math.max(0, Math.min(100, Number(lesson.progress.progressPercent) || 0)),
      0,
    );

    return {
      ...unit,
      completedLessons,
      totalLessons: unit.lessons.length,
      percent: unit.lessons.length ? Math.round(totalProgress / unit.lessons.length) : 0,
      status: completedLessons === unit.lessons.length ? 'completed' : started ? 'in_progress' : 'not_started',
      href: firstOpen ? lessonHref(course.courseSlug, firstOpen) : unit.href,
    };
  });
}
