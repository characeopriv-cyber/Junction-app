// /api/events — Junction Events: create, list (live/upcoming/past),
// RSVP with a generated ticket. Rewritten to use @neondatabase/serverless
// (neon) to match the rest of this project's API routes.
//
// SECURITY: creating an event, RSVPing, and changing an event's status
// now all use the SESSION-VERIFIED user id — you can't create an event
// as someone else, RSVP as someone else, or mark someone else's event
// live/cancelled unless you're the actual organizer. GET (browsing
// events) stays public — that's meant to be open to everyone.
//
// Required tables:
//
//   CREATE TABLE IF NOT EXISTS events (
//     id                  SERIAL PRIMARY KEY,
//     organizer_id        TEXT NOT NULL,
//     title               TEXT NOT NULL,
//     category            TEXT,
//     description         TEXT,
//     venue_name          TEXT,
//     area                TEXT,
//     starts_at           TIMESTAMPTZ NOT NULL,
//     ends_at             TIMESTAMPTZ,
//     capacity            INTEGER,
//     price_aed           NUMERIC DEFAULT 0,
//     cover_image_url     TEXT,
//     organizer_tier      TEXT NOT NULL DEFAULT 'basic',
//     ai_plan             JSONB,
//     concierge_requested BOOLEAN DEFAULT false,
//     marketing_requested BOOLEAN DEFAULT false,
//     status              TEXT NOT NULL DEFAULT 'upcoming',
//     created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
//   CREATE TABLE IF NOT EXISTS event_tickets (
//     id            SERIAL PRIMARY KEY,
//     event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
//     user_id       TEXT NOT NULL,
//     ticket_code   TEXT NOT NULL UNIQUE,
//     status        TEXT NOT NULL DEFAULT 'confirmed',
//     created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (event_id, user_id)
//   );

import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../lib/auth.js';

const sql = neon(process.env.DATABASE_URL);

function genTicketCode() {
  return 'JXN-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Browsing events is intentionally public — no auth required.
      const { status, id, organizerId } = req.query;

      if (id) {
        const rows = await sql`
          SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
          FROM events e WHERE e.id = ${id} LIMIT 1
        `;
        if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        return res.status(200).json({ event: rows[0] });
      }

      if (organizerId) {
        const rows = await sql`
          SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
          FROM events e WHERE e.organizer_id = ${organizerId} ORDER BY starts_at DESC
        `;
        return res.status(200).json({ events: rows });
      }

      const statusFilter = status || 'upcoming';
      const rows = statusFilter === 'past'
        ? await sql`SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
            FROM events e WHERE e.status = ${statusFilter} ORDER BY e.starts_at DESC LIMIT 100`
        : await sql`SELECT e.*, (SELECT COUNT(*) FROM event_tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS going_count
            FROM events e WHERE e.status = ${statusFilter} ORDER BY e.starts_at ASC LIMIT 100`;
      return res.status(200).json({ events: rows });
    }

    if (req.method === 'POST') {
      const me = requireAuth(req, res);
      if (!me) return;
      const {
        title, category, description, venueName, area,
        startsAt, endsAt, capacity, priceAed = 0, coverImageUrl,
        organizerTier = 'basic', aiPlan, conciergeRequested = false, marketingRequested = false,
      } = req.body || {};

      if (!title || !startsAt) {
        return res.status(400).json({ error: 'title and startsAt are required' });
      }

      // organizer_id is always the session's own id.
      const rows = await sql`
        INSERT INTO events (
          organizer_id, title, category, description, venue_name, area,
          starts_at, ends_at, capacity, price_aed, cover_image_url,
          organizer_tier, ai_plan, concierge_requested, marketing_requested, status
        ) VALUES (
          ${me}, ${title}, ${category || null}, ${description || null}, ${venueName || null}, ${area || null},
          ${startsAt}, ${endsAt || null}, ${capacity || null}, ${priceAed}, ${coverImageUrl || null},
          ${organizerTier}, ${aiPlan ? JSON.stringify(aiPlan) : null}, ${conciergeRequested}, ${marketingRequested}, 'upcoming'
        )
        RETURNING *
      `;
      return res.status(201).json({ event: rows[0] });
    }

    if (req.method === 'PATCH') {
      const me = requireAuth(req, res);
      if (!me) return;
      const { action, eventId, status } = req.body || {};

      if (action === 'rsvp') {
        if (!eventId) return res.status(400).json({ error: 'eventId is required' });
        const code = genTicketCode();
        // Ticket is always issued to the session's own id — you can't RSVP as someone else.
        const rows = await sql`
          INSERT INTO event_tickets (event_id, user_id, ticket_code)
          VALUES (${eventId}, ${me}, ${code})
          ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed'
          RETURNING id, ticket_code, status
        `;
        return res.status(200).json({ ticket: rows[0] });
      }

      if (action === 'set-status') {
        if (!eventId || !status) return res.status(400).json({ error: 'eventId and status are required' });
        // Only the actual organizer can change their own event's status.
        const owned = await sql`SELECT 1 FROM events WHERE id = ${eventId} AND organizer_id = ${me} LIMIT 1`;
        if (owned.length === 0) return res.status(403).json({ error: 'Only the organizer can change this event' });
        await sql`UPDATE events SET status = ${status} WHERE id = ${eventId}`;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "Unknown action — expected 'rsvp' or 'set-status'" });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('api/events error:', e);
    return res.status(500).json({ error: e.message });
  }
}

                                                                                                
