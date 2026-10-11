#!/usr/bin/env bash
# Latency probe all exit nodes for VPN Accelerate best-route picker
for node in $(jq -r '.nodes[].ip' countries/exit-nodes.json); do
  ms=$(ping -c 3 -W 2 "$node" | awk -F'/' '/rtt/ {print int($5)}')
  echo "$node $ms ms"
done | sort -k2 -n
