import { createClient } from "@supabase/supabase-js";

// The Supabase URL + anon key are safe to ship in server code (and even
// client code) — they are public identifiers, not secrets. Every table
// they can touch is protected by Postgres Row Level Security, and writes
// only succeed when the request is scoped to a real, signed-in user's
// access token (see userClient() below). There is no service-role key
// anywhere in this project on purpose.
const SUPABASE_URL = "https://dixfybqlepticyudikuz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGZ5YnFsZXB0aWN5dWRpa3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDM2NzQsImV4cCI6MjA5OTcxOTY3NH0._U9bEobzrQbdHxyu6NiRsvGzzeCmXaEX7HvJZJisSqg";

const COOKIE_NAME = "jx_at";

// Anonymous client — used for public reads and for signIn/signUp calls
// themselves (which don't need a prior session).
export function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// A client scoped to one signed-in user's access token, so every
// PostgREST call it makes runs with that user's auth.uid() for RLS.
export function userClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
  });
}

export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

export function getAccessToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

export function setSessionCookie(res, accessToken, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(accessToken)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`
  );
}

// Resolves the calling user (if any) from the session cookie. Returns
// { token, user } where user is the Supabase auth user object, or
// { token: null, user: null } for anonymous requests.
export async function getSession(req) {
  const token = getAccessToken(req);
  if (!token) return { token: null, user: null };
  const client = userClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return { token: null, user: null };
  return { token, user: data.user };
}

export function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").end(JSON.stringify(body));
}

export function junctionIdFor(uuid) {
  return "JX-" + uuid.replace(/-/g, "").slice(0, 7).toUpperCase();
}
