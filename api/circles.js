// /api/circles — GET list (with real member counts), POST create a new circle
// PATCH /api/circles?code=XX&userId=... → join a circle
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      if (userId) {
        const mine = await sql`
          SELECT c.code, c.name, c.flag FROM circles c
          JOIN circle_members m ON m.circle_code = c.code
          WHERE m.user_id = ${userId}
        `;
        res.status(200).json({ circles: mine });
        return;
      }
      const rows = await sql`
        SELECT c.code, c.name, c.flag,
          COUNT(m.user_id) AS total
        FROM circles c
        LEFT JOIN circle_members m ON m.circle_code = c.code
        GROUP BY c.code, c.name, c.flag
        ORDER BY total DESC
      `;
      res.status(200).json({ circles: rows });
      return;
    }

    if (req.method === 'POST') {
      const { name, flag, createdBy } = req.body || {};
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const code = name.trim().slice(0, 3).toUpperCase() + Math.floor(Math.random() * 90 + 10);
      const rows = await sql`
        INSERT INTO circles (code, name, flag, created_by)
        VALUES (${code}, ${name.trim()}, ${flag || '🏳️'}, ${createdBy || null})
        RETURNING code, name, flag
      `;
      if (createdBy) {
        await sql`INSERT INTO circle_members (circle_code, user_id) VALUES (${code}, ${createdBy}) ON CONFLICT DO NOTHING`;
      }
      res.status(201).json({ circle: rows[0] });
      return;
    }

    if (req.method === 'PATCH') {
      const { code, userId } = req.body || {};
      if (!code || !userId) {
        res.status(400).json({ error: 'code and userId are required' });
        return;
      }
      await sql`INSERT INTO circle_members (circle_code, user_id) VALUES (${code}, ${userId}) ON CONFLICT DO NOTHING`;
      res.status(200).json({ joined: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
