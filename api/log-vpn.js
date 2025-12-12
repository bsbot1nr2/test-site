export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const webhookUrl = process.env.WEBHOOK_LINK;
    if (!webhookUrl) {
      return res.status(500).json({ error: "WEBHOOK_LINK not configured" });
    }

    const b = req.body || {};

    const clip = (v, n) => {
      const s = (v === null || v === undefined) ? "" : String(v);
      return s.length > n ? s.slice(0, n - 1) + "…" : s;
    };

    const boolStr = (v) => (v === true ? "true" : v === false ? "false" : String(v));

    // Discord embed limits: field value max 1024 chars, total embed size ~6000
    // Keep fields compact & clipped.
    const ipLine = [
      `IP: ${clip(b.ip || "unknown", 80)}`,
      `VPN: ${boolStr(b.vpn)}`,
      `Proxy: ${boolStr(b.proxy)}`,
      `Datacenter: ${boolStr(b.datacenter)}`,
      b.asn ? `ASN: ${clip(b.asn, 80)}` : null,
      b.isp ? `ISP: ${clip(b.isp, 120)}` : null,
      b.country ? `Country: ${clip(b.country, 80)}` : null,
      b.city ? `City: ${clip(b.city, 80)}` : null
    ].filter(Boolean).join("\n");

    const pageLine = [
      `URL: ${clip(b.url || "", 350)}`,
      `Referrer: ${clip(b.referrer || "", 250)}`,
      `Path: ${clip(b.path || "", 120)} ${clip(b.query || "", 200)} ${clip(b.hash || "", 200)}`,
      `History: ${clip(b.historyLength, 50)}`
    ].filter(Boolean).join("\n");

    const deviceLine = [
      `UA: ${clip(b.userAgent || "", 350)}`,
      b.platform ? `Platform: ${clip(b.platform, 120)}` : null,
      b.language ? `Lang: ${clip(b.language, 40)}` : null,
      b.languages ? `Languages: ${clip(Array.isArray(b.languages) ? b.languages.join(", ") : b.languages, 200)}` : null,
      `Cookies: ${boolStr(b.cookiesEnabled)}`,
      b.doNotTrack != null ? `DNT: ${clip(b.doNotTrack, 20)}` : null
    ].filter(Boolean).join("\n");

    const screenObj = b.screen || {};
    const viewportObj = b.viewport || {};
    const screenLine = [
      `Screen: ${clip(screenObj.width, 20)}×${clip(screenObj.height, 20)} (avail ${clip(screenObj.availWidth, 20)}×${clip(screenObj.availHeight, 20)})`,
      `Viewport: ${clip(viewportObj.innerWidth, 20)}×${clip(viewportObj.innerHeight, 20)}`,
      `DPR: ${clip(screenObj.pixelRatio, 20)}  ColorDepth: ${clip(screenObj.colorDepth, 20)}`,
      screenObj.orientation ? `Orientation: ${clip(screenObj.orientation, 60)}` : null
    ].filter(Boolean).join("\n");

    const netObj = b.network || null;
    const netLine = netObj ? [
      `Type: ${clip(netObj.effectiveType, 40)}`,
      `RTT: ${clip(netObj.rtt, 40)}`,
      `Downlink: ${clip(netObj.downlink, 40)}`,
      `Save-Data: ${boolStr(netObj.saveData)}`
    ].join("\n") : "unavailable";

    const timeLine = [
      `Timestamp: ${clip(b.timestamp || new Date().toISOString(), 80)}`,
      b.timezone ? `Timezone: ${clip(b.timezone, 80)}` : null,
      b.tzOffsetMin != null ? `TZ offset (min): ${clip(b.tzOffsetMin, 30)}` : null
    ].filter(Boolean).join("\n");

    const note = b.note ? clip(b.note, 500) : "";

    const embed = {
      title: "Page Access Logged",
      color: (b.vpn === true || b.proxy === true) ? 0xff0000 : (b.datacenter === true ? 0xffa500 : 0x5865F2),
      fields: [
        { name: "IP / Flags", value: clip(ipLine || "n/a", 1024), inline: false },
        { name: "Page", value: clip(pageLine || "n/a", 1024), inline: false },
        { name: "Device", value: clip(deviceLine || "n/a", 1024), inline: false },
        { name: "Screen", value: clip(screenLine || "n/a", 1024), inline: false },
        { name: "Network", value: clip(netLine || "n/a", 1024), inline: false },
        { name: "Time", value: clip(timeLine || "n/a", 1024), inline: false }
      ]
    };

    if (note) embed.fields.push({ name: "Note", value: clip(note, 1024), inline: false });

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("log-vpn backend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
