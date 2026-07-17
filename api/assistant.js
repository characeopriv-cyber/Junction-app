// Junction AI proxy — the browser never sees the Anthropic API key.
// Requires ANTHROPIC_API_KEY to be set in the Vercel project's
// Environment Variables (Project Settings → Environment Variables).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY isn't set on this deployment yet — add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    });
    return;
  }

  try {
    const { system, messages, maxTokens } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: Math.min(Math.max(Number(maxTokens) || 600, 1), 4096),
        system: system || undefined,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: data?.error?.message || `Assistant upstream error (${upstream.status})`,
      });
      return;
    }

    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message || "Assistant request failed" });
  }
}
