export type AuthSessionRecord = {
  accessToken: string;
  refreshToken: string;
  expiresInSec?: number;
  issuedAtEpochSec?: number;
};

export interface MobileSessionStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const STORAGE_KEY_PREFIX = 'misneach.auth.';
const TOKEN_STORAGE_KEY = `${STORAGE_KEY_PREFIX}token_bundle`;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function safeStorage(): Storage | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

class BrowserLocalStorageAdapter implements MobileSessionStorage {
  async get(key: string): Promise<string | null> {
    const storage = safeStorage();
    if (!storage) return null;
    return storage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    const storage = safeStorage();
    if (!storage) return;
    storage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    const storage = safeStorage();
    if (!storage) return;
    storage.removeItem(key);
  }
}

export function createMobileSessionStorage(): MobileSessionStorage {
  return new BrowserLocalStorageAdapter();
}

export async function saveAuthSession(record: AuthSessionRecord): Promise<void> {
  const storage = createMobileSessionStorage();
  await storage.set(TOKEN_STORAGE_KEY, JSON.stringify(record));
}

export async function loadAuthSession(): Promise<AuthSessionRecord | null> {
  const storage = createMobileSessionStorage();
  const raw = await storage.get(TOKEN_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSessionRecord>;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresInSec: parsed.expiresInSec,
      issuedAtEpochSec: parsed.issuedAtEpochSec,
    };
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  const storage = createMobileSessionStorage();
  await storage.remove(TOKEN_STORAGE_KEY);
}
