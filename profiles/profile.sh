#!/usr/bin/env bash
set -euo pipefail
CMD=${1:?}; NAME=${2:?}; PRESET=${3:-defaults}
DIR=/etc/shieldvpn/profiles; mkdir -p "$DIR"
case "$CMD" in
  create)
    PASSWORD=$(tr -dc 'A-Za-z0-9!@#' </dev/urandom | head -c 16)
    PRIV=$(wg genkey); PUB=$(echo "$PRIV" | wg pubkey); PSK=$(wg genpsk)
    IP="10.10.0.$(( $(ls "$DIR" | wc -l) + 2 ))"
    jq --arg n "$NAME" --arg preset "$PRESET" \
       '.presets[$preset] * {name:$name}' profiles/defaults.json > "$DIR/$NAME.settings"
    cat > "$DIR/$NAME.conf" <<EOF
[Interface]
PrivateKey = $PRIV
Address = $IP/32
DNS = 10.10.0.1
[Peer]
PublicKey = $(cat /etc/wireguard/server.pub)
PresharedKey = $PSK
Endpoint = myvpn.duckdns.org:51820
AllowedIPs = 0.0.0.0/0
EOF
    echo "user=$NAME password=$PASSWORD ip=$IP"
    qrencode -t ansiutf8 < "$DIR/$NAME.conf"
    ;;
  delete) rm -f "$DIR/$NAME.conf" "$DIR/$NAME.settings" && echo "[✔] removed $NAME" ;;
esac
