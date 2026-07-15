// /api/presence.js
// Real presence for Junction Connect — online / busy / offline, driven by
// a heartbeat the client sends every ~25s while the app is open. Anyone
// whose last heartbeat is older than 90s is treated as offline even if
// their stored status says otherwise (covers crashed tabs, lost network).
//
// Required table:
//
//   CREATE TABLE IF NOT EXISTS presence (
//     user_id     TEXT PRIMARY KEY,
//     status      TEXT NOT NULL DEFAULT 'online', -- 'online' | 'busy' | 'offline'
//     last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
//   );

import { sql } from "@vercel/postgres";

const STALE_AFTER_SECONDS = 90;

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { userId, status = "online" } = body || {};
      if (!userId) return res.status(400).json({ error: "userId is required" });
      if (!["online", "busy", "offline"].includes(status)) {
        return res.status(400).json({ error: "status must be online, busy, or offline" });
      }
      await sql`
        INSERT INTO presence (user_id, status, last_seen)
        VALUES (${userId}, ${status}, now())
        ON CONFLICT (user_id) DO UPDATE SET status = ${status}, last_seen = now();
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === "GET") {
      const { userIds } = req.query;
      if (!userIds) return res.status(400).json({ error: "userIds (comma-separated) is required" });
      const ids = String(userIds).split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) return res.status(200).json({ presence: {} });

      const { rows } = await sql`
        SELECT user_id, status, last_seen FROM presence WHERE user_id = ANY(${ids});
      `;
      const now = Date.now();
      const presence = {};
      for (const id of ids) presence[id] = "offline";
      for (const row of rows) {
        const ageSeconds = (now - new Date(row.last_seen).getTime()) / 1000;
        presence[row.user_id] = ageSeconds > STALE_AFTER_SECONDS ? "offline" : row.status;
      }
      return res.status(200).json({ presence });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("api/presence error:", e);
    return res.status(500).json({ error: e.message });
  }
}
