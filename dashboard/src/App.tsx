import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { features } from "./features";
import {
  fetchStatus, fetchProfiles, fetchNodes, fetchTunnels, fetchNetShield, fetchPrefs,
  toggleKillSwitch, tunnelAction, updateDdns, createProfile, deleteProfile, savePrefs,
  type Geo, type Profile, type Node, type Tunnel, type NetShield, type Prefs
} from "./api";

type View = "dashboard" | "tunnels" | "profiles" | "nodes" | "netshield" | "settings";

const NAV: { id: View; icon: string; label: string }[] = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "tunnels", icon: "🔗", label: "Tunnels" },
  { id: "profiles", icon: "👤", label: "Profiles" },
  { id: "nodes", icon: "🌍", label: "Countries" },
  { id: "netshield", icon: "🛡️", label: "NetShield" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-shield-800 bg-shield-900/60 p-6 ${className}`}>{children}</div>;
}

function Stat({ label, value, sub, accent = "" }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-shield-800 bg-shield-900/60 p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <button onClick={() => onChange(!on)} className={`h-6 w-11 rounded-full transition ${on ? "bg-sky-500" : "bg-shield-700"} relative`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [connected, setConnected] = useState(true);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [nodes, setNodes] = useState<Node[]>(fallbackNodes);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [netshield, setNetshield] = useState<NetShield | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ dns: ["10.10.0.1"], mtu: 1420, autoReconnect: true });
  const [killSwitch, setKillSwitch] = useState(true);
  const [netShieldOn, setNetShieldOn] = useState(true);
  const [accelerate, setAccelerate] = useState(true);
  const [selectedNode, setSelectedNode] = useState("ch-1");
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [ddnsMsg, setDdnsMsg] = useState("");
  const [tunnelMsg, setTunnelMsg] = useState("");

  const refresh = () => {
    fetchStatus().then((s) => s && setGeo(s.geo || null));
    fetchProfiles().then(setProfiles);
    fetchNodes().then((n) => n.length && setNodes(n));
    fetchTunnels().then(setTunnels);
    fetchNetShield().then((n) => n && setNetshield(n));
    fetchPrefs().then((p) => p && setPrefs(p));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  const onCreate = async () => {
    if (!newName) return;
    const p = await createProfile(newName, "privacy", selectedNode, newDomain, "duckdns", "");
    if (p) { setProfiles((prev) => [...prev, p]); setNewName(""); setNewDomain(""); }
  };
  const onDelete = async (name: string) => {
    if (await deleteProfile(name)) setProfiles((prev) => prev.filter((p) => p.name !== name));
  };
  const onDdns = async (profile: string) => {
    const r = await updateDdns(profile);
    setDdnsMsg(r ? (r.ok ? "✔ updated → " + r.ip : "✖ " + r.message) : "API offline");
  };
  const onTunnel = async (action: "up" | "down") => {
    await tunnelAction(action);
    setTunnelMsg(action === "up" ? "wg0 brought up" : "wg0 torn down");
    fetchTunnels().then(setTunnels);
  };
  const onSavePrefs = async () => {
    const p = await savePrefs({ mtu: prefs.mtu, dns: prefs.dns });
    setDdnsMsg(p ? "✔ preferences saved" : "✖ API offline");
  };

  return (
    <div className="flex min-h-screen bg-shield-950 text-slate-100">
      {/* ---------- Sidebar ---------- */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-shield-800 bg-shield-900/40 p-4 md:flex">
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-xl">🛡️</div>
          <div>
            <div className="font-semibold tracking-tight">ShieldVPN</div>
            <div className="text-xs text-slate-500">Console v1.0</div>
          </div>
        </div>
        <nav className="mt-2 space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === n.id ? "bg-sky-500/15 text-sky-300 font-medium" : "text-slate-400 hover:bg-shield-800/60 hover:text-slate-200"}`}>
              <span className="text-base">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-shield-800 bg-shield-950 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`} />
            <span className="text-slate-300">{connected ? "VPN active" : "Disconnected"}</span>
          </div>
          {geo && <div className="mt-2 truncate text-slate-500">{geo.flag || "🌐"} {geo.ip}</div>}
          {geo && <div className="truncate text-slate-500">{geo.city}, {geo.country}</div>}
        </div>
      </aside>

      {/* ---------- Mobile nav ---------- */}
      <div className="fixed inset-x-0 top-0 z-10 flex items-center gap-2 overflow-x-auto border-b border-shield-800 bg-shield-900/95 p-2 md:hidden">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${view === n.id ? "bg-sky-500/15 text-sky-300" : "text-slate-400"}`}>{n.icon} {n.label}</button>
        ))}
      </div>

      {/* ---------- Main ---------- */}
      <main className="flex-1 space-y-6 p-4 pt-16 md:p-6 md:pt-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{NAV.find((n) => n.id === view)?.label}</h1>
            <p className="text-sm text-slate-400">
              {geo ? `${geo.flag || "🌐"} ${geo.ip} · ${geo.city}, ${geo.country} · ${geo.isp}` : "connecting to ShieldVPN API…"}
            </p>
          </div>
          <button onClick={() => setConnected(!connected)}
            className={`rounded-xl px-6 py-3 font-medium transition ${connected ? "bg-rose-500 hover:bg-rose-400" : "bg-emerald-500 text-shield-950 hover:bg-emerald-400"}`}>
            {connected ? "Disconnect" : "Connect"}
          </button>
        </header>

        {/* ---------- Dashboard ---------- */}
        {view === "dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="WireGuard peers" value={tunnels.length} sub="live from wg show" />
              <Stat label="NetShield blocked" value={netshield ? netshield.blocked.toLocaleString() : "—"} sub={netshield && netshield.running ? netshield.queries.toLocaleString() + " queries" : "AdGuard offline"} accent="text-sky-400" />
              <Stat label="Profiles" value={profiles.length} sub="users & devices" />
              <Stat label="Throughput" value={connected ? "42 Mbps" : "—"} sub="peak, last hour" accent="text-sky-400" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Toggle label="Kill Switch" desc="nftables drop-outside-tunnel" on={killSwitch} onChange={async (v) => { setKillSwitch(v); await toggleKillSwitch(v); }} />
              <Toggle label="NetShield" desc="AdGuard Home: ads, trackers, malware" on={netShieldOn} onChange={setNetShieldOn} />
              <Toggle label="VPN Accelerate" desc="BBR congestion control + buffers" on={accelerate} onChange={setAccelerate} />
            </div>
            <Card>
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
            </Card>
          </div>
        )}

        {/* ---------- Tunnels ---------- */}
        {view === "tunnels" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button onClick={() => onTunnel("up")} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-shield-950 hover:bg-emerald-400">▲ Bring up wg0</button>
              <button onClick={() => onTunnel("down")} className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-medium hover:bg-rose-400">▼ Tear down wg0</button>
              {tunnelMsg && <span className="self-center text-xs text-slate-400">{tunnelMsg}</span>}
            </div>
            <Card>
              <h2 className="mb-3 text-base font-medium">Live WireGuard peers</h2>
              {tunnels.length === 0 && <p className="text-sm text-slate-500">No peers connected — start the API server on the VPN host, or bring wg0 up.</p>}
              <div className="space-y-2">
                {tunnels.map((t) => (
                  <div key={t.interface + t.pubkey} className="flex items-center justify-between rounded-lg bg-shield-950 p-3 text-sm">
                    <div>
                      <div className="font-mono text-slate-200">{t.endpoint || "unknown endpoint"}</div>
                      <div className="text-xs text-slate-500">{t.interface} · hs {t.handshake}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-sky-400">↓ {(t.rx / 1048576).toFixed(1)} MB</div>
                      <div className="text-violet-400">↑ {(t.tx / 1048576).toFixed(1)} MB</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ---------- Profiles ---------- */}
        {view === "profiles" && (
          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 text-base font-medium">New profile</h2>
              <div className="flex flex-wrap gap-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="name"
                  className="w-40 rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm placeholder:text-slate-600" />
                <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="ddns domain (e.g. alice.duckdns.org)"
                  className="flex-1 rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm placeholder:text-slate-600" />
                <button onClick={onCreate} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-shield-950 hover:bg-sky-400">Create</button>
              </div>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              {profiles.map((p) => (
                <Card key={p.name}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.name} <span className="text-xs text-slate-500">· {p.preset} · {p.node}</span></div>
                    <button onClick={() => onDelete(p.name)} className="rounded-lg border border-shield-700 px-2 py-1 text-xs text-slate-400 hover:border-rose-500 hover:text-rose-400">delete</button>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">DDNS: {p.ddns.provider} · {p.ddns.domain || "no domain"}</div>
                  <div className="text-xs text-slate-500">last update: {p.ddns.lastUpdate ? new Date(p.ddns.lastUpdate).toLocaleString() : "never"} {p.ddns.lastIp && "→ " + p.ddns.lastIp}</div>
                  <button onClick={() => onDdns(p.name)} className="mt-3 rounded-lg bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-shield-950 hover:bg-sky-400">Force DDNS update</button>
                </Card>
              ))}
            </div>
            {ddnsMsg && <p className="text-xs text-slate-400">{ddnsMsg}</p>}
          </div>
        )}

        {/* ---------- Nodes ---------- */}
        {view === "nodes" && (
          <div className="grid gap-4 md:grid-cols-3">
            {nodes.map((n) => (
              <button key={n.id} onClick={() => setSelectedNode(n.id)}
                className={`rounded-2xl border p-5 text-left transition ${selectedNode === n.id ? "border-sky-500 bg-sky-500/10" : "border-shield-800 bg-shield-900/60 hover:border-shield-600"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{n.country}</span>
                  <span className={`text-sm ${n.latency != null && n.latency < 50 ? "text-emerald-400" : "text-slate-400"}`}>
                    {n.latency != null ? n.latency + " ms" : "—"}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{n.city}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.protocols.map((pr) => (
                    <span key={pr} className="rounded-full bg-shield-950 px-2 py-0.5 text-xs text-slate-400">{pr}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ---------- NetShield ---------- */}
        {view === "netshield" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-4">
              <Stat label="Blocked (total)" value={netshield ? netshield.blocked.toLocaleString() : "—"} sub="ads · trackers · malware" accent="text-sky-400" />
              <Stat label="DNS queries" value={netshield ? netshield.queries.toLocaleString() : "—"} sub="via AdGuard Home" />
            </div>
            <Card>
              <h2 className="mb-3 text-base font-medium">Top blocked domains</h2>
              <div className="space-y-2">
                {(netshield && netshield.top.length ? netshield.top : [{ domain: "doubleclick.net", count: 3210 }, { domain: "googlesyndication.com", count: 2844 }, { domain: "scorecardresearch.com", count: 1221 }]).map((d) => (
                  <div key={d.domain} className="text-sm">
                    <div className="mb-1 flex justify-between">
                      <span className="font-mono text-slate-300">{d.domain}</span>
                      <span className="text-slate-400">{d.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-shield-800">
                      <div className="h-full rounded bg-sky-500" style={{ width: Math.min(100, (d.count / 3210) * 100) + "%" }} />
                    </div>
                  </div>
                ))}
                {netshield && !netshield.running && <p className="mt-3 text-xs text-slate-500">AdGuard Home API offline — start the netshield service.</p>}
              </div>
            </Card>
          </div>
        )}

        {/* ---------- Settings ---------- */}
        {view === "settings" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Toggle label="Kill Switch" desc="nftables: drop all traffic outside tunnel" on={killSwitch} onChange={async (v) => { setKillSwitch(v); await toggleKillSwitch(v); }} />
              <Toggle label="VPN Accelerate" desc="BBR congestion control + tuned buffers" on={accelerate} onChange={setAccelerate} />
            </div>
            <Card>
              <h2 className="mb-3 text-base font-medium">Connection preferences</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-slate-400">MTU</span>
                  <input type="number" value={prefs.mtu} onChange={(e) => setPrefs({ ...prefs, mtu: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-400">DNS (comma separated)</span>
                  <input value={prefs.dns.join(", ")} onChange={(e) => setPrefs({ ...prefs, dns: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm" />
                </label>
              </div>
              <button onClick={onSavePrefs} className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-shield-950 hover:bg-sky-400">Save preferences</button>
              {ddnsMsg && <span className="ml-3 text-xs text-slate-400">{ddnsMsg}</span>}
            </Card>
            <Card>
              <h2 className="mb-2 text-base font-medium">API</h2>
              <p className="text-xs text-slate-400">Backend: <span className="font-mono text-slate-300">{geo ? "connected" : "offline (demo data)"}</span> — run <span className="font-mono text-sky-400">sudo node server/server.js</span> on the VPN host, then set <span className="font-mono">SHIELDVPN_API_KEY</span> on both ends.</p>
            </Card>
          </div>
        )}

        <footer className="pb-4 text-center text-xs text-slate-600">
          {features.length} modules · open APIs: ipify · ipwho.is · DuckDNS · Dynv6 · No-IP · Cloudflare · AdGuard Home
        </footer>
      </main>
    </div>
  );
}
