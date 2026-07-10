// /api/views — POST log a view, GET count for a target
// POST { targetType, targetId, viewerId } → logs a view + increments properties.views if applicable
// GET  ?targetType=property&targetId=...  → { count }
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { targetType, targetId } = req.query;
      if (!targetType || !targetId) {
        res.status(400).json({ error: 'targetType and targetId query params are required' });
        return;
      }
      const rows = await sql`
        SELECT COUNT(*) AS count FROM profile_views
        WHERE target_type = ${targetType} AND target_id = ${targetId}
      `;
      res.status(200).json({ count: Number(rows[0].count) });
      return;
    }
    if (req.method === 'POST') {
      const { targetType, targetId, viewerId } = req.body || {};
      if (!targetType || !targetId) {
        res.status(400).json({ error: 'targetType and targetId are required' });
        return;
      }
      await sql`
        INSERT INTO profile_views (target_type, target_id, viewer_id)
        VALUES (${targetType}, ${targetId}, ${viewerId || null})
      `;
      if (targetType === 'property') {
        await sql`UPDATE properties SET views = views + 1 WHERE id = ${targetId}`;
      }
      res.status(201).json({ logged: true });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
