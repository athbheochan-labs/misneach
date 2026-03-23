import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
  throw redirect(307, `/survey/staff/appetite${url.search}`);
};
