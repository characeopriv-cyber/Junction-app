// /api/candidate-profile.js
// Backend for the "For You" job matching profile (Junction Work).
// This was missing — the frontend was calling it but nothing existed
// server-side, which is why saves silently failed.
//
// Required table:
//
//   CREATE TABLE IF NOT EXISTS candidate_profiles (
//     user_id     TEXT PRIMARY KEY,
//     category    TEXT NOT NULL,
//     emirate     TEXT,
//     experience  TEXT,
//     languages   JSONB,
//     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
//   );

import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const { rows } = await sql`
        SELECT user_id, category, emirate, experience, languages
        FROM candidate_profiles WHERE user_id = ${userId} LIMIT 1;
      `;
      if (rows.length === 0) return res.status(200).json({ profile: null });
      const r = rows[0];
      return res.status(200).json({
        profile: { category: r.category, emirate: r.emirate, experience: r.experience, languages: r.languages || [] },
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { userId, category, emirate, experience, languages } = body || {};
      if (!userId || !category) return res.status(400).json({ error: "userId and category are required" });

      await sql`
        INSERT INTO candidate_profiles (user_id, category, emirate, experience, languages, updated_at)
        VALUES (${userId}, ${category}, ${emirate || null}, ${experience || null}, ${JSON.stringify(languages || [])}, now())
        ON CONFLICT (user_id) DO UPDATE SET
          category = ${category}, emirate = ${emirate || null}, experience = ${experience || null},
          languages = ${JSON.stringify(languages || [])}, updated_at = now();
      `;
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("api/candidate-profile error:", e);
    return res.status(500).json({ error: e.message });
  }
}
