# ShieldVPN Console (React + Vite + Tailwind)

Admin dashboard for the ShieldVPN full-stack VPN.

## Modules (mapped in src/features.ts)
DDNS, Tunnels, Protocols, Port Forwarding, Kill Switch, Split Tunneling,
Connection Preferences, Proxies, Profiles, Countries, NetShield, VPN Accelerate.

## Dev
```bash
cd dashboard
npm install
npm run dev        # proxies /api -> localhost:8081
```

## Production
```bash
npm run build      # outputs dist/
```

## Netlify
Deployed via `netlify.toml` (base=dashboard, publish=dist).
`/api/*` is reverse-proxied to the VPN server (set your real domain in the redirect).
Set `VITE_API_BASE` env var on Netlify to override the API target.
