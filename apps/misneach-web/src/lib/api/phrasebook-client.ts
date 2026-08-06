import { apiFetch } from '$lib/api/client';

export type PhrasebookPhrase = {
  id: number | string;
  text: string;
  translation?: string | null;
  pronunciation?: string | null;
  notes?: string | null;
  source?: string | null;
  inPractice?: boolean;
  inFlashcards?: boolean;
  category?: string | null;
  groupName?: string | null;
};

export type PhrasebookSummary = {
  total: number;
  inPractice: number;
  inFlashcards: number;
  own: number;
};

export type PhrasebookPage = {
  items: PhrasebookPhrase[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: PhrasebookSummary;
};

export type CoursePhrasebookQuery = {
  search?: string;
  sort?: 'newest' | 'oldest' | 'alphabetical';
  page?: number;
  pageSize?: number;
};

async function parseJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || fallback);
  }
  return data as T;
}

export async function getCoursePhrasebook(query: CoursePhrasebookQuery = {}) {
  const params = new URLSearchParams({
    filter: 'course',
    sort: query.sort || 'newest',
    page: String(query.page || 1),
    pageSize: String(query.pageSize || 24),
  });

  const search = String(query.search || '').trim();
  if (search) params.set('search', search);

  const res = await apiFetch(`/api/phrasebook/list?${params.toString()}`, { cache: 'no-store' });
  return parseJsonOrThrow<PhrasebookPage>(res, 'Unable to load course phrases');
}
