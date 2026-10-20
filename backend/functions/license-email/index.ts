// Emails Masaha's office when a surveying office uploads its licence for review.
// Called by the app right after submit_license. Sends through Resend; until the
// RESEND_API_KEY secret is set it does nothing and the in-app bell alert still works.
import { createClient } from 'npm:@supabase/supabase-js@2';

const TO = 'masaha.jor@gmail.com';

Deno.serve(async (req) => {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return new Response('unauthorized', { status: 401 });

  const { data: p } = await admin.from('providers')
    .select('display_name, license_no, license_doc_path, verification_status').eq('id', user.id).maybeSingle();
  if (!p || p.verification_status !== 'pending' || !p.license_doc_path) return Response.json({ sent: false, reason: 'not pending' });

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return Response.json({ sent: false, reason: 'no key' });

  const { data: link } = await admin.storage.from('licenses').createSignedUrl(p.license_doc_path, 60 * 60 * 24 * 7);
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const html = `<div dir="rtl" style="font-family:Tahoma,sans-serif">
    <h2>رخصة جديدة بانتظار المراجعة</h2>
    <p>المكتب: <b>${esc(p.display_name ?? '')}</b></p>
    <p>رقم الرخصة: <b>${esc(p.license_no ?? '-')}</b></p>
    <p>البريد: ${esc(user.email ?? '-')}</p>
    ${link?.signedUrl ? `<p><a href="${link.signedUrl}">فتح ملف الرخصة</a> (الرابط صالح 7 أيام)</p>` : ''}
    <p>للقبول أو الرفض: تطبيق مساحة ← ☰ ← إدارة مساحة.</p></div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Masaha <onboarding@resend.dev>', to: [TO], subject: `رخصة جديدة: ${p.display_name ?? ''}`, html }),
  });
  return Response.json({ sent: r.ok });
});
