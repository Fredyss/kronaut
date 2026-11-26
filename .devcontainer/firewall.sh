#!/usr/bin/env bash
set -euo pipefail

dir="$(dirname "$(readlink -f "$0")")"
chain=KRONAUT_EGRESS

nameservers="$(awk '/^nameserver/ && $2 ~ /^[0-9.]+$/ { print $2 }' /etc/resolv.conf)"
if [ -z "$nameservers" ]; then
  echo "firewall: no IPv4 nameserver in /etc/resolv.conf" >&2
  exit 1
fi
gateway_net="$(ip route | awk '/default/ { print $3 }' | sed 's/\.[0-9]*$/.0\/24/')"

ipset create kronaut-allowed hash:net -exist

iptables -N "$chain" 2>/dev/null || iptables -F "$chain"
iptables -A "$chain" -o lo -j RETURN
iptables -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for ns in $nameservers; do
  iptables -A "$chain" -d "$ns" -p udp --dport 53 -j RETURN
  iptables -A "$chain" -d "$ns" -p tcp --dport 53 -j RETURN
done
# Inner Docker networks (testcontainers) and the Docker Desktop host; the rest of the LAN stays closed.
iptables -A "$chain" -d 172.16.0.0/12 -j RETURN
[ -n "$gateway_net" ] && iptables -A "$chain" -d "$gateway_net" -j RETURN
iptables -A "$chain" -m set --match-set kronaut-allowed dst -j RETURN
iptables -A "$chain" -j REJECT --reject-with icmp-admin-prohibited
iptables -C OUTPUT -j "$chain" 2>/dev/null || iptables -I OUTPUT 1 -j "$chain"

ip6tables -C OUTPUT -o lo -j ACCEPT 2>/dev/null || ip6tables -I OUTPUT 1 -o lo -j ACCEPT
ip6tables -P OUTPUT DROP
ip6tables -P FORWARD DROP

resolve() {
  dig +short A "$1" | grep -E '^[0-9]+(\.[0-9]+){3}$' || true
}

# The chain already rejects everything, so the GitHub meta fetch needs its own address first.
for ip in $(resolve api.github.com); do ipset add kronaut-allowed "$ip" -exist; done

ipset destroy kronaut-next 2>/dev/null || true
ipset create kronaut-next hash:net
curl -fsS --max-time 20 https://api.github.com/meta \
  | jq -r '(.web + .api + .git)[]' \
  | grep -v ':' \
  | aggregate -q \
  | while read -r cidr; do ipset add kronaut-next "$cidr" -exist; done
while read -r domain; do
  [ -z "$domain" ] && continue
  ips="$(resolve "$domain")"
  [ -z "$ips" ] && echo "firewall: no address for $domain" >&2
  for ip in $ips; do ipset add kronaut-next "$ip" -exist; done
done < "$dir/allowed-domains.txt"
ipset swap kronaut-next kronaut-allowed
ipset destroy kronaut-next

for _ in $(seq 60); do iptables -L DOCKER-USER -n >/dev/null 2>&1 && break; sleep 1; done
if ! iptables -L DOCKER-USER -n >/dev/null 2>&1; then
  echo "firewall: dockerd did not start, inner containers would be unfiltered" >&2
  exit 1
fi
iptables -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -I DOCKER-USER 1 -j "$chain"

if curl -fsS --max-time 5 https://example.com >/dev/null 2>&1; then
  echo "firewall: example.com is reachable, the firewall is not working" >&2
  exit 1
fi
curl -fsS --max-time 10 https://api.github.com/zen >/dev/null
echo "firewall: on"
