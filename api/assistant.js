// /api/assistant — Merveil AI proxy
//
// Vercel auto-deploys any file in /api as a serverless function,
// regardless of the frontend framework (Vite, CRA, etc). This is the
// ONLY place the Anthropic API key is used — it never reaches the browser.
//
// Setup on Vercel:
//   1. Project → Settings → Environment Variables
//   2. Add ANTHROPIC_API_KEY = sk-ant-... (Production + Preview)
//   3. Redeploy
//
// Request body:  { system: string, messages: {role, content}[], maxTokens?: number }
// Response body: { reply: string }
//
// SECURITY FIX (V1 audit): this endpoint used to have no auth check and no
// usage limit of its own — the daily Passport-tier limit was only enforced
// by a voluntary client-side pre-check (/api/assistant-usage) that anyone
// calling this endpoint directly could simply skip, at real per-message
// Anthropic cost with no sign-in required at all. This now requires a
// valid session and re-checks the same limit server-side, using the exact
// same table/columns/RPC router.js already uses for inventory-ai-parse —
// so there's one source of truth for "how much AI has this user used
// today," not two that can drift out of sync.
import { getSession, userClient } from "../lib/supabaseServer.js";

const AI_DAILY_LIMITS = { ordinary: 10, services: 25, investor: 100000 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { system, messages, maxTokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "`messages` must be a non-empty array" });
    return;
  }

  const { token, user } = await getSession(req, res);
  if (!user || !token) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  const sb = userClient(token);

  const { data: profile } = await sb.from("profiles").select("passport_tier").eq("id", user.id).maybeSingle();
  const tier = profile?.passport_tier || "ordinary";
  const limit = AI_DAILY_LIMITS[tier] ?? AI_DAILY_LIMITS.ordinary;
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await sb.from("ai_usage").select("message_count").eq("user_id", user.id).eq("usage_date", today).maybeSingle();
  const used = usageRow?.message_count || 0;
  if (used >= limit) {
    res.status(429).json({
      error: `Daily Merveil AI limit reached (${used}/${limit}) for your Passport tier. Try again tomorrow or upgrade your Passport.`,
    });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens || 600,
        system: system || "",
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).json({ error: `Anthropic API error: ${errText}` });
      return;
    }

    const data = await upstream.json();
    const reply = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n");

    // Log usage server-side too — the frontend still calls
    // /api/assistant-usage?action=log after a successful reply for its own
    // bookkeeping, but that's now belt-and-suspenders, not the only place
    // the count gets incremented. Same RPC, same auth.uid()-derived
    // identity (see toggle_*_like functions — same pattern), so this
    // can't be spoofed to increment someone else's count.
    await sb.rpc("increment_ai_usage", { uid: user.id }).catch(() => {});

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: `Assistant request failed: ${err.message}` });
  }
}
