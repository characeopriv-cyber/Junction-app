// /api/assistant — Junction AI proxy
//
// Vercel auto-deploys any file in /api as a serverless function,
// regardless of the frontend framework (Vite, CRA, etc). This is the
// ONLY place the Anthropic API key is used — it never reaches the browser.
//
// Setup on Vercel:
//   1. Project → Settings → Environment Variables
//   2. Add ANTHROPIC_API_KEY = sk-ant-... (Production + Preview)
//   3. Redeploy
//
// Request body:  { system: string, messages: {role, content}[], maxTokens?: number }
// Response body: { reply: string }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    });
    return;
  }

  const { system, messages, maxTokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "`messages` must be a non-empty array" });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens || 600,
        system: system || "",
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).json({ error: `Anthropic API error: ${errText}` });
      return;
    }

    const data = await upstream.json();
    const reply = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n");

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: `Assistant request failed: ${err.message}` });
  }
}
