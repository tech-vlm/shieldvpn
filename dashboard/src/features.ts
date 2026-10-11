// ShieldVPN Console — feature modules mapped to backend API routes.
// Backend: see repo bin/manager.sh + core/ — expose via FastAPI/Express at :8081,
// reverse-proxied by Caddy on your DuckDNS domain with HTTPS.

export interface FeatureModule {
  key: string;
  label: string;
  desc: string;
  api: { method: string; path: string };
}

export const features: FeatureModule[] = [
  { key: "ddns",         label: "DDNS",                 desc: "DuckDNS domain + last update",        api: { method: "GET",  path: "/api/ddns/status" } },
  { key: "tunnels",      label: "Tunnels",              desc: "Active WireGuard/sing-box sessions",   api: { method: "GET",  path: "/api/tunnels" } },
  { key: "protocols",    label: "Protocols",           desc: "WireGuard, SS, VMess, Trojan, Hy2",    api: { method: "GET",  path: "/api/protocols" } },
  { key: "portfwd",      label: "Port Forwarding",     desc: "nftables DNAT rules",                  api: { method: "GET",  path: "/api/portfwd" } },
  { key: "killswitch",   label: "Kill Switch",         desc: "nftables drop-outside-tunnel",         api: { method: "POST", path: "/api/killswitch" } },
  { key: "split",        label: "Split Tunneling",     desc: "Per-app / per-route rules",            api: { method: "GET",  path: "/api/split" } },
  { key: "prefs",        label: "Connection Prefs",    desc: "Protocol, DNS, MTU, port",             api: { method: "GET",  path: "/api/prefs" } },
  { key: "proxies",      label: "Proxies",             desc: "SOCKS5 + HTTP proxy auth",             api: { method: "GET",  path: "/api/proxies" } },
  { key: "profiles",     label: "Profiles",            desc: "User & device profiles",              api: { method: "GET",  path: "/api/profiles" } },
  { key: "countries",    label: "Countries",           desc: "Exit nodes + latency probes",         api: { method: "GET",  path: "/api/nodes" } },
  { key: "netshield",    label: "NetShield",           desc: "AdGuard Home blocked stats",           api: { method: "GET",  path: "/api/netshield" } },
  { key: "accelerate",   label: "VPN Accelerate",      desc: "BBR + buffer status",                 api: { method: "GET",  path: "/api/accelerate" } },
];

export async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
