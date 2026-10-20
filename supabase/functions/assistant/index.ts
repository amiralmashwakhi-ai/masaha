// Masaha AI assistant: answers questions about surveying in Jordan and how the app works.
// The Anthropic key lives only here, as the ANTHROPIC_API_KEY secret; the app never sees it.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const DAILY_LIMIT = 20;
const MAX_TURNS = 12;
const MAX_CHARS = 1500;

const SYSTEM = `You are the assistant inside Masaha (مساحة), a Jordanian app that connects customers with licensed land surveyors and surveying offices.

Help with:
- Which surveying service fits the customer's need: plot surveying and boundary marking, land subdivision (إفراز), topographic surveys, construction staking (with a number of visits), as-built surveys, site plans (مخطط موقع تنظيمي), and surveying for land disputes.
- What documents and information are usually needed in Jordan (title deed / سند تسجيل, governorate, directorate, village, basin / حوض, plot number / قطعة), and the general role of the Department of Lands and Survey (دائرة الأراضي والمساحة).
- How Masaha works: the customer posts a request, providers send quotes, the customer accepts one, both sign the agreement, the customer pays into escrow, 30% is released after field work and 70% on delivery, then both sides review each other. Chat opens after the other side accepts a chat request, and numbers are removed from messages so contact and payment stay inside Masaha where both sides are protected. Providers can publish service posts with photos and documents.

Rules:
- Reply in the language the user writes in (Arabic or English). Keep answers short and practical, a few sentences or a short list.
- Give general guidance only. For exact fees, legal requirements or official procedures, say they should confirm with the Department of Lands and Survey or a licensed surveyor, because rules change.
- Never encourage moving payment or contact outside the app.
- Politely decline topics unrelated to surveying, land, construction or the Masaha app.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user) return json({ error: "auth" }, 401);

  let body: { messages?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const messages: Anthropic.MessageParam[] = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "bad_request" }, 400);

  // Daily cap per user keeps the bill predictable.
  const { data: count, error: capError } = await admin.rpc("use_assistant_quota", { p_user: auth.user.id, p_limit: DAILY_LIMIT });
  if (capError) return json({ error: "server" }, 500);
  if (count === null) return json({ error: "limit" }, 429);

  const client = new Anthropic({ apiKey: key });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages,
    });
    if (response.stop_reason === "refusal") return json({ reply: "", error: "refused" });
    const reply = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return json({ reply });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503);
    console.error(e);
    return json({ error: "server" }, 502);
  }
});
