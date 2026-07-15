// /api/users.js
// Lets a signed-in user actually edit their Passport (name, bio, chosen
// background, avatar). This did not exist before — Passport only ever
// displayed currentUser read-only, which is the other reason "nothing
// saves": there was no edit endpoint to save TO.
//
// Run against your existing `users` table (adjust column names if yours
// differ — these are ADD COLUMN, so safe to run even if some already exist):
//
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS junction_id TEXT UNIQUE;
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS background_id TEXT DEFAULT 'junction-default';
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_tier TEXT DEFAULT 'ordinary';
//     -- 'ordinary' | 'services' | 'investor'
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS role_label TEXT DEFAULT 'client';
//     -- shown on the default logo avatar: 'client' | 'agent' | 'service' | 'investor' | 'work'

import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const { rows } = await sql`
        SELECT id, name, email, bio, junction_id, avatar_url, background_id, passport_tier, role_label
        FROM users WHERE id = ${userId} LIMIT 1;
      `;
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      return res.status(200).json({ user: rows[0] });
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { userId, name, bio, avatarUrl, backgroundId, roleLabel, passportTier } = body || {};
      if (!userId) return res.status(400).json({ error: "userId is required" });
      if (passportTier && !["ordinary", "services", "investor"].includes(passportTier)) {
        return res.status(400).json({ error: "passportTier must be ordinary, services, or investor" });
      }

      const { rows } = await sql`
        UPDATE users SET
          name = COALESCE(${name || null}, name),
          bio = COALESCE(${bio ?? null}, bio),
          avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
          background_id = COALESCE(${backgroundId || null}, background_id),
          role_label = COALESCE(${roleLabel || null}, role_label),
          passport_tier = COALESCE(${passportTier || null}, passport_tier)
        WHERE id = ${userId}
        RETURNING id, name, email, bio, junction_id, avatar_url, background_id, passport_tier, role_label;
      `;
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      return res.status(200).json({ user: rows[0] });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("api/users error:", e);
    return res.status(500).json({ error: e.message });
  }
}
