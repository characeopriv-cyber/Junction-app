import formidable from "formidable";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  anonClient,
  userClient,
  getSession,
  setSessionCookie,
  clearSessionCookie,
  sendJson,
  junctionIdFor,
} from "../lib/supabaseServer.js";

// Admin client for account confirmation only — separate from the shared
// lib so this fix doesn't depend on lib/supabaseServer.js also being
// updated. Uses the same service-role key the rest of the backend relies
// on (Supabase's standard env var names).
function adminClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ================================================================
// ADMIN IDENTITY & RBAC — completely separate from citizen auth.
// Citizens authenticate via Supabase Auth (getSession/anonClient/
// userClient above). Admins authenticate here, against the
// admin_users/admin_roles/admin_sessions tables, with their own
// cookie, their own token, their own permission model. Nothing in
// this block ever touches or trusts a citizen session, and nothing
// in the citizen-facing routes below ever grants admin access.
//
// Passwords/session tokens use Node's built-in scrypt + timing-safe
// compare — no new npm dependency (bcrypt) needed for this.
// ================================================================
const ADMIN_COOKIE = "merveil_admin_session";
const ADMIN_SESSION_HOURS = 12;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function newActivationCode() {
  // MV-XXXX-XXXX-XXXX — 3x2 random bytes = 48 bits of entropy, combined
  // with the rate limit on the activate action below. One-time, cleared
  // immediately on use, 72h expiry.
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `MV-${part()}-${part()}-${part()}`;
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  raw.split(";").forEach((p) => {
    const idx = p.indexOf("=");
    if (idx === -1) return;
    out[p.slice(0, idx).trim()] = decodeURIComponent(p.slice(idx + 1).trim());
  });
  return out;
}

function setAdminCookie(res, token) {
  const maxAge = ADMIN_SESSION_HOURS * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
  );
}

function clearAdminCookie(res) {
  res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

// Resolves the admin session cookie into { admin, role, permissions } or
// null. Every protected admin-auth/console action calls this first.
async function getAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_COOKIE];
  if (!token) return null;
  const svc = adminClient();
  const tokenHash = hashToken(token);
  const { data: session } = await svc
    .from("admin_sessions")
    .select("id, admin_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;
  const { data: admin } = await svc
    .from("admin_users")
    .select("id, email, name, status, role_id, mfa_enabled")
    .eq("id", session.admin_id)
    .maybeSingle();
  if (!admin || admin.status !== "active") return null;
  const { data: role } = await svc
    .from("admin_roles")
    .select("key, name, permissions")
    .eq("id", admin.role_id)
    .maybeSingle();
  return { admin, sessionId: session.id, role: role?.key, roleName: role?.name, permissions: role?.permissions || [] };
}

function hasPermission(ctx, perm) {
  if (!ctx) return false;
  return ctx.permissions.includes("*") || ctx.permissions.includes(perm);
}

async function writeAdminAudit(adminId, action, { targetType = null, targetId = null, details = null, riskLevel = "low" } = {}) {
  const svc = adminClient();
  await svc.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    risk_level: riskLevel,
  }).catch(() => {});
}

async function logSecurityEvent(userId, eventType, { severity = "info", description = null, metadata = null } = {}) {
  const svc = adminClient();
  await svc.from("security_events").insert({
    user_id: userId,
    event_type: eventType,
    severity,
    description,
    metadata,
  }).catch(() => {});
}

function parseUserAgent(ua) {
  ua = ua || "";
  let os = "Unknown OS";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let browser = "Unknown browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  const deviceType = /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  return { os, browser, deviceType, deviceName: `${browser} on ${os}` };
}

// Called right after a citizen session is created (login or register).
// Never allowed to block or fail the actual sign-in — this is telemetry
// for the Device & Session Center (doc 2 §19) and Security Center (doc 1
// §14/16), not a gate.
async function recordUserSession(req, userId, sessionToken) {
  try {
    const svc = adminClient();
    const ua = req.headers["user-agent"] || "";
    const { os, browser, deviceType, deviceName } = parseUserAgent(ua);
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || null;
    await svc.from("user_sessions").insert({
      user_id: userId,
      session_token_hash: sessionToken ? hashToken(sessionToken) : null,
      device_name: deviceName,
      device_type: deviceType,
      browser,
      os,
      ip,
    });
    await svc.from("security_events").insert({
      user_id: userId,
      event_type: "login",
      severity: "info",
      description: `Signed in from ${deviceName}`,
      ip,
      device_info: { userAgent: ua },
    });
  } catch (e) {
    /* telemetry only — never block a real login over this */
  }
}

// One catch-all function handles every /api/* route this app needs
// (auth, properties, services, conversations, circles, events, people).
// Keeping it as a single function (plus the separate assistant.js) is
// what keeps this project under Vercel Hobby's 12-function cap.
export const config = { api: { bodyParser: false } };

async function readBody(req) {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return null; // multipart handled separately via formidable
}

function randomCircleCode(name) {
  return (
    name.trim().slice(0, 3).toUpperCase() +
    Math.floor(Math.random() * 90 + 10)
  );
}

function ticketCode() {
  return "JX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// People naturally type prices with commas ("1,850,000") — plain Number()
// returns NaN for that, which silently became 0 before. This strips
// anything that isn't a digit or minus sign first.
function toNumber(v) {
  if (v == null || v === "") return null;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

// Simple abuse guard: no more than 8 login/register attempts per
// identifier (email) in a 10-minute window. Not bulletproof (no IP
// tracking without extra infra), but it stops naive scripted guessing.
async function checkRateLimit(anon, identifier) {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await anon
    .from("auth_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gt("created_at", since);
  await anon.from("auth_attempts").insert({ identifier });
  return (count || 0) < 8;
}

// Server-side AI usage enforcement — the daily Passport-tier limit
// (Ordinary 10 / Services 25 / Investor effectively unlimited) was
// previously only checked by the frontend before calling this. Anyone
// bypassing the UI could call an AI-backed endpoint directly, unlimited
// times, at real Anthropic API cost. Every endpoint that calls the AI
// must call this first and stop on `allowed: false`.
async function checkAiUsageAllowed(sb, userId) {
  const { data: profile } = await sb.from("profiles").select("passport_tier").eq("id", userId).maybeSingle();
  const tier = profile?.passport_tier || "ordinary";
  const LIMITS = { ordinary: 10, services: 25, investor: 100000 };
  const limit = LIMITS[tier] ?? LIMITS.ordinary;
  const { data } = await sb.from("ai_usage").select("message_count").eq("user_id", userId).eq("usage_date", new Date().toISOString().slice(0, 10)).maybeSingle();
  const used = data?.message_count || 0;
  return { allowed: used < limit, used, limit, tier };
}

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    bio: row.bio,
    junction_id: row.junction_id,
    avatar_url: row.avatar_url,
    background_id: row.background_id,
    passport_tier: row.passport_tier,
    role_label: row.role_label,
    city: row.city,
    profession: row.profession,
    company_name: row.company_name,
    skills: row.skills || [],
    languages: row.languages || [],
    portfolio_url: row.portfolio_url,
    website_url: row.website_url,
  };
}

// currentUser (post-login/register) is read directly with camelCase keys
// everywhere in the app (currentUser.passportTier, .junctionId, etc.) —
// this mapper matches that, distinct from mapProfile() above which
// matches what the PATCH /people?action=profile response is expected
// to look like (patchUser() in the frontend remaps that one manually).
function mapAuthUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    bio: row.bio,
    junctionId: row.junction_id,
    avatarUrl: row.avatar_url,
    backgroundId: row.background_id,
    passportTier: row.passport_tier,
    roleLabel: row.role_label,
    isAdmin: !!row.is_admin,
    discoverable: row.discoverable !== false,
    country: row.country || null,
    // Professional Passport progressive-completion fields (see
    // passportCompletionOf() in App.jsx) — additive, doesn't change
    // any field already relied on elsewhere.
    city: row.city || null,
    profession: row.profession || null,
    companyName: row.company_name || null,
    accountType: row.account_type || null,
    skills: row.skills || [],
    languages: row.languages || [],
    portfolioUrl: row.portfolio_url || null,
    websiteUrl: row.website_url || null,
  };
}

export default async function handler(req, res) {
  try {
    // Derived straight from the URL rather than req.query.path — the
    // latter only works if this file's name matches character-for-
    // character (including the literal "..."), which is fragile when
    // edited/renamed through a mobile browser. This is robust to that.
    const urlPath = (req.url || "").split("?")[0];
    const segments = urlPath.replace(/^\/?api\/?/, "").split("/").filter(Boolean).map((s) => decodeURIComponent(s));
    const resource = segments[0] || "";
    const method = req.method;
    const { token, user } = await getSession(req, res);
    const sb = token ? userClient(token) : anonClient();

    // ---------------------------------------------------------- /api/auth
    if (resource === "auth") {
      const sub = segments[1];
      const anon = anonClient();

      if (sub === "login" && method === "POST") {
        const body = await readBody(req);
        let { email, password, phone } = body || {};
        if (!email && phone) {
          const digits = String(phone).replace(/[^0-9]/g, "");
          email = `phone_${digits}@users.junction.technology`;
        }
        if (!email || !password) return sendJson(res, 400, { error: "Phone or email, and password are required." });
        const okRate = await checkRateLimit(anon, email.toLowerCase());
        if (!okRate) return sendJson(res, 429, { error: "Too many attempts — wait a few minutes and try again." });
        const { data, error } = await anon.auth.signInWithPassword({ email, password });
        if (error || !data?.session) {
          return sendJson(res, 401, { error: error?.message || "Invalid email or password." });
        }
        setSessionCookie(res, data.session.access_token, data.session.refresh_token);
        await recordUserSession(req, data.user.id, data.session.access_token);
        const authed = userClient(data.session.access_token);
        let { data: profile } = await authed.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
        if (!profile) {
          const { count: existingCount } = await anon.from("profiles").select("*", { count: "exact", head: true });
          const { data: created } = await authed
            .from("profiles")
            .insert({
              id: data.user.id,
              email: email.startsWith("phone_") ? null : email,
              name: email.startsWith("phone_") ? "Merveil Member" : email.split("@")[0],
              junction_id: junctionIdFor(data.user.id),
              passport_tier: "ordinary",
              is_admin: !existingCount || existingCount === 0,
            })
            .select()
            .maybeSingle();
          profile = created;
        }
        return sendJson(res, 200, { user: mapAuthUser(profile) });
      }

      if (sub === "login" && method === "DELETE") {
        clearSessionCookie(res);
        return sendJson(res, 200, { ok: true });
      }

      if (sub === "register" && method === "POST") {
        const body = await readBody(req);
        let { email, password, name, country, age, accountType, companyName, phone, website: hp } = body || {};
        const usingPhone = !email && !!phone;

        // Honeypot: this field is invisible in the real form, so only a
        // bot that auto-fills every input would ever populate it. Reply
        // with a generic success-shaped error rather than explaining why,
        // so the bot doesn't learn what tripped it.
        if (hp) return sendJson(res, 400, { error: "Registration failed. Please try again." });

        // Per-IP registration limit — the per-email limit below only
        // stops repeated attempts on ONE address; this stops one source
        // spinning up many different fake accounts (mass signup abuse).
        const clientIp = String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown").split(",")[0].trim();
        const okIpRate = await checkRateLimit(anon, `register_ip_${clientIp}`);
        if (!okIpRate) return sendJson(res, 429, { error: "Too many accounts created from this connection — wait a few minutes and try again." });

        if (usingPhone) {
          // Phone-based signup: no confirmation step of any kind, immediate
          // login, as requested — a reliable stopgap until proper phone/SMS
          // verification is set up with an engineer. Internally this still
          // rides on Supabase's email/password auth (the mechanism already
          // proven to work), using a synthetic address derived from the
          // phone number so no real email or confirmation is ever involved.
          const digits = String(phone).replace(/[^0-9]/g, "");
          if (digits.length < 8) return sendJson(res, 400, { error: "Enter a valid phone number." });
          email = `phone_${digits}@users.junction.technology`;
        }

        if (!email || !password || !name) return sendJson(res, 400, { error: "Name, phone or email, and password are required." });
        if (!country) return sendJson(res, 400, { error: "Select your country to continue." });
        if (!age || Number(age) < 18) return sendJson(res, 400, { error: "You must be 18 or older to register." });
        if ((accountType === "agent" || accountType === "company") && !companyName) {
          return sendJson(res, 400, { error: "Company name is required for agent/company accounts." });
        }
        const okRate = await checkRateLimit(anon, email.toLowerCase());
        if (!okRate) return sendJson(res, 429, { error: "Too many attempts — wait a few minutes and try again." });
        const { data, error } = await anon.auth.signUp({
          email,
          password,
          options: usingPhone ? undefined : { emailRedirectTo: "https://www.junction.technology" },
        });
        if (error) {
          if (usingPhone && /registered/i.test(error.message)) {
            return sendJson(res, 400, { error: "That phone number is already registered — try signing in instead." });
          }
          return sendJson(res, 400, { error: error.message });
        }

        let session = data.session;
        let userId = data.user?.id;

        if (!session) {
          // "Confirm email" is enabled on the project, which normally means
          // waiting for an emailed link — but that link depends on a Supabase
          // dashboard "Redirect URLs" setting we can't change from here, and
          // it's been landing on a broken default. Rather than send a user
          // into a dead end on their very first action in the app, confirm
          // the account immediately server-side (admin API) and sign them in
          // directly. No email link is involved in the flow at all now.
          try {
            const admin = adminClient();
            await admin.auth.admin.updateUserById(userId, { email_confirm: true });
            const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
            if (signInErr || !signInData?.session) {
              return sendJson(res, 400, { error: "Account created — please sign in." });
            }
            session = signInData.session;
            userId = signInData.user.id;
          } catch (e) {
            return sendJson(res, 400, {
              error: "Account created — check your inbox to confirm your email, then sign in.",
            });
          }
        }

        setSessionCookie(res, session.access_token, session.refresh_token);
        await recordUserSession(req, userId, session.access_token);
        const authed = userClient(session.access_token);
        const { count: existingCount } = await anon.from("profiles").select("*", { count: "exact", head: true });
        const isFirstUser = !existingCount || existingCount === 0;
        const { data: profile, error: profileErr } = await authed
          .from("profiles")
          .insert({
            id: userId,
            email: usingPhone ? null : email,
            name,
            junction_id: junctionIdFor(userId),
            passport_tier: "ordinary",
            is_admin: isFirstUser,
            country,
            age: Number(age),
            account_type: accountType || "individual",
            company_name: companyName || null,
            phone: phone || null,
          })
          .select()
          .maybeSingle();
        if (profileErr) return sendJson(res, 400, { error: profileErr.message });

        // Persistent welcome message from Merveil AI — not just a toast, so
        // there's a permanent, checkable record that every user was told
        // this is a pre-launch test phase.
        try {
          const admin = adminClient();
          const MERVEIL_AI_ID = "00000000-0000-0000-0000-000000000001";
          const { data: aiProfile } = await admin.from("profiles").select("id").eq("id", MERVEIL_AI_ID).maybeSingle();
          if (!aiProfile) {
            await admin.from("profiles").insert({
              id: MERVEIL_AI_ID,
              email: "ai@junction.technology",
              name: "Merveil AI",
              junction_id: "JCT-AI-0001",
              passport_tier: "investor",
              is_admin: false,
              discoverable: false,
            });
          }
          const { data: convo } = await admin
            .from("conversations")
            .insert({ participant_ids: [userId, MERVEIL_AI_ID] })
            .select()
            .maybeSingle();
          if (convo?.id) {
            await admin.from("messages").insert({
              conversation_id: convo.id,
              sender_id: MERVEIL_AI_ID,
              body:
                `Welcome to Merveil, ${name}! I'm Merveil AI, here to help you find property, ` +
                `connect with verified people, and get things done across the platform. Explore Pulse, ` +
                `Connect, Souk, Work, and Passport — everything is live and yours to try.\n\n` +
                `A quick note: Merveil is currently in test phase #001, ahead of our official public ` +
                `launch. Some features are still being refined. Enjoy exploring, and thank you for being ` +
                `one of our first citizens.`,
            });
          }
        } catch (e) {
          // Never block a successful signup on the welcome message.
        }

        return sendJson(res, 200, { user: mapAuthUser(profile) });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ---------------------------------------------------- /api/properties
    if (resource === "properties") {
      const action = req.query.action;

      if (method === "POST" && action === "inventory-ai-parse") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const usage = await checkAiUsageAllowed(sb, user.id);
        if (!usage.allowed) {
          return sendJson(res, 429, { error: `Daily Merveil AI limit reached (${usage.used}/${usage.limit}) for your Passport tier. Try again tomorrow or upgrade your Passport.` });
        }
        const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
        const [, files] = await form.parse(req);
        const file = files.file?.[0];
        if (!file) return sendJson(res, 400, { error: "No file uploaded." });

        const mimetype = file.mimetype || "";
        const filename = (file.originalFilename || "").toLowerCase();
        const fs = await import("fs");
        const buffer = fs.readFileSync(file.filepath);

        const isXlsx = mimetype.includes("spreadsheet") || mimetype.includes("excel") || /\.(xlsx|xls)$/.test(filename);
        const isDocx = mimetype.includes("wordprocessingml") || mimetype === "application/msword" || /\.(docx|doc)$/.test(filename);

        let contentBlock;
        if (mimetype === "application/pdf") {
          contentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } };
        } else if (mimetype.startsWith("image/")) {
          contentBlock = { type: "image", source: { type: "base64", media_type: mimetype, data: buffer.toString("base64") } };
        } else if (isXlsx) {
          // Claude's document API doesn't read Excel natively — extract the
          // sheet contents to plain text first using the xlsx package (must
          // be added as a project dependency: npm install xlsx).
          try {
            const XLSX = await import("xlsx");
            const wb = XLSX.read(buffer, { type: "buffer" });
            const sheetsText = wb.SheetNames.map((name) => {
              const sheet = wb.Sheets[name];
              return `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
            }).join("\n\n");
            contentBlock = { type: "text", text: `Spreadsheet contents:\n\n${sheetsText}` };
          } catch (e) {
            return sendJson(res, 500, { error: "Excel reading isn't set up on the server yet — the 'xlsx' package needs to be added as a dependency." });
          }
        } else if (isDocx) {
          // Same situation for Word docs — extract to plain text using
          // mammoth (must be added as a project dependency: npm install mammoth).
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer });
            contentBlock = { type: "text", text: `Document contents:\n\n${result.value}` };
          } catch (e) {
            return sendJson(res, 500, { error: "Word doc reading isn't set up on the server yet — the 'mammoth' package needs to be added as a dependency." });
          }
        } else {
          return sendJson(res, 400, {
            error: "Merveil AI can read PDFs, Excel, Word docs, and photos/scans of a rent roll or sale sheet.",
          });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          return sendJson(res, 500, { error: "AI document reading isn't configured on the server yet (missing ANTHROPIC_API_KEY)." });
        }

        const prompt =
          "You are Merveil's inventory analyst. This document is a rent roll, sale sheet, or property/unit list — " +
          "possibly messy, handwritten, or a photo of a printed page. Extract every unit or property row you can find " +
          "into a JSON array. For each unit, include ONLY these fields, using null for anything not present or not " +
          "legible: unitNumber, unitType (e.g. Studio, 1BR, 2BR, Office, Villa, Retail), price (number, no currency " +
          "symbols or commas), bedrooms (number), bathrooms (number), sqft (number), floor, status (\"available\" or " +
          "\"occupied\" — infer from a tenant name being present), tenantName, leaseStart (YYYY-MM-DD if present), " +
          "leaseEnd (YYYY-MM-DD if present), lastRenewalType. " +
          "Respond with ONLY the raw JSON array — no markdown, no code fences, no explanation, no surrounding text.";

        let aiRes;
        try {
          aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": process.env.ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
            }),
          });
        } catch (e) {
          return sendJson(res, 502, { error: "Couldn't reach Merveil AI — try again in a moment." });
        }
        const aiData = await aiRes.json();
        if (!aiRes.ok) {
          return sendJson(res, 502, { error: aiData?.error?.message || "Merveil AI couldn't read this file." });
        }
        const text = (aiData.content || []).find((c) => c.type === "text")?.text || "";
        let units;
        try {
          const cleaned = text.replace(/```json|```/g, "").trim();
          units = JSON.parse(cleaned);
          if (!Array.isArray(units)) throw new Error("not an array");
        } catch (e) {
          return sendJson(res, 502, {
            error: "Merveil AI read the file but couldn't structure it into units — try a clearer scan, or a CSV export instead.",
          });
        }
        // Fill in occupancyStatus from status/tenantName the same way manual CSV rows are, so
        // downstream lease-intelligence logic (vacancy/renewal stats) works identically either way.
        units = units.map((u) => ({ ...u, occupancyStatus: u.tenantName ? "occupied" : "vacant" }));
        await sb.rpc("increment_ai_usage", { uid: user.id }).catch(() => {});
        return sendJson(res, 200, { units, fileName: file.originalFilename, unitCount: units.length });
      }

      if (method === "GET" && action === "inventory") {
        if (req.query.id) {
          const { data: inventory, error } = await anonClient().from("property_inventories").select("*").eq("id", req.query.id).maybeSingle();
          if (error) return sendJson(res, 400, { error: error.message });
          const { data: units } = await sb.from("inventory_units").select("*").eq("inventory_id", req.query.id).order("created_at");
          return sendJson(res, 200, { inventory, units: units || [] });
        }
        const { data, error } = await anonClient().from("property_inventories").select("*").order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { inventories: data || [] });
      }

      if (method === "POST" && action === "inventory") {
        if (!user) return sendJson(res, 401, { error: "Sign in to publish an inventory." });
        const body = await readBody(req);
        const units = Array.isArray(body.units) ? body.units : [];
        const prices = units.map((u) => Number(u.price)).filter((n) => !isNaN(n) && n > 0);
        const { data: inv, error } = await sb
          .from("property_inventories")
          .insert({
            owner_id: user.id,
            name: body.name,
            inventory_type: body.inventoryType || "rent",
            emirate: body.emirate,
            area: body.area,
            breakdown_mode: body.breakdownMode || "inventory",
            unit_count: units.length,
            price_min: prices.length ? Math.min(...prices) : null,
            price_max: prices.length ? Math.max(...prices) : null,
            source_file_name: body.sourceFileName || null,
            parse_notes: body.parseNotes || null,
          })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        if (units.length) {
          const rows = units.map((u) => ({
            inventory_id: inv.id,
            unit_number: u.unitNumber || null,
            unit_type: u.unitType || null,
            price: Number(u.price) || null,
            bedrooms: u.bedrooms != null ? Number(u.bedrooms) : null,
            bathrooms: u.bathrooms != null ? Number(u.bathrooms) : null,
            sqft: u.sqft != null ? Number(u.sqft) : null,
            tenant_name: u.tenantName || null,
            lease_start: u.leaseStart || null,
            lease_end: u.leaseEnd || null,
            occupancy_status: u.occupancyStatus || (u.tenantName ? "occupied" : "vacant"),
            last_renewal_type: u.lastRenewalType || null,
            raw: u,
          }));
          await sb.from("inventory_units").insert(rows);
        }
        return sendJson(res, 200, { id: inv.id, ...inv });
      }

      if (method === "POST" && action === "view") {
        const body = await readBody(req);
        if (!body.propertyId) return sendJson(res, 400, { error: "propertyId required" });
        await anonClient().rpc("increment_property_views", { pid: body.propertyId });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST" && action === "like") {
        if (!user) return sendJson(res, 401, { error: "Sign in to like listings." });
        const body = await readBody(req);
        if (!body.propertyId) return sendJson(res, 400, { error: "propertyId required" });
        const { data, error } = await sb.rpc("toggle_property_like", { pid: body.propertyId }).maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { liked: data.liked, likesCount: data.likes_count });
      }

      if (method === "GET" && action === "likes") {
        if (!user) return sendJson(res, 200, { likedIds: [] });
        const { data } = await sb.from("property_likes").select("property_id").eq("user_id", user.id);
        return sendJson(res, 200, { likedIds: (data || []).map((r) => r.property_id) });
      }

      if (method === "GET") {
        const { data, error } = await anonClient().from("properties").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) return sendJson(res, 400, { error: error.message });
        const mapped = (data || []).map((p) => ({
          ...p,
          type: p.listing_type || "Sale",
          priceFreq: p.listing_type === "Rent" ? "yr" : undefined,
          ownerId: p.owner_id,
          isLive: true,
        }));
        return sendJson(res, 200, { properties: mapped });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to post a property." });
        const body = await readBody(req);
        const { data, error } = await sb
          .from("properties")
          .insert({
            owner_id: user.id,
            title: body.title,
            area: body.area,
            emirate: body.emirate,
            price: toNumber(body.price) || 0,
            listing_type: body.type === "Rent" ? "Rent" : "Sale",
            category: body.category || "Apartment",
            price_frequency: body.type === "Rent" ? "year" : null,
            beds: body.beds !== "" && body.beds != null ? Number(body.beds) : null,
            baths: body.baths !== "" && body.baths != null ? Number(body.baths) : null,
            sqft: body.sqft !== "" && body.sqft != null ? Number(body.sqft) : null,
            furnished: body.furnished || null,
            service_charge: body.serviceCharge || null,
            description: body.description || null,
            photo_url: body.photoUrls?.[0] || body.photoUrl || null,
            photo_urls: body.photoUrls || (body.photoUrl ? [body.photoUrl] : null),
            video_url: body.videoUrl || null,
            media_type: body.mediaType || (body.videoUrl ? "video" : "photo"),
            music_track_id: body.musicTrackId || null,
            visibility: body.visibility === "investor" ? "investor" : "public",
            is_developer_project: !!body.isDeveloperProject,
            developer_name: body.developerName || null,
            handover_date: body.handoverDate || null,
            payment_plan: body.paymentPlan || null,
            unit_types_available: body.unitTypesAvailable || null,
            floor: body.floor || null,
            zoning: body.zoning || null,
            jv_open: !!body.jvOpen,
            jv_terms: body.jvTerms || null,
          })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { property: { ...data, type: data.listing_type || "Sale", priceFreq: data.listing_type === "Rent" ? "yr" : undefined, ownerId: data.owner_id, isLive: true } });
      }

      if (method === "PATCH") {
        if (!user) return sendJson(res, 401, { error: "Sign in to edit this listing." });
        const body = await readBody(req);
        const { id, ...fields } = body;
        const { error } = await sb
          .from("properties")
          .update({
            title: fields.title,
            area: fields.area,
            emirate: fields.emirate,
            price: toNumber(fields.price) || 0,
            listing_type: fields.type === "Rent" ? "Rent" : fields.type === "Sale" ? "Sale" : undefined,
            category: fields.category || undefined,
            price_frequency: fields.type === "Rent" ? "year" : fields.type === "Sale" ? null : undefined,
            beds: fields.beds !== "" && fields.beds != null ? Number(fields.beds) : null,
            baths: fields.baths !== "" && fields.baths != null ? Number(fields.baths) : null,
            sqft: fields.sqft !== "" && fields.sqft != null ? Number(fields.sqft) : null,
            furnished: fields.furnished || null,
            service_charge: fields.serviceCharge || null,
            description: fields.description || null,
            photo_url: fields.photoUrls?.[0] || null,
            photo_urls: fields.photoUrls || null,
          })
          .eq("id", id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "DELETE") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        const { error } = await sb.from("properties").delete().eq("id", body.id).eq("owner_id", user.id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ------------------------------------------------------- /api/services
    if (resource === "services") {
      const action = req.query.action;

      if (method === "POST" && action === "view") {
        const body = await readBody(req);
        if (!body.serviceId) return sendJson(res, 400, { error: "serviceId required" });
        await anonClient().rpc("increment_service_views", { sid: body.serviceId });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST" && action === "like") {
        if (!user) return sendJson(res, 401, { error: "Sign in to like services." });
        const body = await readBody(req);
        if (!body.serviceId) return sendJson(res, 400, { error: "serviceId required" });
        const { data, error } = await sb.rpc("toggle_service_like", { sid: body.serviceId }).maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { liked: data.liked, likesCount: data.likes_count });
      }

      if (method === "GET" && action === "likes") {
        if (!user) return sendJson(res, 200, { likedIds: [] });
        const { data } = await sb.from("service_likes").select("service_id").eq("user_id", user.id);
        return sendJson(res, 200, { likedIds: (data || []).map((r) => r.service_id) });
      }

      if (method === "GET") {
        const { data, error } = await anonClient().from("services").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { services: (data || []).map((s) => ({ ...s, ownerId: s.owner_id, isLive: true })) });
      }
      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to publish a service." });
        const body = await readBody(req);
        const { data, error } = await sb
          .from("services")
          .insert({
            owner_id: user.id,
            title: body.title,
            category: body.category,
            area: body.area,
            price_text: body.priceText,
            description: body.description,
            photo_url: body.photoUrls?.[0] || null,
            photo_urls: body.photoUrls || null,
            video_url: body.videoUrl || null,
            media_type: body.mediaType || (body.videoUrl ? "video" : "photo"),
            music_track_id: body.musicTrackId || null,
          })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { service: { ...data, ownerId: data.owner_id, isLive: true } });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // --------------------------------------------------- /api/conversations
    if (resource === "conversations") {
      const action = req.query.action;
      const convId = segments[1];

      // /api/conversations/:id/messages
      if (convId && segments[2] === "messages") {
        if (method === "GET") {
          const { data, error } = await sb.from("messages").select("*").eq("conversation_id", convId).order("created_at");
          if (error) return sendJson(res, 400, { error: error.message });
          return sendJson(res, 200, { messages: data || [] });
        }
        if (method === "POST") {
          if (!user) return sendJson(res, 401, { error: "Sign in to send messages." });
          const body = await readBody(req);
          const { data, error } = await sb
            .from("messages")
            .insert({
              conversation_id: convId,
              sender_id: user.id,
              type: body.type || "text",
              body: body.body ?? null,
              media_url: body.mediaUrl ?? null,
              media_meta: body.mediaMeta ?? null,
            })
            .select()
            .maybeSingle();
          if (error) return sendJson(res, 400, { error: error.message });
          return sendJson(res, 200, { message: data });
        }
        if (method === "PATCH" && req.query.action === "edit") {
          if (!user) return sendJson(res, 401, { error: "Sign in required." });
          const body = await readBody(req);
          if (!body.messageId || !body.body?.trim()) return sendJson(res, 400, { error: "messageId and body required" });
          const { data, error } = await sb
            .from("messages")
            .update({ body: body.body.trim(), edited_at: new Date().toISOString() })
            .eq("id", body.messageId)
            .eq("sender_id", user.id) // can only edit your own messages
            .select()
            .maybeSingle();
          if (error) return sendJson(res, 400, { error: error.message });
          if (!data) return sendJson(res, 403, { error: "You can only edit your own messages." });
          return sendJson(res, 200, { message: data });
        }
        if (method === "PATCH") {
          if (!user) return sendJson(res, 401, { error: "Sign in required." });
          const { data: rows } = await sb.from("messages").select("id, read_by").eq("conversation_id", convId);
          for (const row of rows || []) {
            const readBy = row.read_by || [];
            if (!readBy.includes(user.id)) {
              await sb.from("messages").update({ read_by: [...readBy, user.id] }).eq("id", row.id);
            }
          }
          return sendJson(res, 200, { ok: true });
        }
        if (method === "DELETE") {
          if (!user) return sendJson(res, 401, { error: "Sign in required." });
          const body = await readBody(req);
          if (!body.messageId) return sendJson(res, 400, { error: "messageId required" });
          const { error, count } = await sb
            .from("messages")
            .delete({ count: "exact" })
            .eq("id", body.messageId)
            .eq("sender_id", user.id); // can only delete your own messages
          if (error) return sendJson(res, 400, { error: error.message });
          if (!count) return sendJson(res, 403, { error: "You can only delete your own messages." });
          return sendJson(res, 200, { ok: true });
        }
        return sendJson(res, 404, { error: "Not found" });
      }

      // /api/conversations/:id — delete a whole conversation (must be a participant)
      if (convId && !segments[2] && method === "DELETE") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const { data: convo } = await sb.from("conversations").select("participant_ids").eq("id", convId).maybeSingle();
        if (!convo || !(convo.participant_ids || []).includes(user.id)) {
          return sendJson(res, 403, { error: "Not a participant in this conversation." });
        }
        await sb.from("messages").delete().eq("conversation_id", convId);
        const { error } = await sb.from("conversations").delete().eq("id", convId);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "GET" && action === "presence") {
        const ids = (req.query.userIds || "").split(",").filter(Boolean);
        if (!ids.length) return sendJson(res, 200, { presence: {} });
        const { data } = await sb.from("presence").select("*").in("user_id", ids);
        const presence = {};
        const cutoff = Date.now() - 60 * 1000; // heartbeat is every 25s from the client — 60s stale = gone
        for (const row of data || []) {
          const fresh = row.updated_at && new Date(row.updated_at).getTime() > cutoff;
          presence[row.user_id] = fresh ? row.status : "offline";
        }
        return sendJson(res, 200, { presence });
      }

      if (method === "POST" && action === "presence") {
        if (!user) return sendJson(res, 200, { ok: true });
        const body = await readBody(req);
        await sb.from("presence").upsert({ user_id: user.id, status: body.status || "online", updated_at: new Date().toISOString() });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "GET" && action === "unread-count") {
        if (!user) return sendJson(res, 200, { count: 0 });
        const { data: convos } = await sb.from("conversations").select("id").contains("participant_ids", [user.id]);
        const ids = (convos || []).map((c) => c.id);
        if (!ids.length) return sendJson(res, 200, { count: 0 });
        const { data: msgs } = await sb.from("messages").select("conversation_id, sender_id, read_by").in("conversation_id", ids);
        const unreadConvos = new Set();
        for (const m of msgs || []) {
          if (m.sender_id !== user.id && !(m.read_by || []).includes(user.id)) unreadConvos.add(m.conversation_id);
        }
        return sendJson(res, 200, { count: unreadConvos.size });
      }

      if (method === "GET" && action === "profiles") {
        const ids = (req.query.ids || "").split(",").filter(Boolean);
        if (!ids.length) return sendJson(res, 200, { profiles: {} });
        const { data } = await sb.from("profiles").select("id,name,avatar_url").in("id", ids);
        const profiles = {};
        for (const row of data || []) profiles[row.id] = { name: row.name, avatar_url: row.avatar_url };
        return sendJson(res, 200, { profiles });
      }

      if (method === "GET" && action === "lookup") {
        const email = req.query.email;
        const { data } = await sb.from("profiles").select("id,name,email").eq("email", email).maybeSingle();
        return sendJson(res, 200, { user: data || null });
      }

      // Directory: browse discoverable Merveil users to chat with —
      // no need to already know someone's email. Returns everyone who
      // hasn't opted out (discoverable=true), with live presence status
      // and online users sorted first.
      if (method === "GET" && action === "directory") {
        if (!user) return sendJson(res, 200, { users: [] });
        const q = (req.query.q || "").trim().toLowerCase();
        let query = sb.from("profiles").select("id,name,avatar_url,role_label,passport_tier").eq("discoverable", true).neq("id", user.id).limit(200);
        const { data: people, error } = await query;
        if (error) return sendJson(res, 400, { error: error.message });
        const ids = (people || []).map((p) => p.id);
        let presenceMap = {};
        if (ids.length) {
          const { data: pres } = await sb.from("presence").select("*").in("user_id", ids);
          for (const row of pres || []) presenceMap[row.user_id] = row.status;
        }
        let list = (people || []).map((p) => ({
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          role_label: p.role_label,
          passport_tier: p.passport_tier,
          status: presenceMap[p.id] || "offline",
        }));
        if (q) list = list.filter((p) => (p.name || "").toLowerCase().includes(q));
        list.sort((a, b) => {
          const rank = { online: 0, busy: 1, offline: 2 };
          return (rank[a.status] ?? 2) - (rank[b.status] ?? 2);
        });
        return sendJson(res, 200, { users: list });
      }

      if (method === "GET") {
        if (!user) return sendJson(res, 200, { conversations: [] });
        const { data: convos, error } = await sb
          .from("conversations")
          .select("*")
          .contains("participant_ids", [user.id])
          .order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        const withLast = await Promise.all(
          (convos || []).map(async (c) => {
            const { data: last } = await sb
              .from("messages")
              .select("body")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            return { ...c, last_body: last?.body || null };
          })
        );
        return sendJson(res, 200, { conversations: withLast });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        const participantIds = body.participantIds || [];
        const { data, error } = await sb.from("conversations").insert({ participant_ids: participantIds }).select().maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { conversation: data });
      }

      // Smart Conversation Center — real archive + category label, not
      // decorative UI tabs.
      if (method === "PATCH" && convId && action === "archive") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const { data: conv } = await sb.from("conversations").select("archived_by").eq("id", convId).maybeSingle();
        const current = conv?.archived_by || [];
        const isArchived = current.includes(user.id);
        const next = isArchived ? current.filter((id) => id !== user.id) : [...current, user.id];
        const { error } = await sb.from("conversations").update({ archived_by: next }).eq("id", convId);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { archived: !isArchived });
      }

      if (method === "PATCH" && convId && action === "label") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        const { error } = await sb.from("conversations").update({ context_label: body.label || null }).eq("id", convId);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // -------------------------------------------------------- /api/circles
    if (resource === "circles") {
      const code = segments[1];

      if (code && segments[2] === "countries") {
        const { data: circle } = await sb.from("circles").select("id").eq("code", code).maybeSingle();
        if (!circle) return sendJson(res, 200, { countries: [] });
        const { data: members } = await sb
          .from("circle_members")
          .select("profiles(country)")
          .eq("circle_id", circle.id);
        const counts = {};
        for (const m of members || []) {
          const c = m.profiles?.country;
          if (c) counts[c] = (counts[c] || 0) + 1;
        }
        const countries = Object.entries(counts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
        return sendJson(res, 200, { countries });
      }

      if (code && segments[2] === "posts") {
        if (method === "GET") {
          const { data: circle } = await sb.from("circles").select("id").eq("code", code).maybeSingle();
          if (!circle) return sendJson(res, 200, { posts: [] });
          const { data: posts } = await sb.from("circle_posts").select("*").eq("circle_id", circle.id).order("created_at", { ascending: false });
          return sendJson(res, 200, { posts: posts || [] });
        }
        if (method === "POST") {
          if (!user) return sendJson(res, 401, { error: "Sign in to post in this circle." });
          const body = await readBody(req);
          let { data: circle } = await sb.from("circles").select("id").eq("code", code).maybeSingle();
          if (!circle) return sendJson(res, 404, { error: "Circle not found." });
          const { data, error } = await sb
            .from("circle_posts")
            .insert({ circle_id: circle.id, title: body.title, type: body.type || "announcement", author_id: user.id })
            .select()
            .maybeSingle();
          if (error) return sendJson(res, 400, { error: error.message });
          return sendJson(res, 200, { post: data });
        }
        return sendJson(res, 404, { error: "Not found" });
      }

      if (method === "GET" && req.query.userId) {
        if (!user) return sendJson(res, 200, { circles: [] });
        const { data: memberships } = await sb.from("circle_members").select("circle_id").eq("user_id", user.id);
        const ids = (memberships || []).map((m) => m.circle_id);
        if (!ids.length) return sendJson(res, 200, { circles: [] });
        const { data: circles } = await sb.from("circles").select("*").in("id", ids);
        return sendJson(res, 200, { circles: circles || [] });
      }

      if (method === "GET") {
        const { data: circles, error } = await anonClient().from("circles").select("*").order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        const withTotals = await Promise.all(
          (circles || []).map(async (c) => {
            const { count } = await sb.from("circle_members").select("*", { count: "exact", head: true }).eq("circle_id", c.id);
            return { ...c, total: count || 1 };
          })
        );
        return sendJson(res, 200, { circles: withTotals });
      }

      if (method === "POST" && req.query.action === "join") {
        if (!user) return sendJson(res, 401, { error: "Sign in to join a circle." });
        const body = await readBody(req);
        const { data: circle } = await sb.from("circles").select("id").eq("code", body.code).maybeSingle();
        if (!circle) return sendJson(res, 404, { error: "Circle not found." });
        const { error } = await sb.from("circle_members").upsert({ circle_id: circle.id, user_id: user.id });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to create a circle." });
        const body = await readBody(req);
        const code = randomCircleCode(body.name || "CIR");
        const { data, error } = await sb
          .from("circles")
          .insert({ code, name: body.name, flag: body.flag || null, created_by: user.id })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        await sb.from("circle_members").insert({ circle_id: data.id, user_id: user.id }).catch(() => {});
        return sendJson(res, 200, { circle: data });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // --------------------------------------------------------- /api/events
    if (resource === "events") {
      if (method === "GET") {
        const status = req.query.status || "upcoming";
        const { data, error } = await anonClient().from("events").select("*").eq("status", status).order("starts_at", { ascending: true });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { events: data || [] });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to create an event." });
        const body = await readBody(req);
        const { data, error } = await sb
          .from("events")
          .insert({
            organizer_id: user.id,
            title: body.title,
            category: body.category,
            description: body.description,
            venue_name: body.venueName,
            area: body.area,
            starts_at: body.startsAt,
            capacity: body.capacity,
            price_aed: body.priceAed || 0,
            organizer_tier: body.organizerTier,
            ai_plan: body.aiPlan,
            concierge_requested: !!body.conciergeRequested,
            marketing_requested: !!body.marketingRequested,
            status: "upcoming",
          })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { event: data });
      }

      if (method === "PATCH") {
        const body = await readBody(req);
        if (body.action === "rsvp") {
          if (!user) return sendJson(res, 401, { error: "Sign in to RSVP." });
          const code = ticketCode();
          const { error } = await sb.from("event_rsvps").insert({ event_id: body.eventId, user_id: user.id, ticket_code: code });
          if (error) {
            if (error.code === "23505") return sendJson(res, 200, { ticket: { ticket_code: code, already: true } });
            return sendJson(res, 400, { error: error.message });
          }
          const { data: newCount } = await sb.rpc("increment_event_rsvp_count", { eid: body.eventId });
          return sendJson(res, 200, { ticket: { ticket_code: code, goingCount: newCount } });
        }
        return sendJson(res, 400, { error: "Unknown action" });
      }

      if (method === "POST" && req.query.action === "view") {
        const body = await readBody(req);
        if (!body.eventId) return sendJson(res, 400, { error: "eventId required" });
        await anonClient().rpc("increment_event_views", { eid: body.eventId });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST" && req.query.action === "like") {
        if (!user) return sendJson(res, 401, { error: "Sign in to like events." });
        const body = await readBody(req);
        if (!body.eventId) return sendJson(res, 400, { error: "eventId required" });
        const { data, error } = await sb.rpc("toggle_event_like", { eid: body.eventId }).maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { liked: data.liked, likesCount: data.likes_count });
      }

      if (method === "GET" && req.query.action === "likes") {
        if (!user) return sendJson(res, 200, { likedIds: [] });
        const { data } = await sb.from("event_likes").select("event_id").eq("user_id", user.id);
        return sendJson(res, 200, { likedIds: (data || []).map((r) => r.event_id) });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ----------------------------------------------------- /api/notifications
    if (resource === "notifications" && req.query.action === "counts" && method === "GET") {
      const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const countSince = async (table) => {
        const { count } = await sb.from(table).select("*", { count: "exact", head: true }).gt("created_at", since48h);
        return count || 0;
      };
      const [events, jobs] = await Promise.all([countSince("events"), countSince("jobs")]);
      return sendJson(res, 200, { events, jobs });
    }

    // -------------------------------------------------- /api/privacy-center
    // Doc 2 §21 — "No hidden data experience." Assembles what's actually
    // stored about this citizen from the real tables, for them to see and
    // export. Nothing here is summarized or hidden from them.
    if (resource === "privacy-center") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      if (method === "GET") {
        const [{ data: profile }, { data: settings }, { data: sessions }, { data: events }, { count: connectionsCount }, { count: reportsFiled }] = await Promise.all([
          sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          sb.from("citizen_settings").select("*").eq("user_id", user.id).maybeSingle(),
          sb.from("user_sessions").select("id, device_name, ip, created_at, last_active_at, revoked_at").eq("user_id", user.id),
          sb.from("security_events").select("id, event_type, severity, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
          sb.from("connections").select("*", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`),
          sb.from("reports").select("*", { count: "exact", head: true }).eq("reporter_id", user.id),
        ]);
        return sendJson(res, 200, {
          profile: profile || null,
          settings: settings || null,
          sessions: sessions || [],
          securityEvents: events || [],
          connectionsCount: connectionsCount || 0,
          reportsFiled: reportsFiled || 0,
        });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // ---------------------------------------------------------- /api/reports
    // Trust & Safety report intake (doc 3 §37). Citizens can only ever
    // create and read their own reports — reviewing/deciding is admin-only,
    // via /api/console below.
    if (resource === "reports") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      if (method === "POST") {
        const body = await readBody(req);
        const { targetType, targetId, category, description } = body || {};
        if (!targetType || !targetId || !category) return sendJson(res, 400, { error: "targetType, targetId, and category are required." });
        const okRate = await checkRateLimit(anonClient(), `report_${user.id}`);
        if (!okRate) return sendJson(res, 429, { error: "Too many reports submitted — wait a few minutes and try again." });
        const { error } = await sb.from("reports").insert({
          reporter_id: user.id,
          target_type: targetType,
          target_id: String(targetId),
          category,
          description: description || null,
        });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }
      if (method === "GET") {
        const { data, error } = await sb.from("reports").select("id, target_type, target_id, category, status, created_at").eq("reporter_id", user.id).order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { reports: data || [] });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // ---------------------------------------------------------- /api/reauth
    // Doc 1 §13/14 — "smart re-authentication" and "risk-based session
    // protection". Honest scope: this is the real web equivalent (password
    // re-verification, no new session/cookie issued) rather than faking
    // WebAuthn/biometric prompts without the server-side signature
    // verification that would make them actually secure. Upgrading to a
    // real platform-authenticator (Face/fingerprint) flow later is a
    // separate, deliberate addition — it needs a vetted WebAuthn library,
    // not a hand-rolled one, since getting that crypto wrong is worse
    // than not having it.
    if (resource === "reauth") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      if (method === "POST") {
        const body = await readBody(req);
        if (!body.password) return sendJson(res, 400, { error: "Password required." });
        const svc = adminClient();
        const anon = anonClient();
        const okRate = await checkRateLimit(anon, `reauth_${user.id}`);
        if (!okRate) return sendJson(res, 429, { error: "Too many attempts — wait a few minutes and try again." });
        const { data: authUser } = await svc.auth.admin.getUserById(user.id);
        const email = authUser?.user?.email;
        if (!email) return sendJson(res, 400, { error: "Could not verify this account." });
        const { error } = await anon.auth.signInWithPassword({ email, password: body.password });
        if (error) {
          await logSecurityEvent(user.id, "reauth_failed", { severity: "elevated", description: "Failed re-authentication on a sensitive screen." });
          return sendJson(res, 401, { error: "Incorrect password." });
        }
        await logSecurityEvent(user.id, "reauth", { severity: "info", description: "Re-authenticated for a sensitive screen or after returning to Merveil." });
        return sendJson(res, 200, { ok: true, reauthAt: new Date().toISOString() });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // -------------------------------------------------- /api/citizen-settings
    // The real backend for the Citizen Control Center (doc 2). One row
    // per citizen, owner-scoped by RLS — sb here is already the citizen's
    // own authenticated client, so this can't touch anyone else's row.
    if (resource === "citizen-settings") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      if (method === "GET") {
        const { data, error } = await sb.from("citizen_settings").select("*").eq("user_id", user.id).maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { settings: data || null });
      }
      if (method === "POST" || method === "PUT") {
        const body = await readBody(req);
        const allowed = ["language", "accessibility", "ai_preferences", "notification_preferences", "opportunity_preferences", "connection_preferences", "passport_visibility", "privacy_preferences", "automation_rules"];
        const patch = { user_id: user.id, updated_at: new Date().toISOString() };
        for (const k of allowed) if (body[k] !== undefined) patch[k] = body[k];
        if (JSON.stringify(patch).length > 20000) return sendJson(res, 400, { error: "Settings payload too large." });
        const { data, error } = await sb.from("citizen_settings").upsert(patch, { onConflict: "user_id" }).select().maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { settings: data });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // ------------------------------------------------------- /api/my-sessions
    // Citizen-facing Device & Session Center (doc 2 §19) — "Sign out of
    // this device" is real: it revokes the row, same table the Admin
    // Security panel reads from.
    if (resource === "my-sessions") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      if (method === "GET") {
        const { data, error } = await sb.from("user_sessions").select("id, device_name, device_type, browser, os, ip, created_at, last_active_at, revoked_at").eq("user_id", user.id).order("last_active_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { sessions: data || [] });
      }
      if (method === "POST" && req.query.action === "revoke") {
        const body = await readBody(req);
        if (!body.sessionId) return sendJson(res, 400, { error: "sessionId required." });
        const { error } = await sb.from("user_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", body.sessionId).eq("user_id", user.id);
        if (error) return sendJson(res, 400, { error: error.message });
        await logSecurityEvent(user.id, "session_self_revoked", { severity: "low", description: "Citizen signed out a device from Settings." });
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // ------------------------------------------------------ /api/admin-auth
    // Private admin identity. Never linked from citizen UI, never trusts
    // a citizen session. Separate cookie, separate token, separate table.
    if (resource === "admin-auth") {
      const svc = adminClient();
      const action = req.query.action;

      if (action === "activate" && method === "POST") {
        const body = await readBody(req);
        const { activationCode, password, name } = body || {};
        if (!activationCode || !password) return sendJson(res, 400, { error: "Activation code and password are required." });
        if (String(password).length < 12) return sendJson(res, 400, { error: "Admin passwords must be at least 12 characters." });
        const okRate = await checkRateLimit(anonClient(), `admin_activate_${String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim()}`);
        if (!okRate) return sendJson(res, 429, { error: "Too many attempts — wait a few minutes and try again." });
        const { data: pending } = await svc
          .from("admin_users")
          .select("id, activation_expires_at, status, name")
          .eq("activation_code", activationCode)
          .maybeSingle();
        if (!pending) return sendJson(res, 400, { error: "Invalid or already-used activation code." });
        if (pending.status !== "pending") return sendJson(res, 400, { error: "This account is already activated." });
        if (!pending.activation_expires_at || new Date(pending.activation_expires_at).getTime() < Date.now()) {
          return sendJson(res, 400, { error: "This activation code has expired. Ask a Super Admin to issue a new one." });
        }
        await svc.from("admin_users").update({
          password_hash: hashPassword(password),
          name: name || pending.name,
          status: "active",
          activation_code: null,
          activation_expires_at: null,
        }).eq("id", pending.id);
        await writeAdminAudit(pending.id, "account_activated", { targetType: "admin_user", targetId: pending.id });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "login" && method === "POST") {
        const body = await readBody(req);
        const { email, password } = body || {};
        if (!email || !password) return sendJson(res, 400, { error: "Email and password are required." });
        const anon = anonClient();
        const okRate = await checkRateLimit(anon, `admin_${String(email).toLowerCase()}`);
        if (!okRate) return sendJson(res, 429, { error: "Too many attempts — wait a few minutes and try again." });
        const { data: admin } = await svc
          .from("admin_users")
          .select("id, email, name, password_hash, status, role_id")
          .eq("email", String(email).toLowerCase())
          .maybeSingle();
        if (!admin || admin.status !== "active" || !verifyPassword(password, admin.password_hash)) {
          if (admin) await writeAdminAudit(admin.id, "login_failed", { riskLevel: "medium" });
          return sendJson(res, 401, { error: "Invalid credentials." });
        }
        const token = newToken();
        const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000).toISOString();
        await svc.from("admin_sessions").insert({
          admin_id: admin.id,
          token_hash: hashToken(token),
          expires_at: expiresAt,
          ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || null,
          device_info: { userAgent: req.headers["user-agent"] || null },
        });
        await svc.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);
        await writeAdminAudit(admin.id, "login", { riskLevel: "low" });
        setAdminCookie(res, token);
        const { data: role } = await svc.from("admin_roles").select("key, name, permissions").eq("id", admin.role_id).maybeSingle();
        return sendJson(res, 200, { admin: { id: admin.id, email: admin.email, name: admin.name, role: role?.key, roleName: role?.name, permissions: role?.permissions || [] } });
      }

      if (action === "logout" && method === "POST") {
        const ctx = await getAdminSession(req);
        if (ctx) {
          await svc.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", ctx.sessionId);
          await writeAdminAudit(ctx.admin.id, "logout");
        }
        clearAdminCookie(res);
        return sendJson(res, 200, { ok: true });
      }

      if (action === "me" && method === "GET") {
        const ctx = await getAdminSession(req);
        if (!ctx) return sendJson(res, 401, { error: "Not signed in." });
        return sendJson(res, 200, { admin: { id: ctx.admin.id, email: ctx.admin.email, name: ctx.admin.name, role: ctx.role, roleName: ctx.roleName, permissions: ctx.permissions } });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ---------------------------------------------------------- /api/console
    // RBAC-gated admin data endpoints. Every branch checks a specific
    // permission string — see admin_roles.permissions (doc 3, §20).
    if (resource === "console") {
      const ctx = await getAdminSession(req);
      if (!ctx) return sendJson(res, 401, { error: "Admin sign-in required." });
      const svc = adminClient();
      const action = req.query.action;

      if (action === "overview" && method === "GET") {
        if (!hasPermission(ctx, "analytics.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [{ count: totalCitizens }, { count: newCitizens }, { count: suspended }, { count: activeSessions }, { data: recentEvents }] = await Promise.all([
          svc.from("profiles").select("*", { count: "exact", head: true }),
          svc.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", since7d),
          svc.from("profiles").select("*", { count: "exact", head: true }).eq("suspended", true),
          svc.from("user_sessions").select("*", { count: "exact", head: true }).is("revoked_at", null),
          svc.from("security_events").select("severity").gt("created_at", since24h),
        ]);
        const bySeverity = { info: 0, low: 0, elevated: 0, high: 0, critical: 0 };
        (recentEvents || []).forEach((e) => { if (bySeverity[e.severity] != null) bySeverity[e.severity]++; });
        return sendJson(res, 200, { totalCitizens: totalCitizens || 0, newCitizens7d: newCitizens || 0, suspended: suspended || 0, activeSessions: activeSessions || 0, securityEvents24h: bySeverity });
      }

      if (action === "citizens" && method === "GET") {
        if (!hasPermission(ctx, "support.accounts.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const q = (req.query.q || "").trim();
        let query = svc.from("profiles").select("id, name, email, junction_id, passport_tier, is_admin, suspended, country, created_at, last_seen_at").order("created_at", { ascending: false }).limit(50);
        if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,junction_id.ilike.%${q}%`);
        const { data, error } = await query;
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { citizens: data || [] });
      }

      if (action === "citizen-status" && method === "POST") {
        if (!hasPermission(ctx, "support.cases.update") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const body = await readBody(req);
        const { citizenId, suspended } = body || {};
        if (!citizenId) return sendJson(res, 400, { error: "citizenId required." });
        await svc.from("profiles").update({ suspended: !!suspended, suspended_at: suspended ? new Date().toISOString() : null }).eq("id", citizenId);
        await writeAdminAudit(ctx.admin.id, suspended ? "citizen_suspended" : "citizen_restored", { targetType: "citizen", targetId: citizenId, riskLevel: "medium" });
        await logSecurityEvent(citizenId, "admin_action", { severity: "elevated", description: suspended ? "Account suspended by admin." : "Account restored by admin." });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "security-events" && method === "GET") {
        if (!hasPermission(ctx, "security.alerts.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const { data, error } = await svc.from("security_events").select("id, user_id, event_type, severity, description, created_at").order("created_at", { ascending: false }).limit(100);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { events: data || [] });
      }

      if (action === "sessions" && method === "GET") {
        if (!hasPermission(ctx, "security.sessions.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const { data, error } = await svc.from("user_sessions").select("id, user_id, device_name, device_type, browser, os, ip, created_at, last_active_at, revoked_at").order("last_active_at", { ascending: false }).limit(100);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { sessions: data || [] });
      }

      if (action === "revoke-session" && method === "POST") {
        if (!hasPermission(ctx, "security.sessions.revoke") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const body = await readBody(req);
        if (!body.sessionId) return sendJson(res, 400, { error: "sessionId required." });
        await svc.from("user_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", body.sessionId);
        await writeAdminAudit(ctx.admin.id, "session_revoked", { targetType: "user_session", targetId: body.sessionId, riskLevel: "medium" });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "audit-log" && method === "GET") {
        if (!hasPermission(ctx, "audit.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const { data, error } = await svc.from("admin_audit_log").select("id, admin_id, action, target_type, target_id, details, risk_level, created_at").order("created_at", { ascending: false }).limit(100);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { log: data || [] });
      }

      if (action === "reports" && method === "GET") {
        if (!hasPermission(ctx, "safety.reports.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const statusFilter = req.query.status || null;
        let query = svc.from("reports").select("id, reporter_id, target_type, target_id, category, description, status, priority, resolution_note, created_at, resolved_at").order("created_at", { ascending: false }).limit(100);
        if (statusFilter) query = query.eq("status", statusFilter);
        const { data, error } = await query;
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { reports: data || [] });
      }

      if (action === "report-decision" && method === "POST") {
        if (!hasPermission(ctx, "safety.cases.update") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const body = await readBody(req);
        const { reportId, status, resolutionNote } = body || {};
        if (!reportId || !status) return sendJson(res, 400, { error: "reportId and status are required." });
        if (!["reviewing", "action_taken", "dismissed"].includes(status)) return sendJson(res, 400, { error: "Invalid status." });
        const patch = { status, assigned_admin_id: ctx.admin.id };
        if (resolutionNote) patch.resolution_note = resolutionNote;
        if (status === "action_taken" || status === "dismissed") patch.resolved_at = new Date().toISOString();
        const { error } = await svc.from("reports").update(patch).eq("id", reportId);
        if (error) return sendJson(res, 400, { error: error.message });
        await writeAdminAudit(ctx.admin.id, `report_${status}`, { targetType: "report", targetId: reportId, riskLevel: status === "action_taken" ? "high" : "low" });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "fraud-signals" && method === "GET") {
        if (!hasPermission(ctx, "fraud.cases.read") && !hasPermission(ctx, "fraud.risk.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        // Explainable, rule-based signals computed from data that already
        // exists — not a black-box score. Doc 3 §43 is explicit that risk
        // scoring must come with named signals, so that's what this
        // returns: exactly which rule fired and why, per account.
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const [{ data: sessions }, { data: failedEvents }, { data: openReports }, { data: newAccounts }] = await Promise.all([
          svc.from("user_sessions").select("user_id, ip").not("ip", "is", null).gt("created_at", since30d),
          svc.from("security_events").select("user_id").in("event_type", ["login_failed", "reauth_failed"]).gt("created_at", since30d),
          svc.from("reports").select("target_id").eq("target_type", "profile").neq("status", "dismissed"),
          svc.from("profiles").select("id").gt("created_at", since48h),
        ]);

        const ipMap = {};
        (sessions || []).forEach((s) => { (ipMap[s.ip] ||= new Set()).add(s.user_id); });
        const sharedIpUsers = new Set();
        Object.values(ipMap).forEach((set) => { if (set.size >= 2) set.forEach((u) => sharedIpUsers.add(u)); });

        const failCounts = {};
        (failedEvents || []).forEach((e) => { if (e.user_id) failCounts[e.user_id] = (failCounts[e.user_id] || 0) + 1; });

        const reportCounts = {};
        (openReports || []).forEach((r) => { reportCounts[r.target_id] = (reportCounts[r.target_id] || 0) + 1; });

        const newIds = new Set((newAccounts || []).map((a) => a.id));

        const allIds = new Set([...sharedIpUsers, ...Object.keys(failCounts), ...Object.keys(reportCounts)]);
        let cases = [...allIds].map((id) => {
          const signals = [];
          let score = 0;
          if (sharedIpUsers.has(id)) { signals.push("Shares a device/network with another Merveil account"); score += 30; }
          if (failCounts[id] >= 3) { signals.push(`${failCounts[id]} failed sign-in/re-auth attempts in the last 30 days`); score += 25; }
          if (reportCounts[id] >= 2) { signals.push(`${reportCounts[id]} open citizen reports against this profile`); score += 35; }
          if (newIds.has(id) && (failCounts[id] || reportCounts[id])) { signals.push("Account is under 48 hours old and already flagged"); score += 20; }
          return { userId: id, score: Math.min(score, 100), signals };
        }).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 50);

        if (cases.length) {
          const { data: names } = await svc.from("profiles").select("id, name, email, junction_id, suspended").in("id", cases.map((c) => c.userId));
          const nameMap = Object.fromEntries((names || []).map((n) => [n.id, n]));
          cases = cases.map((c) => ({ ...c, profile: nameMap[c.userId] || null }));
        }
        return sendJson(res, 200, { cases });
      }

      if (action === "property-signals" && method === "GET") {
        if (!hasPermission(ctx, "property.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const { data: props } = await svc.from("properties").select("id, owner_id, title, area, price, created_at").order("created_at", { ascending: false }).limit(500);
        const groups = {};
        (props || []).forEach((p) => {
          const key = `${(p.title || "").trim().toLowerCase()}|${(p.area || "").trim().toLowerCase()}`;
          if (!key.trim()) return;
          (groups[key] ||= []).push(p);
        });
        let cases = Object.values(groups)
          .filter((g) => new Set(g.map((p) => p.owner_id)).size >= 2)
          .map((g) => ({
            title: g[0].title,
            area: g[0].area,
            listingIds: g.map((p) => p.id),
            ownerCount: new Set(g.map((p) => p.owner_id)).size,
            signals: [`Same title + area posted by ${new Set(g.map((p) => p.owner_id)).size} different accounts`],
          }))
          .sort((a, b) => b.ownerCount - a.ownerCount)
          .slice(0, 50);
        return sendJson(res, 200, { cases });
      }

      if (action === "platform-stats" && method === "GET") {
        if (!hasPermission(ctx, "analytics.read") && ctx.role !== "super_admin") return sendJson(res, 403, { error: "Not authorized." });
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const count = async (table, filters = {}) => {
          let q = svc.from(table).select("*", { count: "exact", head: true });
          for (const [k, v] of Object.entries(filters)) q = q.gt(k, v);
          const { count: n } = await q;
          return n || 0;
        };
        const [usersTotal, users24h, users7d, properties, services, jobs, jobApplications, circles, events, messages24h] = await Promise.all([
          count("profiles"), count("profiles", { created_at: since24h }), count("profiles", { created_at: since7d }),
          count("properties"), count("services"), count("jobs"), count("job_applications"), count("circles"), count("events"),
          count("messages", { created_at: since24h }),
        ]);
        const { data: recentUsers } = await svc.from("profiles").select("id,name,email,country,created_at").order("created_at", { ascending: false }).limit(10);
        const { data: recentProperties } = await svc.from("properties").select("id,title,area,price,created_at").order("created_at", { ascending: false }).limit(10);
        return sendJson(res, 200, {
          totals: { users: usersTotal, properties, services, jobs, jobApplications, circles, events },
          activity: { users24h, users7d, messages24h },
          recent: { users: recentUsers || [], properties: recentProperties || [] },
        });
      }

      if (action === "sponsored" && method === "GET") {
        if (ctx.role !== "super_admin") return sendJson(res, 403, { error: "Super Admin only." });
        const { data, error } = await svc.from("sponsored_slots").select("*, properties(id,title,area,price,photo_url,photo_urls)").order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { slots: data || [] });
      }

      if (action === "sponsored" && method === "POST") {
        if (ctx.role !== "super_admin") return sendJson(res, 403, { error: "Super Admin only." });
        const body = await readBody(req);
        if (!body.developerName || !body.headline) return sendJson(res, 400, { error: "developerName and headline required" });
        const { data, error } = await svc.from("sponsored_slots").insert({
          property_id: body.propertyId || null,
          developer_name: body.developerName,
          headline: body.headline,
          badge_label: body.badgeLabel || "Sponsored",
          placement: body.placement === "investor" ? "investor" : "feed",
          created_by: null,
        }).select().maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        await writeAdminAudit(ctx.admin.id, "sponsored_slot_created", { targetType: "sponsored_slot", targetId: data.id });
        return sendJson(res, 200, { slot: data });
      }

      if (action === "sponsored" && method === "PATCH") {
        if (ctx.role !== "super_admin") return sendJson(res, 403, { error: "Super Admin only." });
        const body = await readBody(req);
        if (!body.id) return sendJson(res, 400, { error: "id required" });
        const { error } = await svc.from("sponsored_slots").update({ active: !!body.active }).eq("id", body.id);
        if (error) return sendJson(res, 400, { error: error.message });
        await writeAdminAudit(ctx.admin.id, "sponsored_slot_toggled", { targetType: "sponsored_slot", targetId: body.id });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "sponsored" && method === "DELETE") {
        if (ctx.role !== "super_admin") return sendJson(res, 403, { error: "Super Admin only." });
        const body = await readBody(req);
        if (!body.id) return sendJson(res, 400, { error: "id required" });
        const { error } = await svc.from("sponsored_slots").delete().eq("id", body.id);
        if (error) return sendJson(res, 400, { error: error.message });
        await writeAdminAudit(ctx.admin.id, "sponsored_slot_deleted", { targetType: "sponsored_slot", targetId: body.id, riskLevel: "medium" });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "admins" && method === "GET") {
        if (ctx.role !== "super_admin") return sendJson(res, 403, { error: "Super Admin only." });
        const { data, error } = await svc.from("admin_users").select("id, email, name, status, role_id, mfa_enabled, created_at, last_login_at, admin_roles(key, name)").order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { admins: data || [] });
      }

      if (action === "create-admin" && method === "POST") {
        if (ctx.role !== "super_admin") return sendJson(res, 403, { error: "Super Admin only." });
        const body = await readBody(req);
        const { email, name, roleKey } = body || {};
        if (!email || !name || !roleKey) return sendJson(res, 400, { error: "email, name, and roleKey are required." });
        const { data: role } = await svc.from("admin_roles").select("id").eq("key", roleKey).maybeSingle();
        if (!role) return sendJson(res, 400, { error: "Unknown role." });
        const activationCode = newActivationCode();
        const { data: created, error } = await svc.from("admin_users").insert({
          email: String(email).toLowerCase(),
          name,
          role_id: role.id,
          password_hash: "",
          status: "pending",
          activation_code: activationCode,
          activation_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          created_by: ctx.admin.id,
        }).select().maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        await writeAdminAudit(ctx.admin.id, "admin_created", { targetType: "admin_user", targetId: created.id, riskLevel: "high" });
        // Activation code is returned once, here, to the Super Admin only —
        // it is never stored anywhere in plaintext logs or emailed by this
        // endpoint. Deliver it to the new admin out-of-band.
        return sendJson(res, 200, { admin: created, activationCode });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ----------------------------------------------------------- /api/admin
    // NOTE: the old /api/admin route (gated only by a citizen-session
    // is_admin flag) has been removed on purpose — that was the exact
    // "citizen identity == admin identity" pattern doc 3 says not to
    // have. Its two real capabilities (platform stats, sponsored slot
    // management) now live under /api/console, gated by the real admin
    // RBAC session instead. See action=platform-stats and
    // action=sponsored below, inside the /api/console block.

    // ------------------------------------------------------ /api/assistant-usage
    // Merveil AI costs real money per message (Anthropic API), so usage is
    // capped by Passport tier: Ordinary gets a small daily allowance, Services
    // gets more, Investor is effectively unlimited. This can't live inside
    // assistant.js (a separate function we don't have the source for here),
    // so the frontend checks in with this endpoint before calling the
    // assistant, and logs afterward.
    if (resource === "assistant-usage") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      const { data: profile } = await sb.from("profiles").select("passport_tier").eq("id", user.id).maybeSingle();
      const tier = profile?.passport_tier || "ordinary";
      const LIMITS = { ordinary: 10, services: 25, investor: 100000 };
      const limit = LIMITS[tier] ?? LIMITS.ordinary;

      if (method === "GET" && req.query.action === "check") {
        const { data } = await sb.from("ai_usage").select("message_count").eq("user_id", user.id).eq("usage_date", new Date().toISOString().slice(0, 10)).maybeSingle();
        const used = data?.message_count || 0;
        return sendJson(res, 200, { allowed: used < limit, used, limit, tier });
      }

      if (method === "POST" && req.query.action === "log") {
        const { data: newCount } = await sb.rpc("increment_ai_usage", { uid: user.id });
        return sendJson(res, 200, { used: newCount, limit });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // -------------------------------------------------- /api/sponsored (public read)
    if (resource === "sponsored" && method === "GET") {
      const placement = req.query.placement === "investor" ? "investor" : "feed";
      const { data, error } = await anonClient()
        .from("sponsored_slots")
        .select("*, properties(id,title,area,price,photo_url,photo_urls)")
        .eq("placement", placement)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 200, { slots: data || [] });
    }
    if (resource === "music" && method === "GET") {
      const { data, error } = await anonClient().from("music_tracks").select("*").order("genre");
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 200, { tracks: data || [] });
    }

    // ----------------------------------------------------------- /api/jobs
    if (resource === "jobs") {
      const action = req.query.action;

      if (method === "GET" && action === "likes") {
        if (!user) return sendJson(res, 200, { likedIds: [] });
        const { data } = await sb.from("job_likes").select("job_id").eq("user_id", user.id);
        return sendJson(res, 200, { likedIds: (data || []).map((r) => r.job_id) });
      }

      if (method === "GET") {
        const { data, error } = await anonClient().from("jobs").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { jobs: data || [] });
      }

      if (method === "POST" && action === "view") {
        const body = await readBody(req);
        if (!body.jobId) return sendJson(res, 400, { error: "jobId required" });
        await anonClient().rpc("increment_job_views", { jid: body.jobId });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST" && action === "like") {
        if (!user) return sendJson(res, 401, { error: "Sign in to like jobs." });
        const body = await readBody(req);
        if (!body.jobId) return sendJson(res, 400, { error: "jobId required" });
        const { data, error } = await sb.rpc("toggle_job_like", { jid: body.jobId }).maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { liked: data.liked, likesCount: data.likes_count });
      }

      if (method === "POST" && action === "apply") {
        if (!user) return sendJson(res, 401, { error: "Sign in to apply." });
        const body = await readBody(req);
        const { error } = await sb.from("job_applications").upsert({
          job_id: body.jobId,
          applicant_id: user.id,
          message: body.message || null,
        });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to post a job." });
        const body = await readBody(req);
        const { data, error } = await sb
          .from("jobs")
          .insert({
            owner_id: user.id,
            title: body.title,
            category: body.category,
            job_type: body.jobType,
            salary_range: body.salaryRange,
            location: body.location,
            description: body.description,
            photo_url: body.photoUrls?.[0] || null,
            video_url: body.videoUrl || null,
            media_type: body.mediaType || (body.videoUrl ? "video" : "photo"),
            music_track_id: body.musicTrackId || null,
          })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { job: data });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ---------------------------------------------------------- /api/world
    // World — the 4th reel ecosystem: global networking (AI, technology,
    // investors, startups, government projects, universities, tourism,
    // innovation). Same shape as /api/jobs above, on its own table so it
    // doesn't collide with the UAE-scoped ecosystems.
    if (resource === "world") {
      const action = req.query.action;

      if (method === "GET" && action === "likes") {
        if (!user) return sendJson(res, 200, { likedIds: [] });
        const { data } = await sb.from("world_likes").select("world_post_id").eq("user_id", user.id);
        return sendJson(res, 200, { likedIds: (data || []).map((r) => r.world_post_id) });
      }

      if (method === "GET") {
        const { data, error } = await anonClient().from("world_posts").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) return sendJson(res, 400, { error: error.message });
        const posts = data || [];
        const ownerIds = [...new Set(posts.map((p) => p.owner_id).filter(Boolean))];
        let ownerMap = {};
        if (ownerIds.length) {
          const { data: owners } = await anonClient().from("profiles").select("id, name, avatar_url").in("id", ownerIds);
          ownerMap = Object.fromEntries((owners || []).map((o) => [o.id, o]));
        }
        const enriched = posts.map((p) => ({ ...p, owner_name: ownerMap[p.owner_id]?.name || null, owner_avatar: ownerMap[p.owner_id]?.avatar_url || null }));
        return sendJson(res, 200, { posts: enriched });
      }

      if (method === "POST" && action === "view") {
        const body = await readBody(req);
        if (!body.postId) return sendJson(res, 400, { error: "postId required" });
        await anonClient().rpc("increment_world_views", { pid: body.postId });
        await anonClient().from("world_post_views").insert({ world_post_id: body.postId, source: body.source || "world_feed" }).select().maybeSingle().catch(() => {});
        return sendJson(res, 200, { ok: true });
      }

      // Intelligent View Analytics — real breakdown of where views came
      // from (world feed, search, profile visit, etc.), not fabricated.
      if (method === "GET" && action === "view-sources") {
        if (!req.query.postId) return sendJson(res, 400, { error: "postId required" });
        const { data, error } = await anonClient().from("world_post_views").select("source").eq("world_post_id", req.query.postId);
        if (error) return sendJson(res, 400, { error: error.message });
        const counts = {};
        for (const r of data || []) counts[r.source] = (counts[r.source] || 0) + 1;
        return sendJson(res, 200, { counts, total: (data || []).length });
      }

      if (method === "POST" && action === "like") {
        if (!user) return sendJson(res, 401, { error: "Sign in to like World posts." });
        const body = await readBody(req);
        if (!body.postId) return sendJson(res, 400, { error: "postId required" });
        const { data, error } = await sb.rpc("toggle_world_like", { pid: body.postId }).maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { liked: data.liked, likesCount: data.likes_count });
      }

      if (method === "DELETE") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        if (!body.postId) return sendJson(res, 400, { error: "postId required" });
        const { error } = await sb.from("world_posts").delete().eq("id", body.postId).eq("owner_id", user.id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to post on World." });
        const body = await readBody(req);
        if (!body.title) return sendJson(res, 400, { error: "title required" });
        const { data, error } = await sb
          .from("world_posts")
          .insert({
            owner_id: user.id,
            title: body.title,
            topic: body.topic || "Innovation",
            country: body.country || "Global",
            description: body.description || null,
            photo_url: body.photoUrls?.[0] || null,
            photo_urls: body.photoUrls || null,
            video_url: body.videoUrl || null,
            media_type: body.mediaType || (body.videoUrl ? "video" : "photo"),
            music_track_id: body.musicTrackId || null,
            content_origin: body.contentOrigin === "ai" ? "ai" : "human",
          })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { post: data });
      }

      // Intelligent Engagement System — real reaction types beyond a like
      // (Support/Invest/Collaborate/Hire/Request Meeting). Counts are
      // computed live from world_reactions, never a caller-trusted number.
      if (method === "GET" && action === "reactions") {
        if (!req.query.postId) return sendJson(res, 400, { error: "postId required" });
        const { data, error } = await anonClient().from("world_reactions").select("reaction_type, user_id").eq("world_post_id", req.query.postId);
        if (error) return sendJson(res, 400, { error: error.message });
        const counts = {};
        for (const r of data || []) counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        const mine = user ? (data || []).filter((r) => r.user_id === user.id).map((r) => r.reaction_type) : [];
        return sendJson(res, 200, { counts, mine });
      }

      if (method === "POST" && action === "react") {
        if (!user) return sendJson(res, 401, { error: "Sign in to react." });
        const body = await readBody(req);
        const validTypes = ["support", "invest", "collaborate", "hire", "meeting"];
        if (!body.postId || !validTypes.includes(body.reactionType)) return sendJson(res, 400, { error: "postId and a valid reactionType required" });
        const { data: existing } = await sb.from("world_reactions").select("id").eq("world_post_id", body.postId).eq("user_id", user.id).eq("reaction_type", body.reactionType).maybeSingle();
        if (existing) {
          await sb.from("world_reactions").delete().eq("id", existing.id);
          return sendJson(res, 200, { active: false });
        }
        const { error } = await sb.from("world_reactions").insert({ world_post_id: body.postId, user_id: user.id, reaction_type: body.reactionType });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { active: true });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // -------------------------------------------------------- /api/rewards
    // Merveil Citizen Score — real points from real activity across all
    // four ecosystems (Pulse=properties, Souk=services, Work=jobs,
    // World=world_posts), plus a Passport-completion bonus. This is a
    // recognition/tier score, not a payout system — no AED figures are
    // invented here; the reward-pool payout mechanic needs a funded pool
    // and a real payment path before it can show real money (see notes
    // to the team).
    if (resource === "rewards" && method === "GET") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });

      const ecosystems = [
        { key: "pulse", table: "properties" },
        { key: "souk", table: "services" },
        { key: "work", table: "jobs" },
        { key: "world", table: "world_posts" },
      ];

      const breakdown = {};
      let activityScore = 0;
      for (const eco of ecosystems) {
        const { data, error } = await anonClient()
          .from(eco.table)
          .select("views, likes_count")
          .eq("owner_id", user.id);
        if (error) { breakdown[eco.key] = { posts: 0, views: 0, likes: 0, points: 0 }; continue; }
        const posts = data.length;
        const views = data.reduce((s, r) => s + (r.views || 0), 0);
        const likes = data.reduce((s, r) => s + (r.likes_count || 0), 0);
        const points = posts * 20 + Math.round(views / 10) + likes * 5;
        breakdown[eco.key] = { posts, views, likes, points };
        activityScore += points;
      }

      const { data: profile } = await anonClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
      const completionPct = profile ? [
        20,
        profile.avatar_url ? 15 : 0,
        profile.bio && profile.bio.length > 10 ? 15 : 0,
        profile.city ? 10 : 0,
        profile.profession ? 10 : 0,
        (profile.skills || []).length ? 10 : 0,
        (profile.languages || []).length ? 10 : 0,
        (profile.portfolio_url || profile.website_url) ? 10 : 0,
      ].reduce((a, b) => a + b, 0) : 20;
      const passportBonus = completionPct * 5; // up to 500 pts for a fully complete Passport

      const totalScore = activityScore + passportBonus;
      const tier = totalScore >= 5000 && completionPct >= 95 ? "Platinum"
        : totalScore >= 2000 && completionPct >= 80 ? "Gold"
        : totalScore >= 500 && completionPct >= 60 ? "Silver"
        : "Bronze";

      return sendJson(res, 200, {
        totalScore, activityScore, passportBonus, completionPct, tier, breakdown,
        rewardPoolStatus: "not_yet_funded", // honest — see team notes on the payout mechanic
      });
    }

    // --------------------------------------------------- /api/opportunities
    // AI Opportunity Radar — real matching (keyword overlap between the
    // signed-in user's profession/skills/languages and live jobs/World
    // posts), not a black-box "hundreds of signals" model. Honest scope:
    // a working recommendation feed, not the full Opportunity DNA vision.
    if (resource === "opportunities" && method === "GET") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      const { data: profile } = await anonClient().from("profiles").select("profession, skills, languages, city, country").eq("id", user.id).maybeSingle();
      const signals = [
        profile?.profession,
        ...(profile?.skills || []),
        ...(profile?.languages || []),
        profile?.city,
      ].filter(Boolean).map((s) => String(s).toLowerCase());

      if (signals.length === 0) {
        return sendJson(res, 200, { opportunities: [], reason: "no_signals" });
      }

      const [{ data: jobs }, { data: worldPosts }] = await Promise.all([
        anonClient().from("jobs").select("id, title, category, location, description, created_at").order("created_at", { ascending: false }).limit(100),
        anonClient().from("world_posts").select("id, title, topic, country, description, created_at").order("created_at", { ascending: false }).limit(100),
      ]);

      const score = (haystack) => {
        const h = (haystack || "").toLowerCase();
        return signals.reduce((s, sig) => s + (h.includes(sig) ? 1 : 0), 0);
      };

      const jobMatches = (jobs || []).map((j) => ({
        kind: "job", id: j.id, title: j.title, subtitle: j.category, meta: j.location,
        matchScore: score(`${j.title} ${j.category} ${j.description}`),
      })).filter((m) => m.matchScore > 0);

      const worldMatches = (worldPosts || []).map((w) => ({
        kind: "world", id: w.id, title: w.title, subtitle: w.topic, meta: w.country,
        matchScore: score(`${w.title} ${w.topic} ${w.description}`),
      })).filter((m) => m.matchScore > 0);

      const opportunities = [...jobMatches, ...worldMatches]
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 7);

      return sendJson(res, 200, { opportunities, signals });
    }

    // -------------------------------------------------------- /api/missions
    // Mission System (gamification) — real checks against actual activity,
    // not fake progress bars. Each mission reflects something the user
    // genuinely did in the last 7 days.
    if (resource === "missions" && method === "GET") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: profile } = await anonClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
      const completionPct = profile ? [
        20,
        profile.avatar_url ? 15 : 0,
        profile.bio && profile.bio.length > 10 ? 15 : 0,
        profile.city ? 10 : 0,
        profile.profession ? 10 : 0,
        (profile.skills || []).length ? 10 : 0,
        (profile.languages || []).length ? 10 : 0,
        (profile.portfolio_url || profile.website_url) ? 10 : 0,
      ].reduce((a, b) => a + b, 0) : 20;

      const [props, svcs, jobsPosted, worldPosted, convos] = await Promise.all([
        anonClient().from("properties").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("created_at", since),
        anonClient().from("services").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("created_at", since),
        anonClient().from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("created_at", since),
        anonClient().from("world_posts").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("created_at", since),
        sb.from("conversations").select("id", { count: "exact", head: true }).contains("participant_ids", [user.id]).gte("created_at", since),
      ]);
      const postedThisWeek = (props.count || 0) + (svcs.count || 0) + (jobsPosted.count || 0) + (worldPosted.count || 0);
      const connectionsThisWeek = convos.count || 0;

      const missions = [
        { id: "complete_passport", label: "Complete your Professional Passport to 80%", done: completionPct >= 80, points: 200 },
        { id: "post_content", label: "Publish on Pulse, Souk, Work, or World this week", done: postedThisWeek > 0, points: 100 },
        { id: "make_connection", label: "Start a new conversation this week", done: connectionsThisWeek > 0, points: 50 },
        { id: "engage", label: "Reach 60% Passport completion to comment & connect", done: completionPct >= 60, points: 50 },
      ];
      const completedCount = missions.filter((m) => m.done).length;
      return sendJson(res, 200, { missions, completedCount, total: missions.length });
    }

    // --------------------------------------------------- /api/connections
    // AI Intelligent Connection Suggestions — real similarity matching
    // against actual profiles (profession/skills/languages/city/country
    // overlap), the same honest approach as the Opportunity Radar. Not a
    // black-box "hundreds of signals" model — a real, explainable one.
    if (resource === "connections" && action === "suggestions" && method === "GET") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      const { data: me } = await anonClient().from("profiles").select("profession, skills, languages, city, country, account_type").eq("id", user.id).maybeSingle();
      const mySignals = [me?.profession, ...(me?.skills || []), ...(me?.languages || []), me?.city, me?.country].filter(Boolean).map((s) => String(s).toLowerCase());

      const { data: others } = await anonClient()
        .from("profiles")
        .select("id, name, avatar_url, profession, company_name, account_type, city, country, skills")
        .neq("id", user.id)
        .eq("discoverable", true)
        .limit(200);

      const scored = (others || []).map((p) => {
        const theirSignals = [p.profession, ...(p.skills || []), p.city, p.country].filter(Boolean).map((s) => String(s).toLowerCase());
        let score = 0;
        let reason = null;
        if (me?.profession && p.profession && String(p.profession).toLowerCase() === String(me.profession).toLowerCase()) { score += 3; reason = `Also works in ${p.profession}`; }
        if (me?.city && p.city && p.city === me.city) { score += 2; reason = reason || `Also based in ${p.city}`; }
        if (me?.country && p.country && p.country === me.country && !reason) { score += 1; reason = `Also in ${p.country}`; }
        for (const sig of mySignals) { if (theirSignals.some((t) => t.includes(sig) || sig.includes(t))) score += 1; }
        return { ...p, score, reason: reason || "Active on Merveil AI" };
      })
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return sendJson(res, 200, { suggestions: scored });
    }

    // -------------------------------------------------------- /api/favorites
    // Intelligent Connection Management — real favorites, not a UI-only tab.
    if (resource === "favorites") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      if (method === "GET") {
        const { data, error } = await sb.from("favorites").select("favorite_user_id").eq("user_id", user.id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { favoriteIds: (data || []).map((r) => r.favorite_user_id) });
      }
      if (method === "POST") {
        const body = await readBody(req);
        if (!body.userId) return sendJson(res, 400, { error: "userId required" });
        const { data: existing } = await sb.from("favorites").select("id").eq("user_id", user.id).eq("favorite_user_id", body.userId).maybeSingle();
        if (existing) {
          await sb.from("favorites").delete().eq("id", existing.id);
          return sendJson(res, 200, { favorited: false });
        }
        const { error } = await sb.from("favorites").insert({ user_id: user.id, favorite_user_id: body.userId });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { favorited: true });
      }
      return sendJson(res, 404, { error: "Not found" });
    }

    // ------------------------------------------------------- /api/comments
    // Shared across properties, services, jobs, and events via targetType/targetId.
    if (resource === "comments") {
      if (method === "GET") {
        const { targetType, targetId } = req.query;
        if (!targetType || !targetId) return sendJson(res, 400, { error: "targetType and targetId required" });
        const { data, error } = await anonClient()
          .from("comments")
          .select("id, body, user_id, created_at")
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (error) return sendJson(res, 400, { error: error.message });
        const userIds = [...new Set((data || []).map((c) => c.user_id))];
        let profileMap = {};
        if (userIds.length) {
          const { data: profs } = await anonClient().from("profiles").select("id, name, avatar_url").in("id", userIds);
          profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
        }
        const comments = (data || []).map((c) => ({ ...c, author: profileMap[c.user_id] || null }));
        return sendJson(res, 200, { comments });
      }

      if (method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in to comment." });
        const body = await readBody(req);
        if (!body.targetType || !body.targetId) return sendJson(res, 400, { error: "targetType and targetId required" });
        const text = (body.body || "").trim();
        if (!text) return sendJson(res, 400, { error: "Comment can't be empty." });
        if (text.length > 1000) return sendJson(res, 400, { error: "Comment is too long." });
        const { data, error } = await sb
          .from("comments")
          .insert({ target_type: body.targetType, target_id: body.targetId, user_id: user.id, body: text })
          .select()
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        const { data: prof } = await anonClient().from("profiles").select("id, name, avatar_url").eq("id", user.id).maybeSingle();
        return sendJson(res, 200, { comment: { ...data, author: prof || null } });
      }

      if (method === "DELETE") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        if (!body.id) return sendJson(res, 400, { error: "id required" });
        const { error } = await sb.from("comments").delete().eq("id", body.id).eq("user_id", user.id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // --------------------------------------------------- /api/profile-views
    if (resource === "profile-views") {
      if (method === "POST") {
        const body = await readBody(req);
        if (!body.viewedId) return sendJson(res, 400, { error: "viewedId required" });
        if (user && user.id === body.viewedId) return sendJson(res, 200, { ok: true }); // don't log self-views
        let viewerCountry = null;
        if (user) {
          const { data: viewerProf } = await anonClient().from("profiles").select("country").eq("id", user.id).maybeSingle();
          viewerCountry = viewerProf?.country || null;
        }
        await sb.from("profile_views").insert({
          viewed_id: body.viewedId,
          viewer_id: user?.id || null,
          viewer_country: viewerCountry,
        });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "GET") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const { data, error } = await sb
          .from("profile_views")
          .select("viewer_id, viewer_country, created_at")
          .eq("viewed_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return sendJson(res, 400, { error: error.message });
        const viewerIds = [...new Set((data || []).map((v) => v.viewer_id).filter(Boolean))];
        let profileMap = {};
        if (viewerIds.length) {
          const { data: profs } = await anonClient().from("profiles").select("id, name, avatar_url").in("id", viewerIds);
          profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
        }
        const { count: totalCount } = await sb.from("profile_views").select("*", { count: "exact", head: true }).eq("viewed_id", user.id);
        const views = (data || []).map((v) => ({
          viewer: v.viewer_id ? (profileMap[v.viewer_id] || null) : null,
          country: v.viewer_country,
          createdAt: v.created_at,
        }));
        return sendJson(res, 200, { views, totalCount: totalCount || 0 });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // ----------------------------------------------------- /api/analytics
    if (resource === "analytics") {
      if (method === "POST") {
        const body = await readBody(req);
        if (!body.eventType) return sendJson(res, 400, { error: "eventType required" });
        await sb.from("analytics_events").insert({
          event_type: body.eventType,
          feature: body.feature || null,
          user_id: user?.id || null,
          session_id: body.sessionId || null,
        });
        return sendJson(res, 200, { ok: true });
      }

      // Admin-only aggregate read — used by the dashboard.
      if (method === "GET") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const { data: me } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        if (!me?.is_admin) return sendJson(res, 403, { error: "Admin access only." });

        const since = new Date(Date.now() - (Number(req.query.days || 30) * 24 * 60 * 60 * 1000)).toISOString();

        const { count: totalVisits } = await sb.from("analytics_events").select("*", { count: "exact", head: true })
          .eq("event_type", "page_view").gt("created_at", since);

        const { data: sessionRows } = await sb.from("analytics_events").select("session_id, user_id")
          .eq("event_type", "page_view").gt("created_at", since);
        const uniqueVisitors = new Set((sessionRows || []).map((r) => r.user_id || r.session_id).filter(Boolean)).size;

        const { data: featureRows } = await sb.from("analytics_events").select("feature")
          .eq("event_type", "page_view").gt("created_at", since).not("feature", "is", null);
        const featureCounts = {};
        for (const r of featureRows || []) featureCounts[r.feature] = (featureCounts[r.feature] || 0) + 1;
        const topFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]).map(([feature, count]) => ({ feature, count }));

        return sendJson(res, 200, { totalVisits: totalVisits || 0, uniqueVisitors, topFeatures, sinceDays: Number(req.query.days || 30) });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // --------------------------------------------------------- /api/people
    if (resource === "people") {
      const action = req.query.action;

      if (action === "candidate" && method === "GET") {
        if (!user) return sendJson(res, 200, { profile: null });
        const { data } = await sb.from("candidate_profiles").select("*").eq("user_id", user.id).maybeSingle();
        return sendJson(res, 200, { profile: data || null });
      }

      if (action === "candidate" && method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        const { error } = await sb.from("candidate_profiles").upsert({
          user_id: user.id,
          category: body.category,
          emirate: body.emirate,
          experience: body.experience,
          languages: body.languages || [],
          updated_at: new Date().toISOString(),
        });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (action === "profile" && method === "GET") {
        const userId = req.query.userId;
        if (!userId) return sendJson(res, 400, { error: "userId required" });
        const { data, error } = await anonClient()
          .from("profiles")
          .select("id, name, avatar_url, junction_id, passport_tier, country, bio, created_at, account_type, company_name")
          .eq("id", userId)
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        if (!data) return sendJson(res, 404, { error: "Not found" });

        const { data: listings } = await anonClient()
          .from("properties")
          .select("id, title, area, emirate, price, listing_type, category, photo_url, photo_urls, views, likes_count, created_at")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(24);

        const totalLikes = (listings || []).reduce((sum, l) => sum + (l.likes_count || 0), 0);
        const totalViews = (listings || []).reduce((sum, l) => sum + (l.views || 0), 0);

        return sendJson(res, 200, {
          profile: data,
          listings: (listings || []).map((l) => ({
            id: `db-${l.id}`, title: l.title, area: l.area, emirate: l.emirate, price: l.price,
            type: l.listing_type || "Sale", category: l.category,
            photo_url: l.photo_url, photo_urls: l.photo_urls, views: l.views || 0, likesCount: l.likes_count || 0,
          })),
          stats: { listingCount: (listings || []).length, totalLikes, totalViews },
        });
      }

      if (action === "profile" && method === "PATCH") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        const fields = {};
        if (body.name !== undefined) fields.name = body.name;
        if (body.bio !== undefined) fields.bio = body.bio;
        if (body.avatarUrl !== undefined) fields.avatar_url = body.avatarUrl;
        if (body.backgroundId !== undefined) fields.background_id = body.backgroundId;
        if (body.passportTier !== undefined) fields.passport_tier = body.passportTier;
        if (body.roleLabel !== undefined) fields.role_label = body.roleLabel;
        // Professional Passport progressive-completion fields.
        if (body.city !== undefined) fields.city = body.city;
        if (body.profession !== undefined) fields.profession = body.profession;
        if (body.companyName !== undefined) fields.company_name = body.companyName;
        if (body.skills !== undefined) fields.skills = body.skills;
        if (body.languages !== undefined) fields.languages = body.languages;
        if (body.portfolioUrl !== undefined) fields.portfolio_url = body.portfolioUrl;
        if (body.websiteUrl !== undefined) fields.website_url = body.websiteUrl;
        const { data, error } = await sb.from("profiles").update(fields).eq("id", user.id).select().maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { user: mapProfile(data) });
      }

      if (action === "video-upload-url" && method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const body = await readBody(req);
        const safeName = (body.fileName || "video.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `reels/${user.id}/${Date.now()}-${safeName}`;
        const { data, error } = await sb.storage.from("uploads").createSignedUploadUrl(path);
        if (error) return sendJson(res, 400, { error: error.message });
        const { data: pub } = sb.storage.from("uploads").getPublicUrl(path);
        return sendJson(res, 200, { signedUrl: data.signedUrl, token: data.token, path, publicUrl: pub.publicUrl });
      }

      if (action === "upload" && method === "POST") {
        if (!user) return sendJson(res, 401, { error: "Sign in required." });
        const form = formidable({ maxFileSize: 15 * 1024 * 1024 });
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];
        if (!file) return sendJson(res, 400, { error: "No file provided." });
        const folder = fields.folder?.[0] || "misc";
        const fs = await import("fs");
        const buffer = fs.readFileSync(file.filepath);
        const safeName = (file.originalFilename || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${folder}/${user.id}/${Date.now()}-${safeName}`;
        const { error } = await sb.storage.from("uploads").upload(path, buffer, {
          contentType: file.mimetype || "application/octet-stream",
        });
        if (error) return sendJson(res, 400, { error: error.message });
        const { data: pub } = sb.storage.from("uploads").getPublicUrl(path);
        return sendJson(res, 200, { url: pub.publicUrl, name: safeName, size: file.size, contentType: file.mimetype });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    return sendJson(res, 404, { error: "Unknown API route" });
  } catch (e) {
    return sendJson(res, 500, { error: e.message || "Server error" });
  }
}
