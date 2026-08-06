import { apiFetch } from '$lib/api/client';

export type FlashcardDeck = {
  id: number;
  clientId: string;
  name: string;
  description: string | null;
  language: string;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  dueCount: number;
};

export type Flashcard = {
  id: number;
  packId: number;
  front: string;
  back: string;
  pronunciation: string | null;
  notes: string | null;
  dueAt: string;
  lastReviewedAt?: string | null;
  reviewCount?: number;
};

export type FlashcardHealthRow = {
  cardId: number;
  front: string;
  back: string;
  pct: number;
  due: boolean;
  dueAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
};

export type FlashcardHealth = {
  rows: FlashcardHealthRow[];
  dueCardCount: number;
  lookedBackDays: number;
  generatedAt: string;
};

export type CourseFlashcardSummary = {
  decks: FlashcardDeck[];
  dueCount: number;
  cardCount: number;
  notDueCount: number;
  sampleDueCards: Flashcard[];
};

export function isCourseFlashcardDeck(deck: Pick<FlashcardDeck, 'name' | 'description'>) {
  const name = String(deck.name || '').trim();
  const description = String(deck.description || '').trim();
  return name.startsWith('Unit:') || /^Auto deck for /i.test(description);
}

async function parseJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || fallback);
  }
  return data as T;
}

export async function getFlashcardDecks(): Promise<FlashcardDeck[]> {
  const res = await apiFetch('/api/flashcards/decks', { cache: 'no-store' });
  return parseJsonOrThrow<FlashcardDeck[]>(res, 'Unable to load flashcard decks');
}

export async function getDueFlashcards(packId?: number, limit = 20): Promise<Flashcard[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (packId) params.set('packId', String(packId));
  const res = await apiFetch(`/api/flashcards/study/due?${params.toString()}`, { cache: 'no-store' });
  return parseJsonOrThrow<Flashcard[]>(res, 'Unable to load due flashcards');
}

export async function getFlashcardHealth(limit = 20, lookbackDays = 30): Promise<FlashcardHealth> {
  const params = new URLSearchParams({
    limit: String(limit),
    lookbackDays: String(lookbackDays),
  });
  const res = await apiFetch(`/api/flashcards/health?${params.toString()}`, { cache: 'no-store' });
  return parseJsonOrThrow<FlashcardHealth>(res, 'Unable to load flashcard health');
}

export async function recordFlashcardAttempt(
  cardId: number,
  grade: 'again' | 'hard' | 'good' | 'easy',
  responseMs?: number,
) {
  const res = await apiFetch(`/api/flashcards/cards/${cardId}/attempt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grade, responseMs }),
  });
  return parseJsonOrThrow(res, 'Unable to save review');
}

export async function getCourseFlashcardSummary(sampleLimit = 3): Promise<CourseFlashcardSummary> {
  const decks = (await getFlashcardDecks()).filter(isCourseFlashcardDeck);
  const dueCount = decks.reduce((sum, deck) => sum + Number(deck.dueCount || 0), 0);
  const cardCount = decks.reduce((sum, deck) => sum + Number(deck.cardCount || 0), 0);
  const sampleDueCards = (
    await Promise.all(
      decks
        .filter((deck) => Number(deck.dueCount || 0) > 0)
        .slice(0, sampleLimit)
        .map((deck) => getDueFlashcards(deck.id, sampleLimit).catch(() => [])),
    )
  )
    .flat()
    .slice(0, sampleLimit);

  return {
    decks,
    dueCount,
    cardCount,
    notDueCount: Math.max(0, cardCount - dueCount),
    sampleDueCards,
  };
}
