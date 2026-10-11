import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { callApi, features } from "./features";

// ---- Types mirroring backend responses ----
interface Node { id: string; country: string; city: string; latency: number; load: number; protocols: string[]; }
interface Tunnel { peer: string; protocol: string; node: string; down: number; up: number; handshake: string; }

const bandwidth = [
  { t: "00:00", down: 9, up: 2.4 }, { t: "04:00", down: 5, up: 1.1 },
  { t: "08:00", down: 18, up: 5 }, { t: "12:00", down: 27, up: 8 },
  { t: "16:00", down: 31, up: 9.5 }, { t: "20:00", down: 42, up: 13 },
];

export default function App() {
  const [connected, setConnected] = useState(true);
  const [killSwitch, setKillSwitch] = useState(true);
  const [netShield, setNetShield] = useState(true);
  const [accelerate, setAccelerate] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("ch-1");

  useEffect(() => {
    // Wire to live backend — falls back to empty state when API is offline
    callApi<Node[]>("/api/nodes").then(setNodes).catch(() => {});
    callApi<Tunnel[]>("/api/tunnels").then(setTunnels).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-shield-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl border border-shield-800 bg-gradient-to-r from-shield-900 to-shield-900/40 p-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${connected ? "bg-emerald-500/15" : "bg-shield-800"}`}>
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">ShieldVPN Console</h1>
              <p className="text-sm text-slate-400">
                {connected ? "Protected · WireGuard · 21ms" : "Not connected — traffic exposed"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setConnected(!connected)}
            className={`rounded-xl px-6 py-3 font-medium transition ${connected ? "bg-rose-500 hover:bg-rose-400" : "bg-emerald-500 text-shield-950 hover:bg-emerald-400"}`}
          >
            {connected ? "Disconnect" : "Connect"}
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Kill Switch", desc: "nftables drop-outside-tunnel", on: killSwitch, set: setKillSwitch },
            { label: "NetShield", desc: "AdGuard Home: ads, trackers, malware", on: netShield, set: setNetShield },
            { label: "VPN Accelerate", desc: "BBR congestion control + buffers", on: accelerate, set: setAccelerate },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between rounded-xl border border-shield-800 bg-shield-900/60 p-4">
              <div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs text-slate-400">{t.desc}</div>
              </div>
              <button
                onClick={() => t.set(!t.on)}
                className={`h-6 w-11 rounded-full transition ${t.on ? "bg-sky-500" : "bg-shield-700"} relative`}
              >
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

        <div className="rounded-2xl border border-shield-800 bg-shield-900/60 p-6">
          <h2 className="mb-3 text-base font-medium">Exit nodes</h2>
          <div className="flex flex-wrap gap-2">
            {(nodes.length ? nodes : [{ id: "ch-1", country: "Switzerland", city: "Zurich", latency: 21, load: 28, protocols: ["wireguard"] }]).map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedNode(n.id)}
                className={`rounded-full px-3 py-1 text-xs transition ${selectedNode === n.id ? "bg-sky-500 text-shield-950 font-medium" : "bg-shield-800 text-slate-300 hover:bg-shield-700"}`}
              >
                {n.country} · {n.latency}ms
              </button>
            ))}
          </div>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-600">
          {features.length} modules — {features.map((f) => f.label).join(" · ")}
        </footer>
      </div>
    </div>
  );
}
