import { DEFAULT_MILESTONES } from './money';
import { supabase } from './supabase';
import { Job, JobEvent, Milestone, Provider, Review, Role, ServiceId, ServiceRequest } from './types';

// Rows as Supabase returns them; money is in fils.
interface JobRow {
  id: string; customer_id: string; service: ServiceId; governorate: string; directorate: string | null;
  village: string | null; basin: string | null; plot_number: string | null; area_m2: number | null;
  notes: string | null; visits: number | null; stage: Job['stage']; accepted_quote_id: string | null; created_at: string;
  quotes: { id: string; provider_id: string; price_fils: number; days: number; scope: string }[];
  agreements: { customer_signed_at: string | null; provider_signed_at: string | null } | null;
  escrow_milestones: { key: Milestone['key']; share: number; status: Milestone['status'] }[];
  job_events: { at: string; actor_id: string; kind: JobEvent['kind']; body: string }[];
  reviews: { author_role: Role; stars: Review['stars']; body: string | null }[];
}

const JOB_SELECT = '*, quotes(id, provider_id, price_fils, days, scope), agreements(customer_signed_at, provider_signed_at), '
  + 'escrow_milestones(key, share, status), job_events(at, actor_id, kind, body), reviews(author_role, stars, body)';

function toJob(r: JobRow): Job {
  const providerId = r.quotes.find((q) => q.id === r.accepted_quote_id)?.provider_id;
  const signedBy: Role[] = [];
  if (r.agreements?.customer_signed_at) signedBy.push('customer');
  if (r.agreements?.provider_signed_at) signedBy.push('provider');
  return {
    id: r.id,
    customerId: r.customer_id,
    service: r.service,
    location: {
      governorate: r.governorate, directorate: r.directorate ?? '', village: r.village ?? '',
      basin: r.basin ?? '', plotNumber: r.plot_number ?? '', areaM2: r.area_m2 ?? undefined,
    },
    notes: r.notes ?? '',
    visits: r.visits ?? undefined,
    createdAt: r.created_at,
    stage: r.stage,
    acceptedQuoteId: r.accepted_quote_id ?? undefined,
    quotes: r.quotes.map((q) => ({ id: q.id, providerId: q.provider_id, priceJod: q.price_fils / 1000, days: q.days, scope: q.scope })),
    signedBy,
    milestones: r.escrow_milestones.length
      ? DEFAULT_MILESTONES.map((d) => ({ ...d, ...r.escrow_milestones.find((m) => m.key === d.key) }))
      : DEFAULT_MILESTONES,
    events: [...r.job_events]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((e) => ({ at: e.at, by: e.actor_id === r.customer_id ? 'customer' : 'provider', kind: e.kind, text: e.body })),
    reviews: r.reviews.map((v) => ({ by: v.author_role, stars: v.stars, text: v.body ?? '' })),
    providerId,
  };
}

// RLS returns a customer's own jobs, or for a provider the open feed plus jobs they won.
export async function listJobs(role: Role, userId: string) {
  let q = supabase.from('jobs').select(JOB_SELECT).order('created_at', { ascending: false });
  if (role === 'customer') q = q.eq('customer_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as JobRow[]).map(toJob);
}

export async function createJob(userId: string, r: ServiceRequest) {
  const { error } = await supabase.from('jobs').insert({
    customer_id: userId, service: r.service, governorate: r.location.governorate,
    directorate: r.location.directorate || null, village: r.location.village || null,
    basin: r.location.basin || null, plot_number: r.location.plotNumber || null,
    area_m2: r.location.areaM2 ?? null, notes: r.notes || null, visits: r.visits ?? null,
  });
  if (error) throw error;
}

export async function sendQuote(jobId: string, providerId: string, priceJod: number, days: number, scope: string) {
  const { error } = await supabase.from('quotes').insert({
    job_id: jobId, provider_id: providerId, price_fils: Math.round(priceJod * 1000), days, scope,
  });
  if (error) throw error;
}

const rpc = async (fn: string, args: Record<string, unknown>) => {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
};
export const acceptQuote = (quoteId: string) => rpc('accept_quote', { p_quote: quoteId });
export const signAgreement = (jobId: string) => rpc('sign_agreement', { p_job: jobId });
// Replaced by the HyperPay checkout once the merchant account is ready.
export const payEscrow = (jobId: string) => rpc('mock_pay_escrow', { p_job: jobId });
export const advanceStage = (jobId: string) => rpc('advance_stage', { p_job: jobId });
export const releaseMilestone = (jobId: string, key: Milestone['key']) => rpc('release_milestone', { p_job: jobId, p_key: key });

interface ProviderRow {
  id: string; kind: Provider['kind']; display_name: string; license_no: string | null; verified: boolean;
  experience_years: number; cv_education: string | null; cv_experience: string[]; cv_equipment: string[];
  services: ServiceId[]; governorates: string[]; cover_url: string | null;
}

export async function reviewsAbout(subjectId: string): Promise<Review[]> {
  const { data } = await supabase
    .from('reviews')
    .select('stars, body, author_name, created_at, jobs(service)')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  return ((data ?? []) as unknown as { stars: Review['stars']; body: string | null; author_name: string | null; created_at: string; jobs: { service: ServiceId } | null }[])
    .map((r) => ({ by: r.author_name ?? '', stars: r.stars, text: r.body ?? '', jobService: r.jobs?.service, at: r.created_at.slice(0, 10) }));
}

export async function loadProviders(ids: string[]): Promise<Provider[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from('providers').select('*').in('id', ids);
  const rows = (data ?? []) as ProviderRow[];
  return Promise.all(rows.map(async (p) => ({
    id: p.id, name: p.display_name, kind: p.kind, licenseNo: p.license_no ?? undefined, verified: p.verified,
    experienceYears: p.experience_years,
    cv: { education: p.cv_education ?? '', experience: p.cv_experience, equipment: p.cv_equipment },
    services: p.services, governorates: p.governorates, coverUrl: p.cover_url ?? undefined,
    reviews: await reviewsAbout(p.id),
  })));
}

export async function saveProvider(p: Provider) {
  const { error } = await supabase.from('providers').update({
    display_name: p.name, kind: p.kind, license_no: p.licenseNo || null, experience_years: p.experienceYears,
    cv_education: p.cv.education || null, cv_experience: p.cv.experience, cv_equipment: p.cv.equipment,
    services: p.services, governorates: p.governorates,
  }).eq('id', p.id);
  if (error) throw error;
}

export async function leaveReview(job: Job, authorId: string, authorRole: Role, authorName: string, stars: number, body: string) {
  const subjectId = authorRole === 'customer' ? job.providerId : job.customerId;
  const { error } = await supabase.from('reviews').insert({
    job_id: job.id, author_id: authorId, author_role: authorRole, author_name: authorName,
    subject_id: subjectId, stars, body: body || null,
  });
  if (error) throw error;
}

export async function updateProfile(userId: string, fields: { full_name?: string; phone?: string; cover_url?: string }) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}

// Uploads to covers/<user id>/cover-<time>.jpg and returns the public URL.
export async function uploadCover(userId: string, uri: string, mime = 'image/jpeg') {
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/cover-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('covers').upload(path, body, { contentType: mime, upsert: true });
  if (error) throw error;
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
}

export async function setProviderCover(userId: string, url: string) {
  const { error } = await supabase.from('providers').update({ cover_url: url }).eq('id', userId);
  if (error) throw error;
}

export interface PaymentMethod {
  id: string; kind: 'cliq' | 'visa' | 'mastercard'; cliq_alias: string | null; last4: string | null; is_default: boolean;
}

export async function listPaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, kind, cliq_alias, last4, is_default')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}

export async function addCliq(userId: string, alias: string, makeDefault: boolean) {
  const { error } = await supabase.from('payment_methods').insert({ user_id: userId, kind: 'cliq', cliq_alias: alias, is_default: makeDefault });
  if (error) throw error;
}

export async function setDefaultMethod(methods: PaymentMethod[], id: string) {
  for (const m of methods) {
    if (m.is_default !== (m.id === id)) {
      const { error } = await supabase.from('payment_methods').update({ is_default: m.id === id }).eq('id', m.id);
      if (error) throw error;
    }
  }
}

export async function removeMethod(id: string) {
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) throw error;
}
