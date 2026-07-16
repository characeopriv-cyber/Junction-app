// /api/conversations/[id]/messages — GET messages, POST send a message,
// PATCH mark as read. Extends the original text-only version with
// attachment support (image/file/voice/video/link) for Connect.
//
// Requires these columns added to your existing `messages` table, plus
// two new columns on `conversations` for linking a chat to a listing:
//
//   ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';
//   ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
//   ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_meta JSONB;
//   ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
//
//   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS context_type TEXT;
//   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS context_id TEXT;
//   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS context_label TEXT;

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, sender_id, type, body, media_url, media_meta, read_at, created_at
        FROM messages WHERE conversation_id = ${id}
        ORDER BY created_at ASC LIMIT 200
      `;
      res.status(200).json({ messages: rows });
      return;
    }
    if (req.method === 'POST') {
      const { senderId, body, type = 'text', mediaUrl, mediaMeta } = req.body || {};
      if (!body && !mediaUrl) {
        res.status(400).json({ error: 'body or mediaUrl is required' });
        return;
      }
      const rows = await sql`
        INSERT INTO messages (conversation_id, sender_id, type, body, media_url, media_meta)
        VALUES (${id}, ${senderId || null}, ${type}, ${body || null}, ${mediaUrl || null}, ${mediaMeta ? JSON.stringify(mediaMeta) : null})
        RETURNING id, sender_id, type, body, media_url, media_meta, created_at
      `;
      res.status(201).json({ message: rows[0] });
      return;
    }
    if (req.method === 'PATCH') {
      const { readerId } = req.body || {};
      if (!readerId) { res.status(400).json({ error: 'readerId is required' }); return; }
      await sql`
        UPDATE messages SET read_at = now()
        WHERE conversation_id = ${id} AND sender_id != ${readerId} AND read_at IS NULL
      `;
      res.status(200).json({ success: true });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
          }
