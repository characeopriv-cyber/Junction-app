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
const REFRESH_COOKIE_NAME = "jx_rt";

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
