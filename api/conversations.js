// /api/conversations — GET conversations for a user, POST start a new one
// (or reuse an existing one), plus presence (?action=presence) folded in
// here rather than a separate file, since Hobby plan caps functions at 12.
//
// SECURITY: every action below now requires a valid session cookie
// (see /lib/auth.js) and uses the SESSION-VERIFIED user id, never the
// client-supplied one, for anything that reads private data or writes
// on someone's behalf. Previously this trusted whatever userId the
// client sent, which let anyone impersonate anyone else.
//
// Presence needs one extra table:
//   CREATE TABLE IF NOT EXISTS presence (
//     user_id     TEXT PRIMARY KEY,
//     status      TEXT NOT NULL DEFAULT 'online', -- 'online' | 'busy' | 'offline'
//     last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
//   );

import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../lib/auth.js';

const sql = neon(process.env.DATABASE_URL);
const PRESENCE_STALE_SECONDS = 90;

export default async function handler(req, res) {
  try {
    const action = req.query.action;

    // ---- Look up a user by email (for starting a new chat) ----
    // Requires auth so this can't be used to enumerate every account.
    if (action === 'lookup') {
      const me = requireAuth(req, res);
      if (!me) return;
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'email is required' });
      const rows = await sql`SELECT id, name, email FROM users WHERE email = ${email} LIMIT 1`;
      if (rows.length === 0) return res.status(404).json({ error: 'No Junction user with that email' });
      return res.status(200).json({ user: rows[0] });
    }

    // ---- Presence ----
    if (action === 'presence') {
      if (req.method === 'POST') {
        const me = requireAuth(req, res);
        if (!me) return;
        const { status = 'online' } = req.body || {};
        // Always uses the session's own id — you can only set YOUR OWN presence.
        await sql`
          INSERT INTO presence (user_id, status, last_seen)
          VALUES (${me}, ${status}, now())
          ON CONFLICT (user_id) DO UPDATE SET status = ${status}, last_seen = now()
        `;
        return res.status(200).json({ success: true });
      }
      if (req.method === 'GET') {
        // Reading others' online/busy/offline status is normal chat-app
        // behavior (like WhatsApp's last-seen), so this alone doesn't
        // require auth — but you do need to be signed in to call it at all.
        const me = requireAuth(req, res);
        if (!me) return;
        const { userIds } = req.query;
        if (!userIds) return res.status(400).json({ error: 'userIds (comma-separated) is required' });
        const ids = String(userIds).split(',').map((s) => s.trim()).filter(Boolean);
        const rows = ids.length ? await sql`SELECT user_id, status, last_seen FROM presence WHERE user_id = ANY(${ids})` : [];
        const now = Date.now();
        const presence = {};
        for (const id of ids) presence[id] = 'offline';
        for (const row of rows) {
          const ageSeconds = (now - new Date(row.last_seen).getTime()) / 1000;
          presence[row.user_id] = ageSeconds > PRESENCE_STALE_SECONDS ? 'offline' : row.status;
        }
        return res.status(200).json({ presence });
      }
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ---- Conversations (original behavior, + dedup on create) ----
    if (req.method === 'GET') {
      const me = requireAuth(req, res);
      if (!me) return;
      // Ignore any userId the client sends — always list MY OWN conversations.
      const rows = await sql`
        SELECT c.id, c.created_at, c.context_type, c.context_id, c.context_label,
          (SELECT array_agg(user_id) FROM conversation_participants WHERE conversation_id = c.id) AS participant_ids,
          (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_body,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_at,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ${me} AND m.read_at IS NULL) AS unread_count
        FROM conversations c
        JOIN conversation_participants p ON p.conversation_id = c.id
        WHERE p.user_id = ${me}
        ORDER BY last_at DESC NULLS LAST, c.created_at DESC
      `;
      res.status(200).json({ conversations: rows });
      return;
    }
    if (req.method === 'POST') {
      const me = requireAuth(req, res);
      if (!me) return;
      const { participantIds, contextType, contextId, contextLabel } = req.body || {};
      if (!Array.isArray(participantIds) || participantIds.length < 2) {
        res.status(400).json({ error: 'participantIds must include at least 2 user ids' });
        return;
      }
      // You can only start a conversation that includes yourself.
      if (!participantIds.map(String).includes(String(me))) {
        res.status(403).json({ error: 'You can only start conversations you are part of' });
        return;
      }
      // Dedup: if these exact two participants already share a conversation
      // with the same context, reuse it instead of creating a new one.
      if (participantIds.length === 2) {
        const [a, b] = participantIds;
        const existing = await sql`
          SELECT c.id FROM conversations c
          WHERE c.context_type IS NOT DISTINCT FROM ${contextType || null}
            AND c.context_id IS NOT DISTINCT FROM ${contextId || null}
            AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = ${a})
            AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = ${b})
          LIMIT 1
        `;
        if (existing.length) {
          res.status(200).json({ conversation: { id: existing[0].id } });
          return;
        }
      }
      const convo = await sql`
        INSERT INTO conversations (context_type, context_id, context_label)
        VALUES (${contextType || null}, ${contextId || null}, ${contextLabel || null})
        RETURNING id
      `;
      const conversationId = convo[0].id;
      for (const uid of participantIds) {
        await sql`INSERT INTO conversation_participants (conversation_id, user_id) VALUES (${conversationId}, ${uid})`;
      }
      res.status(201).json({ conversation: { id: conversationId } });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
    }
