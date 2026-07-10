// /api/conversations — GET conversations for a user, POST start a new one
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) {
        res.status(400).json({ error: 'userId query param is required' });
        return;
      }
      const rows = await sql`
        SELECT c.id, c.created_at
        FROM conversations c
        JOIN conversation_participants p ON p.conversation_id = c.id
        WHERE p.user_id = ${userId}
        ORDER BY c.created_at DESC
      `;
      res.status(200).json({ conversations: rows });
      return;
    }
    if (req.method === 'POST') {
      const { participantIds } = req.body || {};
      if (!Array.isArray(participantIds) || participantIds.length < 2) {
        res.status(400).json({ error: 'participantIds must include at least 2 user ids' });
        return;
      }
      const convo = await sql`INSERT INTO conversations DEFAULT VALUES RETURNING id`;
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
