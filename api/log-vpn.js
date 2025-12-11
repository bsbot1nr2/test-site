export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const webhookUrl = process.env.WEBHOOK_LINK; // 🔐 kommt aus Vercel Env

    if (!webhookUrl) {
      return res.status(500).json({ error: "WEBHOOK_LINK not configured" });
    }

    const {
      ip = "unknown",
      vpn = "unknown",
      proxy = "unknown",
      datacenter = "unknown",
      dismissed = "unknown",
      userAgent = "",
      timestamp = new Date().toISOString()
    } = body;

    const payload = {
      embeds: [
        {
          title: "VPN Check Result",
          color: vpn || proxy ? 0xff0000 : datacenter ? 0xffa500 : 0x00ff00,
          fields: [
            { name: "IP", value: String(ip), inline: false },
            { name: "VPN", value: String(vpn), inline: true },
            { name: "Proxy", value: String(proxy), inline: true },
            { name: "Datacenter", value: String(datacenter), inline: true },
            { name: "Dismissed", value: String(dismissed), inline: true },
            { name: "User Agent", value: userAgent.substring(0, 250), inline: false },
            { name: "Timestamp", value: timestamp, inline: false }
          ]
        }
      ]
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
