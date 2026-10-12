// Multi-provider DDNS engine (all open APIs)
// Providers: duckdns.org, dynv6.com, noip.com, cloudflare.com

import https from "https";

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

export async function publicIp() {
  const r = await get("https://api.ipify.org");
  return r.body.trim();
}

export async function geoLookup(ip) {
  try {
    const r = await get("https://ipwho.is/" + ip);
    const j = JSON.parse(r.body);
    return { ip, country: j.country, city: j.city, isp: j.connection && j.connection.isp, flag: j.flag && j.flag.emoji };
  } catch {
    return { ip, country: "unknown", city: "unknown", isp: "unknown", flag: "🌐" };
  }
}

// Update one profile's DNS record. Returns { ok, message }
export async function updateProfile(p) {
  const d = p.ddns || {};
  const ip = await publicIp();
  if (d.lastIp === ip && d.lastUpdate) {
    return { ok: true, message: "unchanged", ip };
  }
  let ok = false, message = "";
  try {
    if (d.provider === "duckdns") {
      const r = await get("https://www.duckdns.org/update?domains=" + d.domain + "&token=" + d.token + "&ip=" + ip);
      ok = r.body.includes("OK"); message = r.body;
    } else if (d.provider === "dynv6") {
      const r = await get("https://dynv6.com/api/update?hostname=" + d.domain + "&token=" + d.token + "&ipv4=" + ip);
      ok = r.status === 200; message = r.body;
    } else if (d.provider === "noip") {
      const auth = Buffer.from(d.user + ":" + d.pass).toString("base64");
      const r = await get("https://dynupdate.no-ip.com/nic/update?hostname=" + d.domain, { Authorization: "Basic " + auth });
      ok = r.body.includes("good") || r.body.includes("nochg"); message = r.body;
    } else if (d.provider === "cloudflare") {
      const url = "https://api.cloudflare.com/client/v4/zones/" + d.zoneId + "/dns_records/" + d.recordId;
      const body = JSON.stringify({ type: "A", name: d.domain, content: ip, ttl: 60 });
      const r = await new Promise((resolve, reject) => {
        const req = https.request(url, { method: "PUT", headers: { Authorization: "Bearer " + d.token, "Content-Type": "application/json" } }, (res) => {
          let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, body: b }));
        });
        req.on("error", reject); req.write(body); req.end();
      });
      ok = JSON.parse(r.body).success === true; message = r.body;
    }
  } catch (e) {
    message = String(e);
  }
  d.lastIp = ip; d.lastUpdate = new Date().toISOString();
  return { ok, message, ip };
}
