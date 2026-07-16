// /api/circles/[code]/posts — GET posts for a circle, POST create one
// Vercel dynamic route: the [code] segment is available as req.query.code
//
// SECURITY: POST now uses the SESSION-VERIFIED user as author_id, never
// a client-supplied one — previously anyone could post in a circle and
// claim it was written by any authorId they wanted.

import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const { code } = req.query;
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, type, title, body, visibility, created_at
        FROM circle_posts WHERE circle_code = ${code}
        ORDER BY created_at DESC LIMIT 50
      `;
      res.status(200).json({ posts: rows });
      return;
    }
    if (req.method === 'POST') {
      const me = requireAuth(req, res);
      if (!me) return;
      const { type, title, body, visibility } = req.body || {};
      if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
      }
      const rows = await sql`
        INSERT INTO circle_posts (circle_code, author_id, type, title, body, visibility)
        VALUES (${code}, ${me}, ${type || 'announcement'}, ${title}, ${body || null}, ${visibility || 'public'})
        RETURNING id, title, created_at
      `;
      res.status(201).json({ post: rows[0] });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
