// /api/events.js
// Junction Events — real events people can create, browse (live/upcoming/
// past), and RSVP to with a generated ticket. Organizer tier determines
// what Junction does beyond listing (see ORGANIZER_TIERS in App.jsx).
//
// Required tables:
//
//   CREATE TABLE IF NOT EXISTS events (
//     id              SERIAL PRIMARY KEY,
//     organizer_id    TEXT NOT NULL,
//     title           TEXT NOT NULL,
//     category        TEXT,
//     description     TEXT,
//     venue_name      TEXT,
//     area            TEXT,
//     starts_at       TIMESTAMPTZ NOT NULL,
//     ends_at         TIMESTAMPTZ,
//     capacity        INTEGER,
//     price_aed       NUMERIC DEFAULT 0,
//     cover_image_url TEXT,
//     organizer_tier  TEXT NOT NULL DEFAULT 'basic', -- 'basic'|'assisted'|'premium'
//     ai_plan         JSONB,        -- the AI's suggested plan, if used
//     concierge_requested BOOLEAN DEFAULT false,
//     marketing_requested BOOLEAN DEFAULT false,
//     status          TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming'|'live'|'past'|'cancelled'
//     created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
//   CREATE TABLE IF NOT EXISTS event_tickets (
//     id            SERIAL PRIMARY KEY,
//     event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
//     user_id       TEXT NOT NULL,
//     ticket_code   TEXT NOT NULL UNIQUE,
//     status        TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed'|'checked_in'|'cancelled'
//     created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (event_id, user_id)
//   );
//
//   CREATE INDEX IF NOT EXISTS idx_events_starts ON events(starts_at);
//   CREATE INDEX IF NOT EXISTS idx_tickets_event ON event_tickets(event_id);

import { sql } from "@vercel/postgres";

function genTicketCode() {
  return "JXN-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { status, id, organizerId } = req.query;

      if (id) {
        const { rows } = await sql`
          SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
          FROM events e WHERE e.id = ${id} LIMIT 1;
        `;
        if (rows.length === 0) return res.status(404).json({ error: "Event not found" });
        return res.status(200).json({ event: rows[0] });
      }

      if (organizerId) {
        const { rows } = await sql`
          SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
          FROM events e WHERE e.organizer_id = ${organizerId} ORDER BY starts_at DESC;
        `;
        return res.status(200).json({ events: rows });
      }

      const statusFilter = status || "upcoming";
      const { rows } = await sql`
        SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
        FROM events e
        WHERE e.status = ${statusFilter}
        ORDER BY e.starts_at ${statusFilter === "past" ? sql`DESC` : sql`ASC`}
        LIMIT 100;
      `;
      return res.status(200).json({ events: rows });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const {
        organizerId, title, category, description, venueName, area,
        startsAt, endsAt, capacity, priceAed = 0, coverImageUrl,
        organizerTier = "basic", aiPlan, conciergeRequested = false, marketingRequested = false,
      } = body || {};

      if (!organizerId || !title || !startsAt) {
        return res.status(400).json({ error: "organizerId, title, and startsAt are required" });
      }

      const { rows } = await sql`
        INSERT INTO events (
          organizer_id, title, category, description, venue_name, area,
          starts_at, ends_at, capacity, price_aed, cover_image_url,
          organizer_tier, ai_plan, concierge_requested, marketing_requested, status
        ) VALUES (
          ${organizerId}, ${title}, ${category || null}, ${description || null}, ${venueName || null}, ${area || null},
          ${startsAt}, ${endsAt || null}, ${capacity || null}, ${priceAed}, ${coverImageUrl || null},
          ${organizerTier}, ${aiPlan ? JSON.stringify(aiPlan) : null}, ${conciergeRequested}, ${marketingRequested}, 'upcoming'
        )
        RETURNING *;
      `;
      return res.status(201).json({ event: rows[0] });
    }

    if (req.method === "PATCH") {
      // RSVP (issue a ticket) or update event status (e.g. mark live/past).
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { action, eventId, userId, status } = body || {};

      if (action === "rsvp") {
        if (!eventId || !userId) return res.status(400).json({ error: "eventId and userId are required" });
        const code = genTicketCode();
        const { rows } = await sql`
          INSERT INTO event_tickets (event_id, user_id, ticket_code)
          VALUES (${eventId}, ${userId}, ${code})
          ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed'
          RETURNING id, ticket_code, status;
        `;
        return res.status(200).json({ ticket: rows[0] });
      }

      if (action === "set-status") {
        if (!eventId || !status) return res.status(400).json({ error: "eventId and status are required" });
        await sql`UPDATE events SET status = ${status} WHERE id = ${eventId};`;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "Unknown action — expected 'rsvp' or 'set-status'" });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("api/events error:", e);
    return res.status(500).json({ error: e.message });
  }
}
