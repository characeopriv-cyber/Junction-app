// /api/messages.js
// Real user-to-user messaging backend for Junction Connect.
// Replaces the old local-only mock threads + AI-roleplay "replies".
//
// Assumes Vercel Postgres (@vercel/postgres) — matches the pattern already
// used by /api/properties.js and /api/services.js in this project. If this
// project uses a different Postgres client, swap the `sql` import/calls
// accordingly; the query logic itself is plain SQL and will port easily.
//
// Required tables (run once against your database):
//
//   CREATE TABLE IF NOT EXISTS message_threads (
//     id            SERIAL PRIMARY KEY,
//     user_a_id     INTEGER NOT NULL,
//     user_b_id     INTEGER NOT NULL,
//     context_type  TEXT,              -- 'property' | 'service' | 'job' | null
//     context_id    TEXT,
//     context_label TEXT,              -- e.g. "Sky-line 2BR in Marina Gate"
//     created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (user_a_id, user_b_id, context_type, context_id)
//   );
//
//   CREATE TABLE IF NOT EXISTS messages (
//     id            SERIAL PRIMARY KEY,
//     thread_id     INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
//     sender_id     INTEGER NOT NULL,
//     type          TEXT NOT NULL DEFAULT 'text', -- 'text'|'image'|'file'|'voice'|'video'|'link'
//     body          TEXT,
//     media_url     TEXT,
//     media_meta    JSONB,
//     read_at       TIMESTAMPTZ,
//     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
//   CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
//   CREATE INDEX IF NOT EXISTS idx_threads_user_a ON message_threads(user_a_id);
//   CREATE INDEX IF NOT EXISTS idx_threads_user_b ON message_threads(user_b_id);

import { sql } from "@vercel/postgres";

function pairKey(a, b) {
  // Normalize so (a,b) and (b,a) always resolve to the same thread.
  return a < b ? [a, b] : [b, a];
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { userId, threadId, lookupEmail } = req.query;

      if (lookupEmail) {
        const { rows } = await sql`SELECT id, name, email FROM users WHERE email = ${lookupEmail} LIMIT 1;`;
        if (rows.length === 0) return res.status(404).json({ error: "No Junction user with that email" });
        return res.status(200).json({ user: rows[0] });
      }

      if (threadId) {
        // Fetch full message history for one thread.
        const { rows } = await sql`
          SELECT id, thread_id, sender_id, type, body, media_url, media_meta, read_at, created_at
          FROM messages
          WHERE thread_id = ${threadId}
          ORDER BY created_at ASC
          LIMIT 500;
        `;
        return res.status(200).json({ messages: rows });
      }

      if (userId) {
        // Fetch all threads for a user, each with its last message + unread count.
        const { rows } = await sql`
          SELECT
            t.id, t.user_a_id, t.user_b_id, t.context_type, t.context_id, t.context_label, t.created_at,
            lm.body AS last_body, lm.type AS last_type, lm.created_at AS last_at, lm.sender_id AS last_sender_id,
            (SELECT COUNT(*) FROM messages m2
              WHERE m2.thread_id = t.id AND m2.sender_id != ${userId} AND m2.read_at IS NULL) AS unread_count
          FROM message_threads t
          LEFT JOIN LATERAL (
            SELECT body, type, created_at, sender_id FROM messages
            WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
          ) lm ON true
          WHERE t.user_a_id = ${userId} OR t.user_b_id = ${userId}
          ORDER BY lm.created_at DESC NULLS LAST;
        `;
        return res.status(200).json({ threads: rows });
      }

      return res.status(400).json({ error: "Provide userId or threadId" });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const {
        threadId, userId, otherUserId,
        contextType, contextId, contextLabel,
        senderId, type = "text", text, mediaUrl, mediaMeta,
      } = body || {};

      if (!senderId) return res.status(400).json({ error: "senderId is required" });
      if (!text && !mediaUrl) return res.status(400).json({ error: "text or mediaUrl is required" });

      let finalThreadId = threadId;

      if (!finalThreadId) {
        if (!userId || !otherUserId) {
          return res.status(400).json({ error: "Provide threadId, or userId + otherUserId to start a new thread" });
        }
        const [a, b] = pairKey(String(userId), String(otherUserId));
        const existing = await sql`
          SELECT id FROM message_threads
          WHERE user_a_id = ${a} AND user_b_id = ${b}
            AND context_type IS NOT DISTINCT FROM ${contextType || null}
            AND context_id IS NOT DISTINCT FROM ${contextId || null}
          LIMIT 1;
        `;
        if (existing.rows.length) {
          finalThreadId = existing.rows[0].id;
        } else {
          const created = await sql`
            INSERT INTO message_threads (user_a_id, user_b_id, context_type, context_id, context_label)
            VALUES (${a}, ${b}, ${contextType || null}, ${contextId || null}, ${contextLabel || null})
            RETURNING id;
          `;
          finalThreadId = created.rows[0].id;
        }
      }

      const inserted = await sql`
        INSERT INTO messages (thread_id, sender_id, type, body, media_url, media_meta)
        VALUES (${finalThreadId}, ${senderId}, ${type}, ${text || null}, ${mediaUrl || null}, ${mediaMeta ? JSON.stringify(mediaMeta) : null})
        RETURNING id, thread_id, sender_id, type, body, media_url, media_meta, created_at;
      `;

      return res.status(201).json({ message: inserted.rows[0], threadId: finalThreadId });
    }

    if (req.method === "PATCH") {
      // Mark a thread's messages as read for the requesting user.
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { threadId, readerId } = body || {};
      if (!threadId || !readerId) return res.status(400).json({ error: "threadId and readerId are required" });
      await sql`
        UPDATE messages SET read_at = now()
        WHERE thread_id = ${threadId} AND sender_id != ${readerId} AND read_at IS NULL;
      `;
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("api/messages error:", e);
    return res.status(500).json({ error: e.message });
  }
}
