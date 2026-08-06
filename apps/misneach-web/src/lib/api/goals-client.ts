import { apiFetch } from '$lib/api/client';

export type GoalStatus = 'active' | 'completed' | 'archived';

export type UserGoal = {
  id: string;
  title: string;
  description: string | null;
  periodType: 'weekly' | 'monthly' | 'yearly' | 'custom';
  periodStart: string;
  periodEnd: string;
  targetType: 'time_minutes' | 'session_count' | 'unit_count';
  targetValue: string;
  activityType:
    | 'reading'
    | 'course_material'
    | 'listening'
    | 'conversation'
    | 'writing'
    | 'review'
    | 'other'
    | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  progress?: {
    achieved: number;
    target: number;
    remaining: number;
    percent: number;
    isComplete: boolean;
  };
};

export async function getGoals(status = 'active'): Promise<UserGoal[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiFetch(`/api/goals${query}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Unable to load goals');
  }
  return Array.isArray(data) ? (data as UserGoal[]) : [];
}
