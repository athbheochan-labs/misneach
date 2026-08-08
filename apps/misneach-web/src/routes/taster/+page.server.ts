import { loadBundledTasterUnit } from '$lib/server/taster-content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    return loadBundledTasterUnit();
  } catch (error) {
    console.error('Failed to load taster unit screens', error);

    return {
      courseTitle: 'Coffee Shop Encounters',
      screens: [],
    };
  }
};
