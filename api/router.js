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
        const { email, password } = body || {};
        if (!email || !password) return sendJson(res, 400, { error: "Email and password are required." });
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
              email,
              name: email.split("@")[0],
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
        const { email, password, name, country, age, accountType, companyName, phone } = body || {};
        if (!email || !password || !name) return sendJson(res, 400, { error: "Name, email and password are required." });
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
          options: { emailRedirectTo: "https://www.junction.technology" },
        });
        if (error) return sendJson(res, 400, { error: error.message });

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
            email,
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

        // Persistent welcome message from Junction AI — not just a toast, so
        // there's a permanent, checkable record that every user was told
        // this is a pre-launch test phase.
        try {
          const admin = adminClient();
          const JUNCTION_AI_ID = "00000000-0000-0000-0000-000000000001";
          const { data: aiProfile } = await admin.from("profiles").select("id").eq("id", JUNCTION_AI_ID).maybeSingle();
          if (!aiProfile) {
            await admin.from("profiles").insert({
              id: JUNCTION_AI_ID,
              email: "ai@junction.technology",
              name: "Junction AI",
              junction_id: "JCT-AI-0001",
              passport_tier: "investor",
              is_admin: false,
              discoverable: false,
            });
          }
          const { data: convo } = await admin
            .from("conversations")
            .insert({ participant_ids: [userId, JUNCTION_AI_ID] })
            .select()
            .maybeSingle();
          if (convo?.id) {
            await admin.from("messages").insert({
              conversation_id: convo.id,
              sender_id: JUNCTION_AI_ID,
              body:
                `Welcome to Junction, ${name}! I'm Junction AI, here to help you find property, ` +
                `connect with verified people, and get things done across the platform. Explore Pulse, ` +
                `Connect, Souk, Work, and Passport — everything is live and yours to try.\n\n` +
                `A quick note: Junction is currently in test phase #001, ahead of our official public ` +
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
        const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
        const [, files] = await form.parse(req);
        const file = files.file?.[0];
        if (!file) return sendJson(res, 400, { error: "No file uploaded." });

        const mimetype = file.mimetype || "";
        const fs = await import("fs");
        const buffer = fs.readFileSync(file.filepath);
        const base64 = buffer.toString("base64");

        let contentBlock;
        if (mimetype === "application/pdf") {
          contentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
        } else if (mimetype.startsWith("image/")) {
          contentBlock = { type: "image", source: { type: "base64", media_type: mimetype, data: base64 } };
        } else {
          return sendJson(res, 400, {
            error: "Junction AI can read PDFs and photos/scans of a rent roll or sale sheet right now. For Excel files, export or save as PDF first, or use CSV upload.",
          });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          return sendJson(res, 500, { error: "AI document reading isn't configured on the server yet (missing ANTHROPIC_API_KEY)." });
        }

        const prompt =
          "You are Junction's inventory analyst. This document is a rent roll, sale sheet, or property/unit list — " +
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
          return sendJson(res, 502, { error: "Couldn't reach Junction AI — try again in a moment." });
        }
        const aiData = await aiRes.json();
        if (!aiRes.ok) {
          return sendJson(res, 502, { error: aiData?.error?.message || "Junction AI couldn't read this file." });
        }
        const text = (aiData.content || []).find((c) => c.type === "text")?.text || "";
        let units;
        try {
          const cleaned = text.replace(/```json|```/g, "").trim();
          units = JSON.parse(cleaned);
          if (!Array.isArray(units)) throw new Error("not an array");
        } catch (e) {
          return sendJson(res, 502, {
            error: "Junction AI read the file but couldn't structure it into units — try a clearer scan, or a CSV export instead.",
          });
        }
        // Fill in occupancyStatus from status/tenantName the same way manual CSV rows are, so
        // downstream lease-intelligence logic (vacancy/renewal stats) works identically either way.
        units = units.map((u) => ({ ...u, occupancyStatus: u.tenantName ? "occupied" : "vacant" }));
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
        const { data: existing, error: checkErr } = await sb.from("property_likes").select("*").eq("property_id", body.propertyId).eq("user_id", user.id).maybeSingle();
        if (checkErr) return sendJson(res, 400, { error: checkErr.message });
        if (existing) {
          const { error: delErr } = await sb.from("property_likes").delete().eq("property_id", body.propertyId).eq("user_id", user.id);
          if (delErr) return sendJson(res, 400, { error: delErr.message });
          await sb.rpc("adjust_property_likes", { pid: body.propertyId, delta: -1 });
          const { data: row } = await anonClient().from("properties").select("likes_count").eq("id", body.propertyId).maybeSingle();
          return sendJson(res, 200, { liked: false, likesCount: row?.likes_count ?? 0 });
        }
        const { error: insErr } = await sb.from("property_likes").insert({ property_id: body.propertyId, user_id: user.id });
        if (insErr) return sendJson(res, 400, { error: insErr.message });
        await sb.rpc("adjust_property_likes", { pid: body.propertyId, delta: 1 });
        const { data: row2 } = await anonClient().from("properties").select("likes_count").eq("id", body.propertyId).maybeSingle();
        return sendJson(res, 200, { liked: true, likesCount: row2?.likes_count ?? 0 });
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
        const { data: existing, error: checkErr } = await sb.from("service_likes").select("*").eq("service_id", body.serviceId).eq("user_id", user.id).maybeSingle();
        if (checkErr) return sendJson(res, 400, { error: checkErr.message });
        if (existing) {
          const { error: delErr } = await sb.from("service_likes").delete().eq("service_id", body.serviceId).eq("user_id", user.id);
          if (delErr) return sendJson(res, 400, { error: delErr.message });
          await sb.rpc("adjust_service_likes", { sid: body.serviceId, delta: -1 });
          const { data: row } = await anonClient().from("services").select("likes_count").eq("id", body.serviceId).maybeSingle();
          return sendJson(res, 200, { liked: false, likesCount: row?.likes_count ?? 0 });
        }
        const { error: insErr } = await sb.from("service_likes").insert({ service_id: body.serviceId, user_id: user.id });
        if (insErr) return sendJson(res, 400, { error: insErr.message });
        await sb.rpc("adjust_service_likes", { sid: body.serviceId, delta: 1 });
        const { data: row2 } = await anonClient().from("services").select("likes_count").eq("id", body.serviceId).maybeSingle();
        return sendJson(res, 200, { liked: true, likesCount: row2?.likes_count ?? 0 });
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
        for (const row of data || []) presence[row.user_id] = row.status;
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

      // Directory: browse discoverable Junction users to chat with —
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
        const body = await readBody(req);
        const { data, error } = await sb
          .from("events")
          .insert({
            organizer_id: user?.id || null,
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
          const { data: ev } = await sb.from("events").select("going_count").eq("id", body.eventId).maybeSingle();
          await sb.from("events").update({ going_count: (ev?.going_count || 0) + 1 }).eq("id", body.eventId);
          return sendJson(res, 200, { ticket: { ticket_code: code } });
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
        const { data: existing, error: checkErr } = await sb.from("event_likes").select("*").eq("event_id", body.eventId).eq("user_id", user.id).maybeSingle();
        if (checkErr) return sendJson(res, 400, { error: checkErr.message });
        if (existing) {
          const { error: delErr } = await sb.from("event_likes").delete().eq("event_id", body.eventId).eq("user_id", user.id);
          if (delErr) return sendJson(res, 400, { error: delErr.message });
          await sb.rpc("adjust_event_likes", { eid: body.eventId, delta: -1 });
          const { data: row } = await anonClient().from("events").select("likes_count").eq("id", body.eventId).maybeSingle();
          return sendJson(res, 200, { liked: false, likesCount: row?.likes_count ?? 0 });
        }
        const { error: insErr } = await sb.from("event_likes").insert({ event_id: body.eventId, user_id: user.id });
        if (insErr) return sendJson(res, 400, { error: insErr.message });
        await sb.rpc("adjust_event_likes", { eid: body.eventId, delta: 1 });
        const { data: row2 } = await anonClient().from("events").select("likes_count").eq("id", body.eventId).maybeSingle();
        return sendJson(res, 200, { liked: true, likesCount: row2?.likes_count ?? 0 });
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
    // Junction AI costs real money per message (Anthropic API), so usage is
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
        const { data: existing, error: checkErr } = await sb.from("job_likes").select("*").eq("job_id", body.jobId).eq("user_id", user.id).maybeSingle();
        if (checkErr) return sendJson(res, 400, { error: checkErr.message });
        if (existing) {
          const { error: delErr } = await sb.from("job_likes").delete().eq("job_id", body.jobId).eq("user_id", user.id);
          if (delErr) return sendJson(res, 400, { error: delErr.message });
          await sb.rpc("adjust_job_likes", { jid: body.jobId, delta: -1 });
          const { data: row } = await anonClient().from("jobs").select("likes_count").eq("id", body.jobId).maybeSingle();
          return sendJson(res, 200, { liked: false, likesCount: row?.likes_count ?? 0 });
        }
        const { error: insErr } = await sb.from("job_likes").insert({ job_id: body.jobId, user_id: user.id });
        if (insErr) return sendJson(res, 400, { error: insErr.message });
        await sb.rpc("adjust_job_likes", { jid: body.jobId, delta: 1 });
        const { data: row2 } = await anonClient().from("jobs").select("likes_count").eq("id", body.jobId).maybeSingle();
        return sendJson(res, 200, { liked: true, likesCount: row2?.likes_count ?? 0 });
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
          .select("id, name, avatar_url, junction_id, passport_tier, country")
          .eq("id", userId)
          .maybeSingle();
        if (error) return sendJson(res, 400, { error: error.message });
        if (!data) return sendJson(res, 404, { error: "Not found" });
        return sendJson(res, 200, { profile: data });
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
