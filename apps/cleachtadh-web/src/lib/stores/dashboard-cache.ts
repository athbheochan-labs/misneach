import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';

export type DashboardCacheEntry = {
  data: unknown;
  cachedAt: number;
};

const SESSION_KEY = 'decyphr.dashboard.cache.v1';
const memoryStore = writable<Record<string, DashboardCacheEntry>>({});

function readSession(): Record<string, DashboardCacheEntry> {
  if (!browser) return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DashboardCacheEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSession(next: Record<string, DashboardCacheEntry>) {
  if (!browser) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // best effort
  }
}

if (browser) {
  memoryStore.set(readSession());
}

export function readDashboardCache(key: string): DashboardCacheEntry | null {
  const mem = get(memoryStore);
  if (mem[key]) return mem[key];
  const session = readSession();
  return session[key] || null;
}

export function writeDashboardCache(key: string, entry: DashboardCacheEntry) {
  memoryStore.update((current) => {
    const next = { ...current, [key]: entry };
    writeSession(next);
    return next;
  });
}

export function clearDashboardCache(key?: string) {
  if (!key) {
    memoryStore.set({});
    writeSession({});
    return;
  }

  memoryStore.update((current) => {
    const next = { ...current };
    delete next[key];
    writeSession(next);
    return next;
  });
}
