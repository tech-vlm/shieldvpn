# 🛡️ ShieldVPN — Full-Stack Open-Source VPN

Enterprise-grade, 100% open-source VPN stack with a sleek React dashboard.

| Feature | Implementation |
|---|---|
| Multi-protocol tunnels | sing-box: WireGuard, Shadowsocks, VMess, Trojan, Hysteria2 |
| DDNS | DuckDNS / Dynv6 / Cloudflare API updater |
| Port forwarding | nftables DNAT manager + per-user rules |
| Kill switch | nftables drop-all-outside-tunnel policy |
| Split tunneling | Per-app & per-route AllowedIPs engine |
| Connection preferences | Per-profile protocol/port/DNS settings |
| Proxies | Shadowsocks SOCKS5 + Squid HTTP (auth) |
| Profiles | JSON profile system (device/user) |
| Countries | 25+ exit-node registry with latency probes |
| NetShield | AdGuard Home DNS filtering (ads/malware/trackers) |
| VPN Accelerate | BBR congestion control + WireGuard multitunnel + TCP tuning |

## Quick Start
```bash
sudo bash install.sh --ddns myvpn.duckdns.org
sudo bash bin/manager.sh profile create alice
```

Docker: `docker compose up -d`

## Layout
- `core/` — sing-box & WireGuard configs, nftables policies
- `netshield/` — AdGuard Home filter config
- `accelerate/` — BBR + sysctl tuning
- `countries/` — exit node registry
- `profiles/` — profile engine
- `bin/` — manager CLI
- `dashboard/` — React admin panel
- `.github/workflows/` — CI + security scanning

License: GPL-3.0
