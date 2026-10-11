# Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| ci.yml | push/PR | Shellcheck, JSON validation, docker build |
| security.yml | push + nightly | Gitleaks secret scanning |
| dashboard.yml | push/PR (dashboard/**) | Typecheck, build, deploy to Netlify |

## Netlify auto-deploy setup (one-time)

1. **Get credentials** from Netlify:
   - Site ID: Site settings → General → Site details → *Site ID*
   - Auth token: User settings → Applications → *New personal access token*
2. **Add secrets** to the GitHub repo (Settings → Secrets and variables → Actions):
   - `NETLIFY_SITE_ID` = your site ID
   - `NETLIFY_AUTH_TOKEN` = the token
3. Push to `main` — the workflow typechecks, builds, and deploys automatically.

Alternatively, connect the repo via Netlify UI (app.netlify.com/start) and remove the
`deploy-netlify` job — Netlify will build using `dashboard/netlify.toml` on every push.

## Notes
- The workflow skips Netlify deploy on PRs (only builds).
- If `NETLIFY_SITE_ID`/token secrets are missing, build still runs; deploy job fails fast with a clear message.
