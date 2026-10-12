# 🛡️ ShieldVPN — Full-Stack Self-Hosted VPN

Open-source full stack: **dashboard (React) + API (Express) + tunnels (WireGuard & sing-box) + DDNS engine (DuckDNS/Dynv6/No-IP/Cloudflare) + DNS filtering (AdGuard Home) + proxies (Squid/sing-box SOCKS5) + HTTPS reverse proxy (Caddy)**.

## Architecture

```
                    ┌──────────── Caddy (:80/:443, auto-TLS) ────────────┐
   Internet ───────▶│  yourdomain.duckdns.org  →  dashboard + /api/*    │
                    └────────┬──────────────────────────┬───────────────┘
                             ▼                          ▼
                    ┌─────────────────┐        ┌──────────────────┐
                    │  api  :8081     │──────▶│ AdGuard Home     │
                    │  Express        │        │ NetShield :3000  │
                    │  - wg tunnels   │        └──────────────────┘
                    │  - ddns engine  │        ┌──────────────────┐
                    │  - nftables     │──────▶│ WireGuard :51820  │
                    │  - profiles     │        └──────────────────┘
                    └────────┬────────┘        ┌──────────────────┐
                             │                 │ sing-box          │
                    ┌────────┴────────┐        │ SS/VMess/Trojan/ │
                    │  dashboard :8080│        │ Hy2 :2080/:8388   │
                    │  React + Vite   │        └──────────────────┘
                    └─────────────────┘        ┌──────────────────┐
                                               │ Squid HTTP :3128 │
                                               └──────────────────┘
```

## Quickstart (on a Linux VPS with ports 80/443/51820 open)

```bash
git clone https://github.com/tech-vlm/shieldvpn.git && cd shieldvpn

# 1. Set your DDNS domain + API key
export SHIELD_DOMAIN=myvpn.duckdns.org
export SHIELDVPN_API_KEY=$(openssl rand -hex 24)

# 2. Bring up the whole stack
make up

# 3. Open the console
open https://myvpn.duckdns.org     # dashboard
curl https://myvpn.duckdns.org/api/status   # live API
```

Bare-metal alternative (no Docker): `sudo bash install.sh --ddns-domain myvpn.duckdns.org` then `cd server && sudo node server.js`.

## Open-source APIs used
| Service | API | Use |
|---|---|---|
| ipify | api.ipify.org | public IP detection |
| ipwho.is | ipwho.is | IP geolocation (header card) |
| DuckDNS / Dynv6 / No-IP / Cloudflare | update endpoints | per-profile DDNS engine (5-min scheduler) |
| AdGuard Home | /control/stats | NetShield blocked stats |
| WireGuard | `wg show` / `wg-quick` | live tunnels + up/down |
| sing-box | config + runtime | SS / VMess / Trojan / Hysteria2 |
| nftables | `nft` CLI | kill switch + port forwarding |
| Caddy | ACME (Let's Encrypt) | automatic HTTPS |

## Modules (dashboard sidebar)
Dashboard · Tunnels · Profiles (per-profile DDNS) · Countries (world map + live latency) · NetShield · Settings (MTU/DNS, kill switch, theme, accent)

## Security
- Set `SHIELDVPN_API_KEY` — clients must send `X-Api-Key` header
- Caddy enforces HSTS + security headers
- Kill switch: nftables drops any traffic outside the tunnel
- Gitleaks runs in CI; placeholder creds in samples are allowlisted

## CI/CD (GitHub Actions)
- `CI` — shellcheck + JSON validation + dashboard docker build
- `Security` — Gitleaks on every push + nightly
- `Dashboard CI/CD` — typecheck + build + Netlify deploy (if secrets set)
- `Deploy Dashboard to GitHub Pages` — typecheck + build + Pages deploy

## Live dashboard (GitHub Pages)
https://tech-vlm.github.io/shieldvpn/ — demo mode when the API is offline.
