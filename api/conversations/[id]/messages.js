// /api/conversations/[id]/messages — GET messages, POST send a message
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, sender_id, body, created_at
        FROM messages WHERE conversation_id = ${id}
        ORDER BY created_at ASC LIMIT 200
      `;
      res.status(200).json({ messages: rows });
      return;
    }
    if (req.method === 'POST') {
      const { senderId, body } = req.body || {};
      if (!body) {
        res.status(400).json({ error: 'body is required' });
        return;
      }
      const rows = await sql`
        INSERT INTO messages (conversation_id, sender_id, body)
        VALUES (${id}, ${senderId || null}, ${body})
        RETURNING id, sender_id, body, created_at
      `;
      res.status(201).json({ message: rows[0] });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
}
