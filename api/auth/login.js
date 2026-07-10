// /api/auth/login — POST { email, password } → { user }
import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';

const sql = neon(process.env.DATABASE_URL);

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = createHash('sha256').update(salt + password).digest('hex');
  return check === hash;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    const rows = await sql`SELECT id, email, name, role, password_hash FROM users WHERE email = ${email}`;
    if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const { password_hash, ...user } = rows[0];
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
