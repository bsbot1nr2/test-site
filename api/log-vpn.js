export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const webhookUrl = process.env.WEBHOOK_LINK;

    if (!webhookUrl) {
      return res.status(500).json({ error: "WEBHOOK_LINK not configured" });
    }

    const payload = {
      content: `Bad URL hash accessed\nUser-Agent: ${body.userAgent || "unknown"}`
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
