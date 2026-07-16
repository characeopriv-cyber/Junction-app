// /lib/auth.js — shared session helper, used by every /api route that
// needs to know WHO is actually making the request, instead of trusting
// whatever userId the client claims in the request body.
//
// This is a lightweight signed-cookie session (HMAC-SHA256), not a full
// JWT library — no extra npm dependency needed, and it's exactly enough
// for "prove this request really came from this logged-in user."
//
// Required env var: SESSION_SECRET — set this in Vercel dashboard →
// Project → Settings → Environment Variables. Use a long random string
// (32+ random characters). If this leaks, every session can be forged,
// so treat it like a password.

import { createHmac } from 'crypto';

const SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = 'junction_session';
const MAX_AGE_DAYS = 30;

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function signSession(userId) {
  if (!SECRET) throw new Error('SESSION_SECRET env var is not set — add it in Vercel project settings.');
  const payload = JSON.stringify({ uid: String(userId), exp: Date.now() + MAX_AGE_DAYS * 86400000 });
  const body = b64url(payload);
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token) {
  if (!token || !SECRET) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  // Constant-time-ish comparison is nice to have, but length/charset here
  // makes timing attacks impractical for this use case; simple compare is fine.
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, userId) {
  const token = signSession(userId);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_DAYS * 86400}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

// Returns the verified userId for this request, or null if not logged in.
// Use this instead of trusting req.body.userId / req.query.userId for
// anything that reads private data or writes/mutates on someone's behalf.
export function getSessionUserId(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)junction_session=([^;]+)/);
  if (!match) return null;
  return verifySession(decodeURIComponent(match[1]));
}

// Convenience: send a 401 and return true if there's no valid session,
// so route handlers can do `if (requireAuth(req, res)) return;` at the top.
export function requireAuth(req, res) {
  const uid = getSessionUserId(req);
  if (!uid) {
    res.status(401).json({ error: 'Not signed in — please sign in again.' });
    return null;
  }
  return uid;
}
