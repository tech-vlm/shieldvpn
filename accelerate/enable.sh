#!/usr/bin/env bash
set -euo pipefail
echo "[*] Enabling VPN Accelerate (BBR + buffers)..."
cp accelerate/sysctl-tuning.conf /etc/sysctl.d/99-shieldvpn-accelerate.conf
sysctl --system
modprobe tcp_bbr || true
echo "[✔] Accelerate enabled"
