import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';

export type LessonNavigationCache = {
  previousLessonHref: string;
  nextLessonHref: string;
  finishUnitHref: string;
};

export type LessonPlayerCacheEntry = {
  payload: unknown;
  screens: unknown[];
  navigation: LessonNavigationCache;
  cachedAt: number;
};

const SESSION_KEY = 'decyphr.lessonPlayer.cache.v1';
const cacheStore = writable<Record<string, LessonPlayerCacheEntry>>({});

function readSession(): Record<string, LessonPlayerCacheEntry> {
  if (!browser) return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LessonPlayerCacheEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSession(next: Record<string, LessonPlayerCacheEntry>) {
  if (!browser) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // best effort
  }
}

if (browser) {
  cacheStore.set(readSession());
}

export function readLessonPlayerCache(key: string): LessonPlayerCacheEntry | null {
  const mem = get(cacheStore);
  if (mem[key]) return mem[key];
  const session = readSession();
  return session[key] || null;
}

export function writeLessonPlayerCache(key: string, entry: LessonPlayerCacheEntry) {
  cacheStore.update((current) => {
    const next = { ...current, [key]: entry };
    writeSession(next);
    return next;
  });
}

export function clearLessonPlayerCache(key?: string) {
  if (!key) {
    cacheStore.set({});
    writeSession({});
    return;
  }

  cacheStore.update((current) => {
    const next = { ...current };
    delete next[key];
    writeSession(next);
    return next;
  });
}
