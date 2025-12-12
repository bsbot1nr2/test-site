export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const hooks = {
      all: process.env.WEBHOOK_ALL || null,
      database: process.env.WEBHOOK_DATABASE || null,
      vpn: process.env.WEBHOOK_VPN || null,
      real: process.env.WEBHOOK_REAL || null
    };

    const b = req.body || {};
    const ua = String(b.userAgent || "").toLowerCase();

    // ❌ Block Vercel screenshot bots (extra safety)
    if (ua.includes("vercel-screenshot")) {
      return res.status(200).json({ ok: true, skipped: "vercel-screenshot" });
    }

    const clip = (v, n) => {
      const s = (v === null || v === undefined) ? "" : String(v);
      return s.length > n ? s.slice(0, n - 1) + "…" : s;
    };

    const boolStr = (v) =>
      v === true ? "true" : v === false ? "false" : String(v);

    // ✅ Classification
    const isVpn = b.vpn === true || b.proxy === true;
    const isDatabase = b.datacenter === true;
    const isReal = !isVpn && !isDatabase;

    // ---- Build embed (same as before) ----
    const embed = {
      title: "Page Access Logged",
      color: isVpn ? 0xff0000 : isDatabase ? 0xffa500 : 0x008000,
      fields: [
        {
          name: "IP / Flags",
          value: clip(
            `IP: ${b.ip || "unknown"}\nVPN: ${boolStr(b.vpn)}\nProxy: ${boolStr(b.proxy)}\nDatacenter: ${boolStr(b.datacenter)}`,
            1024
          ),
          inline: false
        },
        {
          name: "Page",
          value: clip(
            `URL: ${b.url || ""}\nReferrer: ${b.referrer || ""}`,
            1024
          ),
          inline: false
        },
        {
          name: "Device",
          value: clip(b.userAgent || "unknown", 1024),
          inline: false
        },
        {
          name: "Time",
          value: clip(b.timestamp || new Date().toISOString(), 1024),
          inline: false
        }
      ]
    };

    const destinations = [];

    // ✅ 1. ALL → always
    if (hooks.all) destinations.push(hooks.all);

    // ✅ 2. DATABASE → only datacenter
    if (hooks.database && isDatabase) destinations.push(hooks.database);

    // ✅ 3. VPN → only vpn/proxy
    if (hooks.vpn && isVpn) destinations.push(hooks.vpn);

    // ✅ 4. REAL → only clean traffic
    if (hooks.real && isReal) destinations.push(hooks.real);

    // Deduplicate
    const unique = [...new Set(destinations)];

    await Promise.all(
      unique.map((url) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] })
        })
      )
    );

    return res.status(200).json({
      ok: true,
      sent: unique.length,
      flags: { isVpn, isDatabase, isReal }
    });

  } catch (err) {
    console.error("backend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
