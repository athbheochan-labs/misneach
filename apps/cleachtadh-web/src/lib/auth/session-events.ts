type SessionEventType =
  | 'refresh_started'
  | 'refresh_succeeded'
  | 'refresh_failed'
  | 'session_invalidated'
  | 'session_unavailable';

type SessionEvent = {
  type: SessionEventType;
  at: string;
  details?: Record<string, unknown>;
};

const STORAGE_KEY = 'misneach.auth.session_events';
const MAX_EVENTS = 50;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function recordSessionEvent(
  type: SessionEventType,
  details?: Record<string, unknown>,
) {
  const event: SessionEvent = {
    type,
    at: new Date().toISOString(),
    details,
  };

  console.info('[auth-session]', event);

  if (!canUseStorage()) return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as SessionEvent[]) : [];
    const next = [...existing, event].slice(-MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}
