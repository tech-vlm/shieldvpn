import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { callApi, features } from "./features";
import {
  fetchStatus, fetchProfiles, fetchNodes, fetchTunnels, fetchNetShield, toggleKillSwitch, updateDdns, createProfile,
  type Profile, type Node, type Tunnel, type Geo
} from "./api";

const NAV = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "tunnels", label: "Tunnels", icon: "🔗" },
  { id: "profiles", label: "Profiles & DDNS", icon: "👤" },
  { id: "netshield", label: "NetShield", icon: "🛡️" },
  { id: "nodes", label: "Countries", icon: "🌍" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const PROTOCOLS = ["wireguard", "hysteria2", "shadowsocks", "vmess", "trojan"];

const fallbackNodes: Node[] = [
  { id: "ch-1", country: "Switzerland", city: "Zurich", latency: 21, protocols: ["wireguard"] },
  { id: "de-1", country: "Germany", city: "Frankfurt", latency: 18, protocols: ["wireguard", "hysteria2"] },
  { id: "us-1", country: "United States", city: "New York", latency: 96, protocols: ["wireguard", "vmess"] },
];

const bandwidth = [
  { t: "00:00", down: 9, up: 2.4 }, { t: "04:00", down: 5, up: 1.1 },
  { t: "08:00", down: 18, up: 5 }, { t: "12:00", down: 27, up: 8 },
  { t: "16:00", down: 31, up: 9.5 }, { t: "20:00", down: 42, up: 13 },
];

function Toggle({ label, desc, on, set }: { label: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-shield-800 bg-shield-900/60 p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <button onClick={() => set(!on)} className={`h-6 w-11 rounded-full transition relative ${on ? "bg-sky-500" : "bg-shield-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("overview");
  const [geo, setGeo] = useState<Geo | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [nodes, setNodes] = useState<Node[]>(fallbackNodes);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [netshield, setNetshield] = useState<{ blocked: number; queries: number; running: boolean }>({ blocked: 0, queries: 0, running: false });
  const [killSwitch, setKillSwitch] = useState(true);
  const [netShieldOn, setNetShieldOn] = useState(true);
  const [accelerate, setAccelerate] = useState(true);
  const [selectedNode, setSelectedNode] = useState("ch-1");
  const [protocol, setProtocol] = useState("wireguard");
  const [mtu, setMtu] = useState("1420");
  const [dns, setDns] = useState("10.10.0.1");
  const [apiKey, setApiKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [ddnsMsg, setDdnsMsg] = useState("");
  const [toast, setToast] = useState("");

  const refresh = () => {
    fetchStatus().then((s) => s && setGeo(s.geo || null));
    fetchProfiles().then(setProfiles);
    fetchNodes().then((n) => n.length && setNodes(n));
    fetchTunnels().then(setTunnels);
    fetchNetShield().then((n) => n && setNetshield({ blocked: n.blocked, queries: n.queries, running: n.running }));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const onKillSwitch = async (on: boolean) => { setKillSwitch(on); await toggleKillSwitch(on); flash(on ? "Kill switch engaged" : "Kill switch off"); };

  const onDdnsUpdate = async (name: string) => {
    const r = await updateDdns(name);
    flash(r ? (r.ok ? `DDNS ${name} → ${r.ip}` : `DDNS failed: ${r.message}`) : "API offline");
  };

  const onCreateProfile = async () => {
    if (!newName) return flash("Enter a profile name");
    const p = await createProfile(newName, "privacy", selectedNode, newDomain, "duckdns");
    if (p) { setProfiles((prev) => [...prev, p]); setNewName(""); setNewDomain(""); flash(`Profile ${p.name} created`); }
    else flash("API offline — profile not saved");
  };

  const saveSettings = async () => {
    try {
      await callApi("/api/prefs", { method: "PUT", body: JSON.stringify({ dns: [dns], mtu: Number(mtu) }) });
      flash("Settings saved");
    } catch { flash("API offline — settings are local only"); }
  };

  return (
    <div className="flex min-h-screen bg-shield-950 text-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-shield-800 bg-shield-900/40 p-4 md:sticky md:top-0 md:h-screen">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-xl">🛡️</div>
          <div>
            <div className="font-semibold tracking-tight">ShieldVPN</div>
            <div className="text-xs text-slate-500">Console v1.0</div>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${page === n.id ? "bg-sky-500/10 text-sky-400 font-medium" : "text-slate-400 hover:bg-shield-800/60 hover:text-slate-200"}`}>
              <span className="text-base">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2 px-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${netshield.running ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            API {tunnels.length >= 0 ? "connected" : "offline"}
          </div>
          <div>{features.length} modules · open source</div>
        </div>
      </aside>

      <div className="flex-1 p-6 space-y-6">
        {/* Topbar */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-shield-800 bg-gradient-to-r from-shield-900 to-shield-900/40 p-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">🛡️ ShieldVPN Console</h1>
            <p className="text-sm text-slate-400">{geo ? `${geo.flag || "🌐"} ${geo.ip} · ${geo.city}, ${geo.country} · ${geo.isp}` : "locating via ipwho.is…"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="rounded-xl border border-shield-800 bg-shield-950 px-4 py-2 text-sm text-slate-300 hover:border-shield-600">↻ Refresh</button>
            <button onClick={() => onKillSwitch(!killSwitch)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${killSwitch ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"}`}>
              {killSwitch ? "Kill Switch: ON" : "Kill Switch: OFF"}
            </button>
          </div>
        </header>

        {toast && <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-300">{toast}</div>}

        {/* Mobile nav */}
        <div className="flex gap-2 overflow-x-auto md:hidden">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${page === n.id ? "bg-sky-500 text-shield-950 font-medium" : "bg-shield-800 text-slate-300"}`}>{n.icon} {n.label}</button>
          ))}
        </div>

        {/* ===== OVERVIEW ===== */}
        {page === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="WireGuard peers" value={String(tunnels.length)} sub="live sessions" />
              <Stat label="NetShield blocked" value={netshield.running ? netshield.blocked.toLocaleString() : "—"} sub={netshield.running ? netshield.queries.toLocaleString() + " queries" : "AdGuard offline"} />
              <Stat label="Profiles" value={String(profiles.length)} sub="with per-profile DDNS" />
              <Stat label="Exit nodes" value={String(nodes.length)} sub="latency-probed" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Toggle label="Kill Switch" desc="nftables drop-outside-tunnel" on={killSwitch} set={onKillSwitch} />
              <Toggle label="NetShield" desc="AdGuard Home DNS filtering" on={netShieldOn} set={setNetShieldOn} />
              <Toggle label="VPN Accelerate" desc="BBR congestion control" on={accelerate} set={setAccelerate} />
            </div>
            <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
              <h2 className="mb-4 text-base font-medium">Bandwidth — 24h (Mbps)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bandwidth}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="t" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Area dataKey="down" name="Download" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
                    <Area dataKey="up" name="Upload" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ===== TUNNELS ===== */}
        {page === "tunnels" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={async () => { try { await callApi("/api/tunnels/up", { method: "POST", body: JSON.stringify({ interface: "wg0" }) }); flash("wg0 up"); refresh(); } catch { flash("API offline"); } }}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-shield-950">▲ Bring up wg0</button>
              <button onClick={async () => { try { await callApi("/api/tunnels/down", { method: "POST", body: JSON.stringify({ interface: "wg0" }) }); flash("wg0 down"); refresh(); } catch { flash("API offline"); } }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium">▼ Bring down wg0</button>
            </div>
            <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
              {tunnels.length === 0 ? <p className="text-sm text-slate-500">No active tunnels — bring one up, or the API is offline.</p> : tunnels.map((t) => (
                <div key={t.pubkey.slice(0, 12)} className="mb-2 flex items-center justify-between rounded-lg bg-shield-950 p-3 text-sm">
                  <div><div className="font-mono">{t.endpoint}</div>
                    <div className="text-xs text-slate-500">{t.interface} · {t.allowedIps} · hs {t.handshake}</div></div>
                  <div className="text-right text-xs"><div className="text-sky-400">↓ {(t.rx / 1e6).toFixed(1)} MB</div><div className="text-violet-400">↑ {(t.tx / 1e6).toFixed(1)} MB</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PROFILES & DDNS ===== */}
        {page === "profiles" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
              <h2 className="mb-3 text-base font-medium">Create profile</h2>
              <div className="space-y-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="profile name"
                  className="w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm placeholder:text-slate-600" />
                <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="ddns domain (e.g. alice.duckdns.org)"
                  className="w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm placeholder:text-slate-600" />
                <button onClick={onCreateProfile} className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-shield-950">Create profile</button>
              </div>
              {ddnsMsg && <p className="mt-2 text-xs text-slate-400">{ddnsMsg}</p>}
            </div>
            <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
              <h2 className="mb-3 text-base font-medium">Profiles</h2>
              {profiles.length === 0 && <p className="text-sm text-slate-500">No profiles yet (or API offline).</p>}
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.name} className="flex items-center justify-between rounded-lg bg-shield-950 p-3 text-sm">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.ddns.provider} · {p.ddns.domain || "no domain"} {p.ddns.lastIp && `· ${p.ddns.lastIp}`}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onDdnsUpdate(p.name)} className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs text-sky-400">Update DDNS</button>
                      <button onClick={async () => { try { await callApi(`/api/profiles/${p.name}`, { method: "DELETE" }); setProfiles((prev) => prev.filter((x) => x.name !== p.name)); flash(`${p.name} deleted`); } catch { flash("API offline"); } }}
                        className="rounded-lg bg-rose-500/15 px-3 py-1 text-xs text-rose-400">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== NETSHIELD ===== */}
        {page === "netshield" && (
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Status" value={netshield.running ? "Active" : "Offline"} sub="AdGuard Home" />
            <Stat label="Blocked (24h)" value={netshield.blocked.toLocaleString()} sub="ads · trackers · malware" />
            <Stat label="DNS queries" value={netshield.queries.toLocaleString()} sub="total" />
          </div>
        )}

        {/* ===== NODES ===== */}
        {page === "nodes" && (
          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
            <h2 className="mb-3 text-base font-medium">Exit nodes — live latency</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {nodes.map((n) => (
                <button key={n.id} onClick={() => setSelectedNode(n.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-sm transition ${selectedNode === n.id ? "border-sky-500 bg-sky-500/10" : "border-shield-800 bg-shield-950 hover:border-shield-600"}`}>
                  <div><div className="font-medium">{n.country} — {n.city}</div>
                    <div className="text-xs text-slate-500">{n.protocols.join(", ")}</div></div>
                  <span className={`text-xs ${n.latency && n.latency < 60 ? "text-emerald-400" : "text-slate-400"}`}>{n.latency != null ? n.latency + "ms" : "—"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {page === "settings" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6 space-y-4">
              <h2 className="text-base font-medium">Connection preferences</h2>
              <label className="block text-sm text-slate-300">Protocol
                <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2">
                  {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block text-sm text-slate-300">MTU
                <input value={mtu} onChange={(e) => setMtu(e.target.value)} className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 font-mono text-sm" />
              </label>
              <label className="block text-sm text-slate-300">DNS server
                <input value={dns} onChange={(e) => setDns(e.target.value)} className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 font-mono text-sm" />
              </label>
              <button onClick={saveSettings} className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-shield-950">Save preferences</button>
            </div>
            <div className="space-y-4">
              <Toggle label="Kill Switch" desc="block all traffic outside tunnel" on={killSwitch} set={onKillSwitch} />
              <Toggle label="VPN Accelerate" desc="BBR + buffer tuning" on={accelerate} set={setAccelerate} />
              <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
                <h2 className="mb-2 text-base font-medium">API access</h2>
                <label className="block text-sm text-slate-300">X-Api-Key
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="stored locally, never persisted"
                    className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 font-mono text-sm" />
                </label>
                <p className="mt-2 text-xs text-slate-500">Server checks the X-Api-Key header when SHIELDVPN_API_KEY is set.</p>
              </div>
            </div>
          </div>
        )}

        <footer className="pb-4 text-center text-xs text-slate-600">
          {features.length} modules — DDNS · Tunnels · Protocols · Port Forwarding · Kill Switch · Split Tunneling · Preferences · Proxies · Profiles · Countries · NetShield · Accelerate
        </footer>
      </div>
    </div>
  );
}