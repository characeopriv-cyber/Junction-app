// /api/services — GET list, POST create (jobs + services marketplace)
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, title, category, area, price_text, description, views, created_at
        FROM services WHERE status = 'active'
        ORDER BY created_at DESC LIMIT 100
      `;
      res.status(200).json({ services: rows });
      return;
    }
    if (req.method === 'POST') {
      const { title, category, area, priceText, description, ownerId } = req.body || {};
      if (!title || !category) {
        res.status(400).json({ error: 'title and category are required' });
        return;
      }
      const rows = await sql`
        INSERT INTO services (title, category, area, price_text, description, owner_id)
        VALUES (${title}, ${category}, ${area || null}, ${priceText || null}, ${description || null}, ${ownerId || null})
        RETURNING id, title, category, created_at
      `;
      res.status(201).json({ service: rows[0] });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
