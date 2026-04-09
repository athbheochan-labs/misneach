import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  // In bundled mobile mode we cannot rely on server locals.
  return { auth: null };
};
