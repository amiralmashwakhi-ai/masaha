import { supabase } from './supabase';
import { Role } from './types';

export interface ReviewRow {
  stars: number; body: string | null; author_name: string | null; author_role: Role; created_at: string;
}

export async function reviewsAbout(subjectId: string) {
  const { data } = await supabase
    .from('reviews')
    .select('stars, body, author_name, author_role, created_at')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  return (data ?? []) as ReviewRow[];
}

export async function ratingOf(subjectId: string) {
  const { data } = await supabase.from('rating_summary').select('avg_stars, review_count').eq('subject_id', subjectId).maybeSingle();
  return data as { avg_stars: number; review_count: number } | null;
}

// Allowed only on a completed job, by its customer about its provider or the reverse (enforced in the database).
export const leaveReview = (r: {
  jobId: string; authorId: string; authorRole: Role; authorName: string; subjectId: string; stars: number; body: string;
}) =>
  supabase.from('reviews').insert({
    job_id: r.jobId, author_id: r.authorId, author_role: r.authorRole, author_name: r.authorName,
    subject_id: r.subjectId, stars: r.stars, body: r.body,
  });
