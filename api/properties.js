// /api/properties — real database-backed property list & create,
// PLUS the new Inventory system (?action=inventory), folded into this
// file instead of a new one since Vercel Hobby caps at 12 functions.
//
// SECURITY: POST now uses the SESSION-VERIFIED user as owner_id, never
// a client-supplied one — previously anyone could post a listing and
// claim it belonged to any owner_id they wanted.
//
// ---------------------------------------------------------------
// INVENTORY — for agencies/companies posting many units at once
// (a whole building, a whole rent roll) instead of one listing at a
// time. The company uploads/pastes their unit list; Junction parses
// it into a structured inventory with its own presentation page, and
// the owner chooses whether it ALSO becomes individual unit listings
// in the main feed, or stays as one inventory package.
//
// GET  /api/properties                      → list active public properties (unchanged)
// POST /api/properties                      → create one property (now session-secured)
// GET  /api/properties?action=inventory              → list inventories (for the Feed)
// GET  /api/properties?action=inventory&id=X         → one inventory + its units
// POST /api/properties?action=inventory              → create an inventory + bulk units
//
// Required tables:
//
//   CREATE TABLE IF NOT EXISTS inventories (
//     id              SERIAL PRIMARY KEY,
//     owner_id        TEXT NOT NULL,
//     name            TEXT NOT NULL,
//     inventory_type  TEXT NOT NULL DEFAULT 'rent', -- 'rent' | 'sale'
//     area            TEXT,
//     emirate         TEXT,
//     breakdown_mode  TEXT NOT NULL DEFAULT 'inventory', -- 'inventory' | 'per-unit'
//     cover_image_url TEXT,
//     description     TEXT,
//     created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
//   CREATE TABLE IF NOT EXISTS inventory_units (
//     id            SERIAL PRIMARY KEY,
//     inventory_id  INTEGER NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
//     unit_number   TEXT,
//     unit_type     TEXT,
//     price         NUMERIC,
//     bedrooms      INTEGER,
//     bathrooms     INTEGER,
//     sqft          NUMERIC,
//     floor         TEXT,
//     status        TEXT DEFAULT 'available', -- available|reserved|sold|rented
//     raw_data      JSONB,
//     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
//   CREATE INDEX IF NOT EXISTS idx_inventory_units_inventory ON inventory_units(inventory_id);

import { neon } from '@neondatabase/serverless';
import { requireAuth, getSessionUserId } from '../lib/auth.js';

const sql = neon(process.env.DATABASE_URL);

async function handleInventory(req, res) {
  if (req.method === 'GET') {
    const { id } = req.query;

    if (id) {
      const inv = await sql`SELECT * FROM inventories WHERE id = ${id} LIMIT 1`;
      if (inv.length === 0) return res.status(404).json({ error: 'Inventory not found' });
      const units = await sql`SELECT * FROM inventory_units WHERE inventory_id = ${id} ORDER BY unit_number ASC`;
      return res.status(200).json({ inventory: inv[0], units });
    }

    // List all inventories, with aggregate stats, for the Feed.
    const rows = await sql`
      SELECT i.*,
        (SELECT COUNT(*) FROM inventory_units u WHERE u.inventory_id = i.id) AS unit_count,
        (SELECT MIN(price) FROM inventory_units u WHERE u.inventory_id = i.id) AS price_min,
        (SELECT MAX(price) FROM inventory_units u WHERE u.inventory_id = i.id) AS price_max,
        (SELECT COUNT(*) FROM inventory_units u WHERE u.inventory_id = i.id AND u.status = 'available') AS available_count
      FROM inventories i
      ORDER BY i.created_at DESC LIMIT 100
    `;
    return res.status(200).json({ inventories: rows });
  }

  if (req.method === 'POST') {
    const me = requireAuth(req, res);
    if (!me) return;
    const { name, inventoryType = 'rent', area, emirate, breakdownMode = 'inventory', description, coverImageUrl, units } = req.body || {};
    if (!name || !Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ error: 'name and a non-empty units array are required' });
    }

    const invRows = await sql`
      INSERT INTO inventories (owner_id, name, inventory_type, area, emirate, breakdown_mode, cover_image_url, description)
      VALUES (${me}, ${name}, ${inventoryType}, ${area || null}, ${emirate || null}, ${breakdownMode}, ${coverImageUrl || null}, ${description || null})
      RETURNING *
    `;
    const inventory = invRows[0];

    let createdUnits = 0;
    let createdListings = 0;
    for (const u of units) {
      const price = u.price != null ? Number(u.price) || null : null;
      const bedrooms = u.bedrooms != null ? parseInt(u.bedrooms, 10) || null : null;
      const bathrooms = u.bathrooms != null ? parseInt(u.bathrooms, 10) || null : null;
      const sqft = u.sqft != null ? Number(u.sqft) || null : null;

      await sql`
        INSERT INTO inventory_units (inventory_id, unit_number, unit_type, price, bedrooms, bathrooms, sqft, floor, status, raw_data)
        VALUES (${inventory.id}, ${u.unitNumber || null}, ${u.unitType || null}, ${price}, ${bedrooms}, ${bathrooms}, ${sqft}, ${u.floor || null}, ${u.status || 'available'}, ${JSON.stringify(u.raw || u)})
      `;
      createdUnits++;

      // If the owner chose per-unit breakdown, each row ALSO becomes a
      // normal property listing, so it shows up in the regular Feed too.
      if (breakdownMode === 'per-unit') {
        await sql`
          INSERT INTO properties (title, area, emirate, price, beds, baths, sqft, description, owner_id, status, visibility)
          VALUES (
            ${`${u.unitType || 'Unit'} ${u.unitNumber ? '· ' + u.unitNumber : ''} — ${name}`},
            ${area || null}, ${emirate || null}, ${price}, ${bedrooms}, ${bathrooms}, ${sqft},
            ${description || null}, ${me}, 'active', 'public'
          )
        `;
        createdListings++;
      }
    }

    return res.status(201).json({ inventory, unitsCreated: createdUnits, listingsCreated: createdListings });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  try {
    if (req.query.action === 'inventory') return handleInventory(req, res);

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
      const me = requireAuth(req, res);
      if (!me) return;
      const { title, area, emirate, price, beds, baths, sqft, furnished, serviceCharge, description } = req.body || {};
      if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
      }
      // owner_id is always the session's own id now — not client-supplied.
      const rows = await sql`
        INSERT INTO properties (title, area, emirate, price, beds, baths, sqft, furnished, service_charge, description, owner_id, status, visibility)
        VALUES (${title}, ${area || null}, ${emirate || null}, ${price || null}, ${beds || null}, ${baths || null}, ${sqft || null}, ${furnished || null}, ${serviceCharge || null}, ${description || null}, ${me}, 'active', 'public')
        RETURNING id, title, area, emirate, price, created_at
      `;
      res.status(201).json({ property: rows[0] });
      return;
    }

    if (req.method === 'PATCH') {
      const me = requireAuth(req, res);
      if (!me) return;
      const { id, title, area, emirate, price, beds, baths, sqft, furnished, serviceCharge, description } = req.body || {};
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
      // Only the actual owner can edit their own listing — checked via
      // the WHERE clause, not trusted from the request body.
      const rows = await sql`
        UPDATE properties SET
          title = COALESCE(${title || null}, title),
          area = COALESCE(${area || null}, area),
          emirate = COALESCE(${emirate || null}, emirate),
          price = COALESCE(${price ?? null}, price),
          beds = COALESCE(${beds ?? null}, beds),
          baths = COALESCE(${baths ?? null}, baths),
          sqft = COALESCE(${sqft ?? null}, sqft),
          furnished = COALESCE(${furnished || null}, furnished),
          service_charge = COALESCE(${serviceCharge || null}, service_charge),
          description = COALESCE(${description || null}, description)
        WHERE id = ${id} AND owner_id = ${me}
        RETURNING id, title, area, emirate, price, beds, baths, sqft, furnished, service_charge, description, owner_id, created_at
      `;
      if (rows.length === 0) { res.status(403).json({ error: "Not found, or you don't own this listing" }); return; }
      res.status(200).json({ property: rows[0] });
      return;
    }

    if (req.method === 'DELETE') {
      const me = requireAuth(req, res);
      if (!me) return;
      const { id } = req.query.id ? req.query : (req.body || {});
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
      const rows = await sql`
        DELETE FROM properties WHERE id = ${id} AND owner_id = ${me} RETURNING id
      `;
      if (rows.length === 0) { res.status(403).json({ error: "Not found, or you don't own this listing" }); return; }
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
