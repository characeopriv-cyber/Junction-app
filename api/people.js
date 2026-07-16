// /api/people — Passport profile editing, job-matching candidate
// profiles, AND media uploads, all folded into ONE serverless function.
// This looks unusual, but Vercel's Hobby plan caps a deployment at 12
// functions total — folding three small, related concerns into one
// file (routed by ?action=) buys headroom without losing anything.
// If/when this project moves to Vercel Pro, these can be split back
// into separate files with zero code changes beyond the routing.
//
// Actions: ?action=profile | ?action=candidate | ?action=upload
//
// Required tables/columns (adjust `users` column names if yours differ):
//
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS junction_id TEXT UNIQUE;
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS background_id TEXT DEFAULT 'junction-default';
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_tier TEXT DEFAULT 'ordinary';
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS role_label TEXT DEFAULT 'client';
//
//   CREATE TABLE IF NOT EXISTS candidate_profiles (
//     user_id     TEXT PRIMARY KEY,
//     category    TEXT NOT NULL,
//     emirate     TEXT,
//     experience  TEXT,
//     languages   JSONB,
//     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
// Requires: npm install @vercel/blob formidable
// Requires: Blob store enabled on this project (Vercel dashboard → Storage)

import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { IncomingForm } from 'formidable';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);

// bodyParser must be OFF at the file level so uploads (multipart) work;
// for the JSON actions (profile/candidate) we parse the raw body ourselves.
export const config = { api: { bodyParser: false } };

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFileSize: 25 * 1024 * 1024, multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err); else resolve({ fields, files });
    });
  });
}

async function handleProfile(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const rows = await sql`
      SELECT id, name, email, bio, junction_id, avatar_url, background_id, passport_tier, role_label
      FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: rows[0] });
  }
  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const { userId, name, bio, avatarUrl, backgroundId, roleLabel, passportTier } = body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (passportTier && !['ordinary', 'services', 'investor'].includes(passportTier)) {
      return res.status(400).json({ error: 'passportTier must be ordinary, services, or investor' });
    }
    const rows = await sql`
      UPDATE users SET
        name = COALESCE(${name || null}, name),
        bio = COALESCE(${bio ?? null}, bio),
        avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
        background_id = COALESCE(${backgroundId || null}, background_id),
        role_label = COALESCE(${roleLabel || null}, role_label),
        passport_tier = COALESCE(${passportTier || null}, passport_tier)
      WHERE id = ${userId}
      RETURNING id, name, email, bio, junction_id, avatar_url, background_id, passport_tier, role_label
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: rows[0] });
  }
  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCandidate(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const rows = await sql`
      SELECT user_id, category, emirate, experience, languages
      FROM candidate_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    if (rows.length === 0) return res.status(200).json({ profile: null });
    const r = rows[0];
    return res.status(200).json({ profile: { category: r.category, emirate: r.emirate, experience: r.experience, languages: r.languages || [] } });
  }
  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const { userId, category, emirate, experience, languages } = body || {};
    if (!userId || !category) return res.status(400).json({ error: 'userId and category are required' });
    await sql`
      INSERT INTO candidate_profiles (user_id, category, emirate, experience, languages, updated_at)
      VALUES (${userId}, ${category}, ${emirate || null}, ${experience || null}, ${JSON.stringify(languages || [])}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        category = ${category}, emirate = ${emirate || null}, experience = ${experience || null},
        languages = ${JSON.stringify(languages || [])}, updated_at = now()
    `;
    return res.status(200).json({ success: true });
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleUpload(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { fields, files } = await parseForm(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: "No file provided (expected field name 'file')" });
  const folder = (Array.isArray(fields.folder) ? fields.folder[0] : fields.folder) || 'chat';
  const buffer = fs.readFileSync(file.filepath);
  const safeName = (file.originalFilename || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const key = `${folder}/${Date.now()}-${safeName}`;
  const blob = await put(key, buffer, { access: 'public', contentType: file.mimetype || 'application/octet-stream' });
  return res.status(200).json({ url: blob.url, size: file.size, contentType: file.mimetype, name: safeName });
}

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    if (action === 'candidate') return handleCandidate(req, res);
    if (action === 'upload') return handleUpload(req, res);
    if (action === 'profile' || !action) return handleProfile(req, res);
    return res.status(400).json({ error: 'Unknown action — expected profile, candidate, or upload' });
  } catch (e) {
    console.error('api/people error:', e);
    return res.status(500).json({ error: e.message });
  }
}
