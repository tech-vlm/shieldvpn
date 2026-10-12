# ShieldVPN API Server

Express backend that drives the real VPN stack. Runs on the VPN host.

## Run
```bash
cd server
sudo SHIELDVPN_DIR=/etc/shieldvpn node server.js   # needs root for wg/nft
```
Or via docker-compose (host network + NET_ADMIN):
```bash
docker compose up -d api
```

## Endpoints (all under /api)
status (ipify + ipwho.is geo) · profiles CRUD · ddns status/update (DuckDNS, Dynv6, No-IP, Cloudflare)
· tunnels list + up/down (real wg show / wg-quick) · protocols · nodes (live ping latency)
· killswitch on/off (nftables) · portfwd list/add (nft DNAT) · split (per profile)
· prefs get/put · proxies status · netshield (AdGuard Home /control/stats) · accelerate (BBR check)

## Auth
Set `SHIELDVPN_API_KEY` env; dashboard/clients must send `X-Api-Key` header.
Set `ADGUARD_URL` + `ADGUARD_AUTH=user:pass` for NetShield stats.

## DDNS engine
Per-profile DDNS: each profile has { provider, domain, token }. Every 5 minutes the
server checks the public IP (api.ipify.org) and updates via the provider's open API.
