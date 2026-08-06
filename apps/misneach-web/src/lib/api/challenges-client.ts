import { apiFetch } from '$lib/api/client';

export type ChallengeStatus = 'active' | 'completed';

export type UserChallenge = {
  id: string;
  key: string;
  type: 'real_world_phrase_use';
  title: string;
  description: string | null;
  status: ChallengeStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: {
    courseSlug: string;
    courseTitle: string | null;
    lessonSlug: string;
    lessonTitle: string | null;
  } | null;
};

export type ChallengesPayload = {
  items: UserChallenge[];
  summary: {
    activeCount: number;
    completedCount: number;
    total: number;
  };
};

export async function getChallenges(): Promise<ChallengesPayload> {
  const res = await apiFetch('/api/challenges', { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Unable to load challenges');
  }
  return data as ChallengesPayload;
}

export async function setChallengeCompleted(id: string, completed: boolean): Promise<UserChallenge> {
  const res = await apiFetch(`/api/challenges/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Unable to update challenge');
  }
  return data as UserChallenge;
}
