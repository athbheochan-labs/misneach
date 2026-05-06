export type JourneyGoalKey = 'lessonsCompleted' | 'mistakesCorrected' | 'flashcardsReviewed';

export type JourneyGoalCounters = Record<JourneyGoalKey, number>;

const STORAGE_KEY = 'journey-goals:v1';
const UPDATE_EVENT = 'journey-goals:updated';

const DEFAULT_COUNTERS: JourneyGoalCounters = {
  lessonsCompleted: 0,
  mistakesCorrected: 0,
  flashcardsReviewed: 0,
};

function inBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function toSafeCount(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

function normalizeCounters(value: unknown): JourneyGoalCounters {
  const raw = (value || {}) as Partial<Record<JourneyGoalKey, unknown>>;
  return {
    lessonsCompleted: toSafeCount(raw.lessonsCompleted),
    mistakesCorrected: toSafeCount(raw.mistakesCorrected),
    flashcardsReviewed: toSafeCount(raw.flashcardsReviewed),
  };
}

function emitUpdate(counters: JourneyGoalCounters) {
  if (!inBrowser()) return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { counters } }));
}

function writeCounters(counters: JourneyGoalCounters) {
  if (!inBrowser()) return counters;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  emitUpdate(counters);
  return counters;
}

export function readJourneyGoalCounters(): JourneyGoalCounters {
  if (!inBrowser()) return { ...DEFAULT_COUNTERS };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COUNTERS };
    return normalizeCounters(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_COUNTERS };
  }
}

export function incrementJourneyGoalCounter(key: JourneyGoalKey, delta = 1): JourneyGoalCounters {
  const current = readJourneyGoalCounters();
  const nextValue = Math.max(0, current[key] + toSafeCount(delta || 0));
  return writeCounters({ ...current, [key]: nextValue });
}

export function syncJourneyGoalCounter(key: JourneyGoalKey, value: number): JourneyGoalCounters {
  const current = readJourneyGoalCounters();
  const nextValue = Math.max(current[key], toSafeCount(value));
  if (nextValue === current[key]) return current;
  return writeCounters({ ...current, [key]: nextValue });
}

export function subscribeJourneyGoalCounters(listener: (counters: JourneyGoalCounters) => void) {
  if (!inBrowser()) {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ counters?: JourneyGoalCounters }>;
    listener(normalizeCounters(customEvent.detail?.counters));
  };

  window.addEventListener(UPDATE_EVENT, handler);
  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
  };
}
