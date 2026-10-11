#!/usr/bin/env bash
set -euo pipefail
CMD=${1:-help}; shift || true
case "$CMD" in
  profile)   bash profiles/profile.sh "$@" ;;
  ddns)      bash vpn/ddns/update-ddns.sh ;;
  killswitch)  nft -f core/nftables/killswitch.nft && echo "[✔] Kill switch ON" ;;
  portfwd)   nft -f core/nftables/portforward.nft && echo "[✔] Port forwarding applied" ;;
  accelerate) bash accelerate/enable.sh ;;
  nodes)     bash countries/probe.sh ;;
  help|*) cat <<'EOF'
ShieldVPN Manager
  profile create <name> [preset]   create user profile
  profile delete <name>           delete profile
  killswitch [on]                 enable kill switch
  portfwd                         apply port-forward rules
  accelerate                      enable BBR tuning
  nodes                           probe exit-node latency
  ddns                            force DDNS update
EOF
esac
