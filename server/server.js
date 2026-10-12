// ShieldVPN API server — drives real VPN, DDNS, kill switch, proxies.
// Run on the VPN box: sudo node server.js (needs root for wg/nft)
import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { publicIp, geoLookup, updateProfile } from "./ddns.js";

const run = promisify(exec);
const app = express();
app.use(express.json());

const CFG_DIR = process.env.SHIELDVPN_DIR || "/etc/shieldvpn";
const CFG_FILE = path.join(CFG_DIR, "config.json");

const DEFAULT_CONFIG = {
  profiles: [],
  protocol: "wireguard",
  killSwitch: true, netshield: true, accelerate: true,
  defaults: { dns: ["10.10.0.1"], mtu: 1420, autoReconnect: true }
};

if (!fs.existsSync(CFG_DIR)) fs.mkdirSync(CFG_DIR, { recursive: true });
let config = fs.existsSync(CFG_FILE)
  ? JSON.parse(fs.readFileSync(CFG_FILE, "utf8"))
  : JSON.parse(JSON.stringify(DEFAULT_CONFIG));
const save = () => fs.writeFileSync(CFG_FILE, JSON.stringify(config, null, 2));

const EXIT_NODES = [
  { id: "de-1", country: "Germany", city: "Frankfurt", ip: "203.0.113.10", protocols: ["wireguard", "hysteria2"] },
  { id: "nl-1", country: "Netherlands", city: "Amsterdam", ip: "203.0.113.11", protocols: ["wireguard", "shadowsocks"] },
  { id: "gb-1", country: "United Kingdom", city: "London", ip: "203.0.113.13", protocols: ["wireguard", "trojan"] },
  { id: "us-1", country: "United States", city: "New York", ip: "203.0.113.12", protocols: ["wireguard", "vmess"] },
  { id: "sg-1", country: "Singapore", city: "Singapore", ip: "203.0.113.14", protocols: ["wireguard", "hysteria2"] },
  { id: "jp-1", country: "Japan", city: "Tokyo", ip: "203.0.113.15", protocols: ["wireguard", "shadowsocks"] },
  { id: "ch-1", country: "Switzerland", city: "Zurich", ip: "203.0.113.16", protocols: ["wireguard"] }
];

const PROTOCOLS = [
  { id: "wireguard", label: "WireGuard", desc: "Kernel-fast encrypted tunnel", enabled: true },
  { id: "hysteria2", label: "Hysteria2", desc: "QUIC-based, lossy networks", enabled: true },
  { id: "shadowsocks", label: "Shadowsocks", desc: "SOCKS5 chacha20 proxy", enabled: true },
  { id: "vmess", label: "VMess", desc: "V2Ray obfuscated", enabled: false },
  { id: "trojan", label: "Trojan", desc: "TLS-camouflaged :443", enabled: false }
];

// ---------- middleware ----------
app.use((req, res, next) => {
  if (req.get("X-Api-Key") !== process.env.SHIELDVPN_API_KEY && process.env.SHIELDVPN_API_KEY) {
    return res.status(401).json({ error: "bad api key" });
  }
  next();
});

// ---------- status & geo (open APIs) ----------
app.get("/api/status", async (req, res) => {
  try {
    const ip = await publicIp();
    const geo = await geoLookup(ip);
    res.json({ online: true, geo, uptime: process.uptime() | 0 });
  } catch (e) { res.status(503).json({ online: false, error: String(e) }); }
});

// ---------- profiles ----------
app.get("/api/profiles", (req, res) => res.json(config.profiles));

app.post("/api/profiles", async (req, res) => {
  const { name, preset, node, protocol, ddns, splitTunnel } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  if (config.profiles.find((p) => p.name === name)) return res.status(409).json({ error: "exists" });
  const p = {
    name, preset: preset || "defaults", node: node || "ch-1", protocol: protocol || "wireguard",
    killSwitch: config.killSwitch, netshield: config.netshield, accelerate: config.accelerate,
    splitTunnel: splitTunnel || { mode: "off", apps: [], routes: [] },
    ddns: ddns || { provider: "duckdns", domain: "", token: "", lastIp: "", lastUpdate: null },
    created: Date.now()
  };
  config.profiles.push(p); save();
  try { const r = await updateProfile(p); save(); } catch {}
  res.status(201).json(p);
});

app.delete("/api/profiles/:name", (req, res) => {
  config.profiles = config.profiles.filter((p) => p.name !== req.params.name);
  save(); res.json({ ok: true });
});

// ---------- DDNS ----------
app.get("/api/ddns/status", (req, res) => {
  res.json(config.profiles.map((p) => ({ name: p.name, ...p.ddns })));
});

app.post("/api/ddns/update", async (req, res) => {
  const name = req.body.profile;
  const p = config.profiles.find((x) => x.name === name);
  if (!p) return res.status(404).json({ error: "profile not found" });
  const r = await updateProfile(p);
  save();
  res.json({ profile: p.name, ...r });
});

// ---------- tunnels (real WireGuard) ----------
app.get("/api/tunnels", async (req, res) => {
  try {
    const { stdout } = await run("wg show all dump");
    const lines = stdout.trim().split("\n").filter(Boolean);
    const peers = lines.slice(1).filter((l) => l.split("\t").length === 9);
    res.json(peers.map((l) => {
      const f = l.split("\t");
      return { interface: f[0], pubkey: f[1], endpoint: f[3], allowedIps: f[4], handshake: f[5] === "0" ? "none" : (Math.round(Date.now() / 1000) - Number(f[5])) + "s ago", rx: Number(f[6]), tx: Number(f[7]) };
    }));
  } catch { res.json([]); }
});

app.post("/api/tunnels/:action", async (req, res) => {
  const a = req.params.action, iface = req.body.interface || "wg0";
  if (!["up", "down"].includes(a)) return res.status(400).json({ error: "up|down only" });
  try { await run("wg-quick " + a + " " + iface); res.json({ ok: true, action: a }); }
  catch (e) { res.status(500).json({ error: String(e.stderr || e) }); }
});

// ---------- protocols / nodes ----------
app.get("/api/protocols", (req, res) => res.json(PROTOCOLS));
app.get("/api/nodes", async (req, res) => {
  const nodes = await Promise.all(EXIT_NODES.map(async (n) => {
    let latency = null;
    try {
      const { stdout } = await run("ping -c 2 -W 2 " + n.ip);
      latency = parseFloat(stdout.match(/= [0-9.]+\/([0-9.]+)/)[1]);
    } catch {}
    return { ...n, latency };
  }));
  res.json(nodes);
});

// ---------- kill switch / port forwarding / split (nftables) ----------
app.post("/api/killswitch", async (req, res) => {
  const on = !!req.body.on;
  try {
    if (on) await run("nft -f /opt/shieldvpn/core/nftables/killswitch.nft");
    else await run("nft delete table inet shieldvpn");
    config.killSwitch = on; save();
    res.json({ ok: true, killSwitch: on });
  } catch (e) { res.status(500).json({ error: String(e.stderr || e) }); }
});

app.get("/api/portfwd", async (req, res) => {
  try { const { stdout } = await run("nft -j list table inet shieldvpn_fwd"); res.json(JSON.parse(stdout)); }
  catch { res.json({ rules: [] }); }
});

app.post("/api/portfwd", async (req, res) => {
  const { wanPort, destIp, destPort } = req.body;
  const cmd = "nft add rule inet shieldvpn_fwd prerouting iifname eth0 tcp dport " + wanPort + " dnat to " + destIp + ":" + destPort;
  try { await run(cmd); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: String(e.stderr || e) }); }
});

app.get("/api/split", (req, res) => {
  const name = req.query.profile;
  const p = config.profiles.find((x) => x.name === name) || config.profiles[0];
  res.json(p ? p.splitTunnel : { mode: "off", apps: [], routes: [] });
});

// ---------- preferences / proxies ----------
app.get("/api/prefs", (req, res) => res.json(config.defaults));
app.put("/api/prefs", (req, res) => { config.defaults = { ...config.defaults, ...req.body }; save(); res.json(config.defaults); });

app.get("/api/proxies", async (req, res) => {
  const check = async (name, cmd) => { try { await run(cmd); return true; } catch { return false; } };
  res.json({
    shadowsocks: { port: 8388, running: await check("ss", "systemctl is-active shadowsocks-libev") },
    squid: { port: 3128, running: await check("squid", "systemctl is-active squid") }
  });
});

// ---------- NetShield (AdGuard Home open API) ----------
app.get("/api/netshield", async (req, res) => {
  const base = process.env.ADGUARD_URL || "http://127.0.0.1:3000";
  const auth = process.env.ADGUARD_AUTH || "";
  try {
    const r = await fetch(base + "/control/stats", auth ? { headers: { Authorization: "Basic " + Buffer.from(auth).toString("base64") } } : {});
    const s = await r.json();
    res.json({ running: true, blocked: s.num_blocked_filtering || 0, queries: s.num_dns_queries || 0, top: (s.top_blocked_domains || []).slice(0, 5).map((d) => ({ domain: Object.keys(d)[0], count: Object.values(d)[0] })) });
  } catch { res.json({ running: false, blocked: 0, queries: 0, top: [] }); }
});

// ---------- accelerate ----------
app.get("/api/accelerate", async (req, res) => {
  try {
    const cc = (await run("cat /proc/sys/net/ipv4/tcp_congestion_control")).stdout.trim();
    res.json({ bbr: cc === "bbr", congestionControl: cc });
  } catch { res.json({ bbr: false, congestionControl: "unknown" }); }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log("ShieldVPN API on :" + PORT));

// Scheduled DDNS refresh — every 5 minutes for every profile
setInterval(async () => {
  for (const p of config.profiles) {
    if (!p.ddns || !p.ddns.domain || !p.ddns.token) continue;
    try { await updateProfile(p); } catch {}
  }
  save();
}, 5 * 60 * 1000);
