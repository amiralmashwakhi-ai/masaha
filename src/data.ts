import { DEFAULT_MILESTONES } from './money';
import { supabase } from './supabase';
import { Attachment, Job, JobEvent, Milestone, Provider, Review, Role, ServiceId, ServicePost, ServiceRequest } from './types';

// Rows as Supabase returns them; money is in fils.
interface JobRow {
  id: string; customer_id: string; service: ServiceId; governorate: string; directorate: string | null;
  village: string | null; basin: string | null; plot_number: string | null; area_m2: number | null;
  notes: string | null; visits: number | null; visit_length: Job['visitLength'] | null; with_report: boolean | null; stage: Job['stage']; accepted_quote_id: string | null; created_at: string;
  quotes: { id: string; provider_id: string; price_fils: number; days: number; scope: string }[];
  agreements: { customer_signed_at: string | null; provider_signed_at: string | null } | null;
  escrow_milestones: { key: Milestone['key']; share: number; status: Milestone['status'] }[];
  job_events: { at: string; actor_id: string; kind: JobEvent['kind']; body: string }[];
  reviews: { author_role: Role; stars: Review['stars']; body: string | null }[];
}

const JOB_SELECT = '*, quotes!quotes_job_id_fkey(id, provider_id, price_fils, days, scope), agreements(customer_signed_at, provider_signed_at), '
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
    visitLength: r.visit_length ?? undefined,
    withReport: r.with_report ?? undefined,
    createdAt: r.created_at,
    stage: r.stage,
    acceptedQuoteId: r.accepted_quote_id ?? undefined,
    quotes: r.quotes.map((q) => ({ id: q.id, providerId: q.provider_id, priceJod: q.price_fils / 1000, days: q.days, scope: q.scope })),
    signedBy,
    bothSignedAt: r.agreements?.customer_signed_at && r.agreements?.provider_signed_at
      ? [r.agreements.customer_signed_at, r.agreements.provider_signed_at].sort()[1] : undefined,
    milestones: r.escrow_milestones.length
      ? DEFAULT_MILESTONES.map((d) => ({ ...d, ...r.escrow_milestones.find((m) => m.key === d.key) }))
      : DEFAULT_MILESTONES,
    events: [...r.job_events]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((e) => ({
        at: e.at, kind: e.kind, text: e.body,
        // Anyone other than the two sides is Masaha's office (e.g. settling a dispute).
        by: e.actor_id === r.customer_id ? 'customer' : e.kind === 'quote' || e.actor_id === providerId ? 'provider' : 'masaha',
      })),
    reviews: r.reviews.map((v) => ({ by: v.author_role, stars: v.stars, text: v.body ?? '' })),
    providerId,
  };
}

// RLS returns a customer's own jobs, or for a provider the open feed plus jobs they won.
export async function listJobs(role: Role, userId: string) {
  let q = supabase.from('jobs').select(JOB_SELECT).is('deleted_at', null).order('created_at', { ascending: false });
  if (role === 'customer') q = q.eq('customer_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as JobRow[]).map(toJob);
}

export async function getJob(id: string) {
  const { data, error } = await supabase.from('jobs').select(JOB_SELECT).eq('id', id).single();
  if (error) throw error;
  return toJob(data as unknown as JobRow);
}

export async function createJob(userId: string, r: ServiceRequest) {
  const { error } = await supabase.from('jobs').insert({
    customer_id: userId, service: r.service, governorate: r.location.governorate,
    directorate: r.location.directorate || null, village: r.location.village || null,
    basin: r.location.basin || null, plot_number: r.location.plotNumber || null,
    area_m2: r.location.areaM2 ?? null, notes: r.notes || null, visits: r.visits ?? null, visit_length: r.visitLength ?? null, with_report: r.withReport ?? null,
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

// Chat between a customer and a provider about one job. Opens once the other side accepts the request.
export interface Chat {
  id: string; providerId: string; providerName: string; requestedBy: string; status: 'pending' | 'accepted' | 'declined';
}
export interface ChatMessage { id: string; senderId: string; body: string; at: string }

// The server removes digits too; doing it here shows the sender what will be sent.
export const stripDigits = (s: string) => s.replace(/[0-9٠-٩۰-۹]/g, '');

export async function listChats(jobId: string): Promise<Chat[]> {
  const { data, error } = await supabase.from('chats').select('id, provider_id, requested_by, status').eq('job_id', jobId);
  if (error) throw error;
  const ids = data.map((c) => c.provider_id);
  const { data: names } = ids.length
    ? await supabase.from('providers').select('id, display_name').in('id', ids)
    : { data: [] as { id: string; display_name: string }[] };
  return data.map((c) => ({
    id: c.id, providerId: c.provider_id, requestedBy: c.requested_by, status: c.status,
    providerName: names?.find((n) => n.id === c.provider_id)?.display_name ?? '',
  }));
}

export const requestChat = (jobId: string, providerId: string) => rpc('request_chat', { p_job: jobId, p_provider: providerId });
export const respondChat = (chatId: string, accept: boolean) => rpc('respond_chat', { p_chat: chatId, p_accept: accept });

export async function listMessages(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('chat_messages').select('id, sender_id, body, created_at')
    .eq('chat_id', chatId).order('created_at');
  if (error) throw error;
  return data.map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, at: m.created_at }));
}

export async function sendMessage(chatId: string, senderId: string, body: string) {
  const { error } = await supabase.from('chat_messages').insert({ chat_id: chatId, sender_id: senderId, body: stripDigits(body).trim() });
  if (error) throw error;
}

// Service offer posts. Text has its numbers removed on the server, like chat; the price has its own field.
interface PostRow {
  id: string; provider_id: string; service: ServiceId; title: string; body: string; price_from_fils: number | null;
  governorate: string | null; attachments: Attachment[]; active: boolean; created_at: string;
  providers: { display_name: string } | null;
}

export async function listPosts(opts: { providerId?: string } = {}): Promise<ServicePost[]> {
  let q = supabase.from('service_posts').select('*, providers(display_name)').order('created_at', { ascending: false }).limit(100);
  if (opts.providerId) q = q.eq('provider_id', opts.providerId);
  else q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as PostRow[]).map((r) => ({
    id: r.id, providerId: r.provider_id, providerName: r.providers?.display_name ?? '', service: r.service,
    title: r.title, body: r.body, priceFromJod: r.price_from_fils == null ? undefined : r.price_from_fils / 1000,
    governorate: r.governorate ?? undefined, attachments: r.attachments ?? [], active: r.active, createdAt: r.created_at,
  }));
}

export async function createPost(userId: string, p: {
  service: ServiceId; title: string; body: string; priceFromJod?: number; governorate?: string; attachments: Attachment[];
}) {
  const { error } = await supabase.from('service_posts').insert({
    provider_id: userId, service: p.service, title: stripDigits(p.title).trim(), body: stripDigits(p.body).trim(),
    price_from_fils: p.priceFromJod == null ? null : Math.round(p.priceFromJod * 1000),
    governorate: p.governorate || null, attachments: p.attachments,
  });
  if (error) throw error;
}

export async function setPostActive(id: string, active: boolean) {
  const { error } = await supabase.from('service_posts').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('service_posts').delete().eq('id', id);
  if (error) throw error;
}

// Uploads a photo or document into posts/<user id>/ and returns its public link.
export async function uploadPostFile(userId: string, uri: string, name: string, mime: string): Promise<Attachment> {
  const body = await (await fetch(uri)).arrayBuffer();
  const safe = name.replace(/[^\w.\-]+/g, '_').slice(-60) || 'file';
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from('posts').upload(path, body, { contentType: mime });
  if (error) throw error;
  const url = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
  return { url, name, kind: mime.startsWith('image/') ? 'image' : 'document' };
}

// In-app notifications, written by the server when something happens to the user's jobs or chats.
export interface AppNotification { id: number; kind: string; jobId?: string; service?: ServiceId; at: string; read: boolean }

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('notifications').select('id, kind, job_id, service, created_at, read_at')
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data.map((n) => ({ id: n.id, kind: n.kind, jobId: n.job_id ?? undefined, service: n.service ?? undefined, at: n.created_at, read: !!n.read_at }));
}

export async function unreadCount() {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  return count ?? 0;
}

export async function markAllRead() {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

// Report and block.
export async function report(reporterId: string, target: { userId?: string; postId?: string; chatId?: string }, reason: string) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId, target_user: target.userId ?? null, post_id: target.postId ?? null, chat_id: target.chatId ?? null,
    reason: reason.trim().slice(0, 500),
  });
  if (error) throw error;
}

export async function listBlocked(): Promise<string[]> {
  const { data } = await supabase.from('blocks').select('blocked_id');
  return (data ?? []).map((b) => b.blocked_id);
}

export async function block(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblock(blockedId: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocked_id', blockedId);
  if (error) throw error;
}

// Cancel before payment; dispute after payment (money stays held until the operator decides).
// Phone numbers of both sides, available once the money is held.
export async function jobContacts(jobId: string) {
  const { data, error } = await supabase.rpc('job_contacts', { p_job: jobId });
  if (error) throw error;
  const row = (data as { customer_phone: string | null; provider_phone: string | null }[])[0];
  return { customer: row?.customer_phone ?? undefined, provider: row?.provider_phone ?? undefined };
}

export const deleteJob = (jobId: string) => rpc('delete_job', { p_job: jobId });
export const unsignAgreement = (jobId: string) => rpc('unsign_agreement', { p_job: jobId });
export const cancelJob = (jobId: string) => rpc('cancel_job', { p_job: jobId });
export const openDispute = (jobId: string, reason: string) => rpc('open_dispute', { p_job: jobId, p_reason: reason });

// Erases personal details and blocks sign-in; fails while a paid job is still open.
export async function deleteMyAccount(): Promise<'ok' | 'activeJobs' | 'error'> {
  const { error } = await supabase.rpc('delete_my_account');
  if (!error) { await supabase.auth.signOut(); return 'ok'; }
  return error.message.includes('active jobs') ? 'activeJobs' : 'error';
}

// Licence check: the document goes to the private "licenses" bucket, then the operator reviews it.
export async function submitLicense(userId: string, uri: string, name: string, mime: string, licenseNo: string) {
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}-${name.replace(/[^\w.\-]+/g, '_').slice(-60) || 'licence'}`;
  const { error } = await supabase.storage.from('licenses').upload(path, body, { contentType: mime });
  if (error) throw error;
  await rpc('submit_license', { p_path: path, p_license_no: licenseNo });
}

export async function verificationStatus(userId: string): Promise<'none' | 'pending' | 'verified' | 'rejected'> {
  const { data } = await supabase.from('providers').select('verification_status').eq('id', userId).maybeSingle();
  return (data?.verification_status as 'none' | 'pending' | 'verified' | 'rejected') ?? 'none';
}

// Operator (Ameer's office) tools.
export async function isOperator(userId: string) {
  const { data } = await supabase.from('operators').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

export interface PendingProvider { id: string; name: string; kind: string; licenseNo?: string; docUrl?: string }
export async function pendingProviders(): Promise<PendingProvider[]> {
  const { data, error } = await supabase.from('providers').select('id, display_name, kind, license_no, license_doc_path')
    .eq('verification_status', 'pending');
  if (error) throw error;
  return Promise.all(data.map(async (p) => ({
    id: p.id, name: p.display_name, kind: p.kind, licenseNo: p.license_no ?? undefined,
    docUrl: p.license_doc_path
      ? (await supabase.storage.from('licenses').createSignedUrl(p.license_doc_path, 600)).data?.signedUrl
      : undefined,
  })));
}
export const reviewProvider = (id: string, approve: boolean) => rpc('review_provider', { p_provider: id, p_approve: approve });

export interface OpenReport { id: string; reason: string; at: string; postId?: string; chatId?: string; targetName?: string }
export async function openReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase.from('reports').select('id, reason, created_at, post_id, chat_id, target_user')
    .eq('status', 'open').order('created_at', { ascending: false });
  if (error) throw error;
  const ids = [...new Set(data.map((r) => r.target_user).filter(Boolean))] as string[];
  const { data: names } = ids.length ? await supabase.from('providers').select('id, display_name').in('id', ids) : { data: [] };
  return data.map((r) => ({
    id: r.id, reason: r.reason, at: r.created_at, postId: r.post_id ?? undefined, chatId: r.chat_id ?? undefined,
    targetName: (names ?? []).find((n: { id: string }) => n.id === r.target_user)?.display_name,
  }));
}
export const closeReport = (id: string, hidePost: boolean) => rpc('close_report', { p_report: id, p_hide_post: hidePost });

export interface OpenDispute { id: string; jobId: string; reason: string; at: string; service?: ServiceId }
export async function openDisputes(): Promise<OpenDispute[]> {
  const { data, error } = await supabase.from('disputes').select('id, job_id, reason, opened_at, jobs(service)')
    .is('closed_at', null).order('opened_at');
  if (error) throw error;
  return (data as unknown as { id: string; job_id: string; reason: string; opened_at: string; jobs: { service: ServiceId } | null }[])
    .map((d) => ({ id: d.id, jobId: d.job_id, reason: d.reason, at: d.opened_at, service: d.jobs?.service }));
}
// Amicable settlement: each side agrees; once both have, the job carries on.
export async function openDisputeOf(jobId: string) {
  const { data } = await supabase.from('disputes').select('id, customer_settles, provider_settles')
    .eq('job_id', jobId).is('closed_at', null).maybeSingle();
  return data ? { id: data.id as string, customer: !!data.customer_settles, provider: !!data.provider_settles } : null;
}
export const settleDispute = (jobId: string) => rpc('settle_dispute', { p_job: jobId });

export const requestCorrection = (id: string, note: string) => rpc('request_correction', { p_dispute: id, p_note: note });

// Deliverables: signed and stamped files, read through short-lived links.
export interface JobFile { id: string; name: string; mime: string; at: string; url?: string }
export async function listJobFiles(jobId: string): Promise<JobFile[]> {
  const { data, error } = await supabase.from('job_files').select('id, path, name, mime, created_at')
    .eq('job_id', jobId).order('created_at');
  if (error) throw error;
  const signed = data.length
    ? (await supabase.storage.from('deliverables').createSignedUrls(data.map((f) => f.path), 600)).data ?? []
    : [];
  return data.map((f, i) => ({ id: f.id, name: f.name, mime: f.mime, at: f.created_at, url: signed[i]?.signedUrl ?? undefined }));
}

export async function uploadDeliverable(jobId: string, userId: string, uri: string, name: string, mime: string) {
  const path = `${jobId}/${Date.now()}-${name.replace(/[^\w.-]/g, '_')}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const up = await supabase.storage.from('deliverables').upload(path, body, { contentType: mime });
  if (up.error) throw up.error;
  const { error } = await supabase.from('job_files').insert({ job_id: jobId, uploader_id: userId, path, name, mime, signed_stamped: true });
  if (error) throw error;
}

// Chat activity on one job, for the bubble's badge.
const CHAT_KINDS = ['chatRequest', 'chatAccepted', 'chatMessage'];
export async function chatUnread(jobId: string) {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
    .eq('job_id', jobId).in('kind', CHAT_KINDS).is('read_at', null);
  return count ?? 0;
}
export async function markChatRead(jobId: string) {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('job_id', jobId).in('kind', CHAT_KINDS).is('read_at', null);
}

export const resolveDispute = (id: string, refund: boolean, note: string) =>
  rpc('resolve_dispute', { p_dispute: id, p_refund: refund, p_note: note });
