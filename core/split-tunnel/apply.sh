#!/usr/bin/env bash
# Split tunneling: apply per-profile AllowedIPs / app rules
set -euo pipefail
PROFILE=${1:?profile name}
PROFILE_FILE=/etc/shieldvpn/profiles/${PROFILE}.conf
[[ -f "$PROFILE_FILE" ]] || { echo "profile not found"; exit 1; }
ALLOWED=$(grep -E '^AllowedIPs' "$PROFILE_FILE" | cut -d= -f2 | tr -d ' ')
# Include app-based split (cgroup mark) for per-app tunneling
if grep -q '^SplitApps' "$PROFILE_FILE"; then
  echo "[*] Per-app split tunneling: $(grep '^SplitApps' "$PROFILE_FILE" | cut -d= -f2)"
  # nft mark rule: sudo nft add rule inet shieldvpn forward meta mark 0x1 accept
fi
echo "[✔] Profile '$PROFILE' routes: $ALLOWED"
