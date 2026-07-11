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
        SELECT id, title, area, emirate, price, beds, baths, sqft, furnished, service_charge, description, views, owner_id, created_at
        FROM properties
        WHERE status = 'active' AND visibility = 'public'
        ORDER BY created_at DESC
        LIMIT 100
      `;
      res.status(200).json({ properties: rows });
      return;
    }

    if (req.method === 'POST') {
      const { title, area, emirate, price, beds, baths, sqft, furnished, serviceCharge, description, ownerId } = req.body || {};
      if (!title || !area || !price) {
        res.status(400).json({ error: 'title, area, and price are required' });
        return;
      }
      const rows = await sql`
        INSERT INTO properties (title, area, emirate, price, beds, baths, sqft, furnished, service_charge, description, owner_id)
        VALUES (${title}, ${area}, ${emirate || 'Dubai'}, ${price}, ${beds || null}, ${baths || null}, ${sqft || null}, ${furnished || null}, ${serviceCharge || null}, ${description || null}, ${ownerId || null})
        RETURNING id, title, area, emirate, price, created_at
      `;
      await sql`
        INSERT INTO property_history (property_id, event, price_at_time)
        VALUES (${rows[0].id}, 'Listed', ${price})
      `;
      res.status(201).json({ property: rows[0] });
      return;
    }

    if (req.method === 'PATCH') {
      const { id, ownerId, title, area, emirate, price, beds, baths, sqft, furnished, serviceCharge, description } = req.body || {};
      if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
      }
      const existingRows = await sql`SELECT * FROM properties WHERE id = ${id}`;
      if (existingRows.length === 0) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }
      const existing = existingRows[0];
      if (existing.owner_id && existing.owner_id !== ownerId) {
        res.status(403).json({ error: 'Only the person who posted this can edit it' });
        return;
      }
      const merged = {
        title: title ?? existing.title,
        area: area ?? existing.area,
        emirate: emirate ?? existing.emirate,
        price: price ?? existing.price,
        beds: beds !== undefined ? beds : existing.beds,
        baths: baths !== undefined ? baths : existing.baths,
        sqft: sqft !== undefined ? sqft : existing.sqft,
        furnished: furnished ?? existing.furnished,
        serviceCharge: serviceCharge !== undefined ? serviceCharge : existing.service_charge,
        description: description ?? existing.description,
      };
      const rows = await sql`
        UPDATE properties SET
          title = ${merged.title}, area = ${merged.area}, emirate = ${merged.emirate},
          price = ${merged.price}, beds = ${merged.beds}, baths = ${merged.baths}, sqft = ${merged.sqft},
          furnished = ${merged.furnished}, service_charge = ${merged.serviceCharge}, description = ${merged.description}
        WHERE id = ${id}
        RETURNING id, title, area, emirate, price, created_at
      `;
      await sql`INSERT INTO property_history (property_id, event, price_at_time) VALUES (${id}, 'Updated', ${merged.price})`;
      res.status(200).json({ property: rows[0] });
      return;
    }

    if (req.method === 'DELETE') {
      const { id, ownerId } = req.body || {};
      if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
      }
      const owned = await sql`SELECT owner_id FROM properties WHERE id = ${id}`;
      if (owned.length === 0) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }
      if (owned[0].owner_id && owned[0].owner_id !== ownerId) {
        res.status(403).json({ error: 'Only the person who posted this can delete it' });
        return;
      }
      await sql`UPDATE properties SET status = 'removed' WHERE id = ${id}`;
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
