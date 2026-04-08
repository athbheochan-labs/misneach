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
  clear(prefix?: string): Promise<void>;
}

const STORAGE_KEY_PREFIX = 'misneach.auth.';

type CapacitorSecurePlugin = {
  get?: (options: { key: string }) => Promise<{ value?: string | null } | string | null>;
  getItem?: (options: { key: string }) => Promise<{ value?: string | null } | string | null>;
  set?: (options: { key: string; value: string }) => Promise<void>;
  setItem?: (options: { key: string; value: string }) => Promise<void>;
  remove?: (options: { key: string }) => Promise<void>;
  removeItem?: (options: { key: string }) => Promise<void>;
  clear?: () => Promise<void>;
};

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

function hasNativeCapacitorRuntime(): boolean {
  if (!isBrowser()) return false;
  const maybeCapacitor = (window as any)?.Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.());
}

function getCapacitorSecurePlugin(): CapacitorSecurePlugin | null {
  if (!isBrowser()) return null;
  const plugins = (window as any)?.Capacitor?.Plugins;
  return (plugins?.SecureStoragePlugin ?? plugins?.SecureStorage) || null;
}

async function invokeGet(plugin: CapacitorSecurePlugin, key: string): Promise<string | null> {
  const fn = plugin.get ?? plugin.getItem;
  if (!fn) return null;
  const raw = await fn({ key });
  if (typeof raw === 'string') return raw;
  return typeof raw?.value === 'string' ? raw.value : null;
}

async function invokeSet(plugin: CapacitorSecurePlugin, key: string, value: string): Promise<void> {
  const fn = plugin.set ?? plugin.setItem;
  if (!fn) throw new Error('Secure storage plugin does not support set');
  await fn({ key, value });
}

async function invokeRemove(plugin: CapacitorSecurePlugin, key: string): Promise<void> {
  const fn = plugin.remove ?? plugin.removeItem;
  if (!fn) return;
  await fn({ key });
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

  async clear(prefix?: string): Promise<void> {
    const storage = safeStorage();
    if (!storage) return;
    if (!prefix) {
      storage.clear();
      return;
    }

    const keysToDelete: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) keysToDelete.push(key);
    }
    for (const key of keysToDelete) {
      storage.removeItem(key);
    }
  }
}

class CapacitorSecureStorageAdapter implements MobileSessionStorage {
  constructor(private readonly plugin: CapacitorSecurePlugin) {}

  async get(key: string): Promise<string | null> {
    return invokeGet(this.plugin, key);
  }

  async set(key: string, value: string): Promise<void> {
    await invokeSet(this.plugin, key, value);
  }

  async remove(key: string): Promise<void> {
    await invokeRemove(this.plugin, key);
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix && this.plugin.clear) {
      await this.plugin.clear();
      return;
    }
    if (!prefix) return;
    // Prefix-scoped clear is intentionally no-op for native plugin
    // because most implementations do not support key enumeration.
  }
}

export function createMobileSessionStorage(): MobileSessionStorage {
  if (hasNativeCapacitorRuntime()) {
    const plugin = getCapacitorSecurePlugin();
    if (plugin) return new CapacitorSecureStorageAdapter(plugin);
  }
  return new BrowserLocalStorageAdapter();
}

const TOKEN_STORAGE_KEY = `${STORAGE_KEY_PREFIX}token_bundle`;

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

