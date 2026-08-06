import formidable from "formidable";
import { createClient } from "@supabase/supabase-js";
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

    // ----------------------------------------------------------- /api/admin
    if (resource === "admin") {
      if (!user) return sendJson(res, 401, { error: "Sign in required." });
      const { data: me } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!me?.is_admin) return sendJson(res, 403, { error: "Admin access only." });

      if (req.query.action === "stats" && method === "GET") {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const count = async (table, filters = {}) => {
          let q = sb.from(table).select("*", { count: "exact", head: true });
          for (const [k, v] of Object.entries(filters)) q = q.gt(k, v);
          const { count: n } = await q;
          return n || 0;
        };
        const [
          usersTotal, users24h, users7d,
          properties, services, jobs, jobApplications, circles, events, messages24h,
        ] = await Promise.all([
          count("profiles"), count("profiles", { created_at: since24h }), count("profiles", { created_at: since7d }),
          count("properties"), count("services"), count("jobs"), count("job_applications"), count("circles"), count("events"),
          count("messages", { created_at: since24h }),
        ]);
        const { data: recentUsers } = await sb.from("profiles").select("id,name,email,country,created_at").order("created_at", { ascending: false }).limit(10);
        const { data: recentProperties } = await sb.from("properties").select("id,title,area,price,created_at").order("created_at", { ascending: false }).limit(10);
        const { data: recentApplications } = await sb.from("job_applications").select("id,job_id,applicant_id,created_at").order("created_at", { ascending: false }).limit(10);
        return sendJson(res, 200, {
          totals: { users: usersTotal, properties, services, jobs, jobApplications, circles, events },
          activity: { users24h, users7d, messages24h },
          recent: { users: recentUsers || [], properties: recentProperties || [], applications: recentApplications || [] },
        });
      }

      if (req.query.action === "sponsored" && method === "GET") {
        const { data, error } = await sb.from("sponsored_slots").select("*, properties(id,title,area,price,photo_url,photo_urls)").order("created_at", { ascending: false });
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { slots: data || [] });
      }

      if (req.query.action === "sponsored" && method === "POST") {
        const body = await readBody(req);
        if (!body.developerName || !body.headline) return sendJson(res, 400, { error: "developerName and headline required" });
        const { data, error } = await sb.from("sponsored_slots").insert({
          property_id: body.propertyId || null,
          developer_name: body.developerName,
          headline: body.headline,
          badge_label: body.badgeLabel || "Sponsored",
          placement: body.placement === "investor" ? "investor" : "feed",
          created_by: user.id,
        }).select().maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { slot: data });
      }

      if (req.query.action === "sponsored" && method === "PATCH") {
        const body = await readBody(req);
        if (!body.id) return sendJson(res, 400, { error: "id required" });
        const { error } = await sb.from("sponsored_slots").update({ active: !!body.active }).eq("id", body.id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      if (req.query.action === "sponsored" && method === "DELETE") {
        const body = await readBody(req);
        if (!body.id) return sendJson(res, 400, { error: "id required" });
        const { error } = await sb.from("sponsored_slots").delete().eq("id", body.id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 404, { error: "Not found" });
    }

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
