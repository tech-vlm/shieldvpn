import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { callApi, features } from "./features";
import { fetchStatus, fetchProfiles, fetchNodes, fetchTunnels, fetchNetShield, toggleKillSwitch, updateDdns, createProfile, type Profile, type Node, type Tunnel, type Geo } from "./api";

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

export default function App() {
  const [connected, setConnected] = useState(true);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [nodes, setNodes] = useState<Node[]>(fallbackNodes);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [netshield, setNetshield] = useState<{ blocked: number; queries: number } | null>(null);
  const [killSwitch, setKillSwitch] = useState(true);
  const [netShieldOn, setNetShieldOn] = useState(true);
  const [accelerate, setAccelerate] = useState(true);
  const [selectedNode, setSelectedNode] = useState("ch-1");
  const [activeProfile, setActiveProfile] = useState<string>("");
  const [ddnsMsg, setDdnsMsg] = useState("");
  const [newName, setNewName] = useState("");

  const refresh = () => {
    fetchStatus().then((s) => s && setGeo(s.geo || null));
    fetchProfiles().then(setProfiles);
    fetchNodes().then((n) => n.length && setNodes(n));
    fetchTunnels().then(setTunnels);
    fetchNetShield().then((n) => n && setNetshield({ blocked: n.blocked, queries: n.queries }));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000); // live refresh every 10s
    return () => clearInterval(t);
  }, []);

  const onKillSwitch = async (on: boolean) => { setKillSwitch(on); await toggleKillSwitch(on); };
  const onDdnsUpdate = async () => {
    if (!activeProfile) { setDdnsMsg("select a profile"); return; }
    const r = await updateDdns(activeProfile);
    setDdnsMsg(r ? (r.ok ? "✔ updated → " + r.ip : "✖ " + r.message) : "API offline");
  };
  const onCreateProfile = async () => {
    if (!newName) return;
    const p = await createProfile(newName, "privacy", selectedNode, "", "duckdns");
    if (p) { setProfiles((prev) => [...prev, p]); setNewName(""); }
  };

  return (
    <div className="min-h-screen bg-shield-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-shield-800 bg-gradient-to-r from-shield-900 to-shield-900/40 p-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${connected ? "bg-emerald-500/15" : "bg-shield-800"}`}>
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">ShieldVPN Console</h1>
              <p className="text-sm text-slate-400">
                {geo ? `${geo.flag || "🌐"} ${geo.ip} · ${geo.city}, ${geo.country} · ${geo.isp}` : "locating via ipwho.is…"}
              </p>
            </div>
          </div>
          <button onClick={() => setConnected(!connected)}
            className={`rounded-xl px-6 py-3 font-medium transition ${connected ? "bg-rose-500 hover:bg-rose-400" : "bg-emerald-500 text-shield-950 hover:bg-emerald-400"}`}>
            {connected ? "Disconnect" : "Connect"}
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-4">
            <div className="text-xs text-slate-400">WireGuard peers</div>
            <div className="mt-1 text-2xl font-semibold">{tunnels.length}</div>
          </div>
          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-4">
            <div className="text-xs text-slate-400">NetShield blocked</div>
            <div className="mt-1 text-2xl font-semibold text-sky-400">{netshield ? netshield.blocked.toLocaleString() : "—"}</div>
            <div className="text-xs text-slate-500">{netshield ? netshield.queries.toLocaleString() + " queries" : "AdGuard API offline"}</div>
          </div>
          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-4">
            <div className="text-xs text-slate-400">Profiles</div>
            <div className="mt-1 text-2xl font-semibold">{profiles.length}</div>
          </div>
          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-4">
            <div className="text-xs text-slate-400">DDNS</div>
            <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}
              className="mt-1 w-full rounded-lg border border-shield-800 bg-shield-950 px-2 py-1 text-sm">
              <option value="">select profile…</option>
              {profiles.map((p) => <option key={p.name} value={p.name}>{p.name} · {p.ddns.domain || "no domain"}</option>)}
            </select>
            <button onClick={onDdnsUpdate} className="mt-2 w-full rounded-lg bg-sky-500 py-1 text-xs font-medium text-shield-950">Force update</button>
            {ddnsMsg && <div className="mt-1 truncate text-xs text-slate-400">{ddnsMsg}</div>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Kill Switch", desc: "nftables drop-outside-tunnel", on: killSwitch, set: onKillSwitch },
            { label: "NetShield", desc: "AdGuard Home: ads, trackers, malware", on: netShieldOn, set: setNetShieldOn },
            { label: "VPN Accelerate", desc: "BBR congestion control + buffers", on: accelerate, set: setAccelerate },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between rounded-xl border border-shield-800 bg-shield-900/60 p-4">
              <div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs text-slate-400">{t.desc}</div>
              </div>
              <button onClick={() => t.set(!t.on)}
                className={`h-6 w-11 rounded-full transition ${t.on ? "bg-sky-500" : "bg-shield-700"} relative`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${t.on ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
            <h2 className="mb-3 text-base font-medium">Exit nodes</h2>
            <div className="flex flex-wrap gap-2">
              {nodes.map((n) => (
                <button key={n.id} onClick={() => setSelectedNode(n.id)}
                  className={`rounded-full px-3 py-1 text-xs transition ${selectedNode === n.id ? "bg-sky-500 text-shield-950 font-medium" : "bg-shield-800 text-slate-300 hover:bg-shield-700"}`}>
                  {n.country} · {n.latency != null ? n.latency + "ms" : "—"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
            <h2 className="mb-3 text-base font-medium">New profile</h2>
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="profile name"
                className="flex-1 rounded-lg border border-shield-800 bg-shield-950 px-3 py-2 text-sm placeholder:text-slate-600" />
              <button onClick={onCreateProfile} className="rounded-lg bg-sky-500 px-4 text-sm font-medium text-shield-950">Create</button>
            </div>
            <div className="mt-3 space-y-1">
              {profiles.map((p) => (
                <div key={p.name} className="flex items-center justify-between rounded-lg bg-shield-950 p-2 text-sm">
                  <span>{p.name} <span className="text-xs text-slate-500">· {p.ddns.provider} · {p.ddns.domain || "no domain"}</span></span>
                  <span className="text-xs text-slate-500">{p.ddns.lastUpdate ? new Date(p.ddns.lastUpdate).toLocaleTimeString() : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-600">
          {features.length} modules — live data via /api · open APIs: ipify · ipwho.is · DuckDNS · Dynv6 · No-IP · Cloudflare · AdGuard Home
        </footer>
      </div>
    </div>
  );
}
