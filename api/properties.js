// /api/properties — real database-backed property list & create
//
// Same pattern as /api/assistant.js: Vercel auto-deploys this from the
// /api folder. Uses @neondatabase/serverless, which needs no build step
// and works in Vercel's serverless functions out of the box.
//
// Setup (one time):
//   1. npm install @neondatabase/serverless   (add to package.json, commit it)
//   2. In Vercel → Settings → Environment Variables, add DATABASE_URL
//      (copy this from your Neon project dashboard — "Connection string")
//   3. Run schema.sql once in Neon's SQL Editor
//   4. Redeploy
//
// GET  /api/properties            → list active public properties
// GET  /api/properties?mine=1     → (future) filter by owner
// POST /api/properties            → create a new property { title, area, emirate, price, beds, baths, sqft }

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, title, area, emirate, price, beds, baths, sqft, views, created_at
        FROM properties
        WHERE status = 'active' AND visibility = 'public'
        ORDER BY created_at DESC
        LIMIT 100
      `;
      res.status(200).json({ properties: rows });
      return;
    }

    if (req.method === 'POST') {
      const { title, area, emirate, price, beds, baths, sqft, ownerId } = req.body || {};
      if (!title || !area || !price) {
        res.status(400).json({ error: 'title, area, and price are required' });
        return;
      }
      const rows = await sql`
        INSERT INTO properties (title, area, emirate, price, beds, baths, sqft, owner_id)
        VALUES (${title}, ${area}, ${emirate || 'Dubai'}, ${price}, ${beds || null}, ${baths || null}, ${sqft || null}, ${ownerId || null})
        RETURNING id, title, area, emirate, price, created_at
      `;
      await sql`
        INSERT INTO property_history (property_id, event, price_at_time)
        VALUES (${rows[0].id}, 'Listed', ${price})
      `;
      res.status(201).json({ property: rows[0] });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
