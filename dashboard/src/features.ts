// Dashboard feature modules — wire to backend APIs
export const features = {
  ddns:         { api: "/api/ddns/status",    label: "DDNS",    desc: "DuckDNS domain + last update" },
  tunnels:      { api: "/api/tunnels",         label: "Tunnels",  desc: "Active WireGuard/sing-box sessions" },
  protocols:    { api: "/api/protocols",       label: "Protocols", desc: "WireGuard, SS, VMess, Trojan, Hysteria2" },
  portForward:  { api: "/api/portfwd",         label: "Port Forwarding", desc: "nftables DNAT rules" },
  killSwitch:   { api: "/api/killswitch",      label: "Kill Switch", desc: "nftables drop-outside-tunnel" },
  splitTunnel:  { api: "/api/split",           label: "Split Tunneling", desc: "Per-app / per-route rules" },
  preferences:  { api: "/api/prefs",           label: "Connection Preferences", desc: "Protocol, DNS, MTU, port" },
  proxies:      { api: "/api/proxies",         label: "Proxies", desc: "SOCKS5 + HTTP proxy auth" },
  profiles:     { api: "/api/profiles",        label: "Profiles", desc: "User & device profiles" },
  countries:    { api: "/api/nodes",          label: "Countries", desc: "Exit nodes + latency" },
  netShield:    { api: "/api/netshield",       label: "NetShield", desc: "AdGuard Home blocked stats" },
  accelerate:   { api: "/api/accelerate",      label: "VPN Accelerate", desc: "BBR + buffer status" },
};
