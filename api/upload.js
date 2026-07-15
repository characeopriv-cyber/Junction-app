// /api/upload.js
// Handles photo / file / voice-note / video uploads for Connect messages
// (and can be reused for property/service listing photos later).
// Uses Vercel Blob — run `npm install @vercel/blob` and enable the Blob
// store for this project in the Vercel dashboard before this will work.
//
// Client sends: POST multipart/form-data with a single `file` field,
// plus optional `folder` field ("chat" | "listings" | "voice").
//
// Response: { url, size, contentType }

import { put } from "@vercel/blob";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const MAX_BYTES = 25 * 1024 * 1024; // 25MB cap per attachment

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFileSize: MAX_BYTES, multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "No file provided (expected field name 'file')" });

    const folder = (Array.isArray(fields.folder) ? fields.folder[0] : fields.folder) || "chat";
    const buffer = fs.readFileSync(file.filepath);
    const safeName = (file.originalFilename || "upload").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `${folder}/${Date.now()}-${safeName}`;

    const blob = await put(key, buffer, {
      access: "public",
      contentType: file.mimetype || "application/octet-stream",
    });

    return res.status(200).json({
      url: blob.url,
      size: file.size,
      contentType: file.mimetype,
      name: safeName,
    });
  } catch (e) {
    console.error("api/upload error:", e);
    return res.status(500).json({ error: e.message });
  }
}
