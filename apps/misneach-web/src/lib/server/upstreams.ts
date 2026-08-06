import { env } from '$env/dynamic/private';

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function splitList(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeUrl);
}

export function resolveApiBaseUrls(): string[] {
  const primary = normalizeUrl(String(env.API_INTERNAL_URL || '').trim());
  const configuredList = splitList(env.API_INTERNAL_URLS);
  const candidates = [
    primary,
    ...configuredList,
    'http://client:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ].filter(Boolean);
  return [...new Set(candidates)];
}

export function resolveWaitlistBaseUrls(): string[] {
  const primary = normalizeUrl(String(env.WAITLIST_API_URL || env.PUBLIC_API_URL || '').trim());
  const configuredList = splitList(env.WAITLIST_API_URLS);
  const candidates = [
    primary,
    ...configuredList,
    ...resolveApiBaseUrls(),
  ].filter(Boolean);
  return [...new Set(candidates)];
}

export function resolveSurveyBaseUrls(): string[] {
  const primary = normalizeUrl(String(env.SURVEYS_API_URL || env.PUBLIC_API_URL || '').trim());
  const configuredList = splitList(env.SURVEYS_API_URLS);
  const candidates = [
    primary,
    ...configuredList,
    ...resolveApiBaseUrls(),
  ].filter(Boolean);
  return [...new Set(candidates)];
}

export function resolveBusinessBaseUrls(): string[] {
  const primary = normalizeUrl(String(env.BUSINESS_INTERNAL_URL || '').trim());
  const configuredList = splitList(env.BUSINESS_INTERNAL_URLS);
  const candidates = [
    primary,
    ...configuredList,
    'http://business:3018',
    'http://127.0.0.1:3018',
    'http://localhost:3018',
  ].filter(Boolean);
  return [...new Set(candidates)];
}

export function getInternalAuthSecret(): string {
  return String(env.INTERNAL_AUTH_SECRET || '').trim();
}
