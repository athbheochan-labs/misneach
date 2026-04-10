import { browser } from '$app/environment';
import { readable } from 'svelte/store';

const initialOnline = browser ? navigator.onLine : true;

export const isOnline = readable<boolean>(initialOnline, (set) => {
  if (!browser) return () => undefined;

  const update = () => set(navigator.onLine);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();

  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
});

export function isLikelyNetworkError(error: unknown): boolean {
  if (browser && navigator.onLine === false) return true;
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed')
  );
}
