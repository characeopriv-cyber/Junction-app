// /api/auth/register — real account creation, backed by Neon Postgres
//
// POST { email, password, name, role? } → { user }, sets a real session cookie.

import { neon } from '@neondatabase/serverless';
import { createHash, randomBytes } from 'crypto';
import { setSessionCookie } from '../../lib/auth.js';

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password, salt) {
  return createHash('sha256').update(salt + password).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email, password, name, role } = req.body || {};
    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password, and name are required' });
      return;
    }
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${hashPassword(password, salt)}`;
    const rows = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email}, ${passwordHash}, ${name}, ${role || 'BUYER'})
      RETURNING id, email, name, role, created_at
    `;
    const user = rows[0];
    setSessionCookie(res, user.id);
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
