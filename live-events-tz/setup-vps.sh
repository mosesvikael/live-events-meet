#!/usr/bin/env bash
# LIVE EVENTS TZ: one-shot setup on a fresh Ubuntu 22.04/24.04 VPS (4 GB RAM or more).
#
#   curl -fsSL https://raw.githubusercontent.com/mosesvikael/live-events-meet/master/live-events-tz/setup-vps.sh -o setup.sh
#   sudo DOMAIN=meet.example.co.tz EMAIL=you@example.com bash setup.sh
#
# Before running: point the domain's DNS A record at this server's public IP.
set -euo pipefail

: "${DOMAIN:?Set DOMAIN, for example DOMAIN=meet.example.co.tz}"
: "${EMAIL:?Set EMAIL for the HTTPS certificate}"
WEB_IMAGE="${LIVE_EVENTS_WEB_IMAGE:-ghcr.io/mosesvikael/live-events-tz-web:latest}"
DIR="${INSTALL_DIR:-/opt/live-events-tz}"
TZ_NAME="${TZ_NAME:-Africa/Dar_es_Salaam}"

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Opening firewall ports (80, 443 TCP and 10000 UDP for media)"
if command -v ufw >/dev/null; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 10000/udp
  ufw --force enable
fi

echo "==> Downloading the latest docker-jitsi-meet release"
TAG=$(curl -fsSL https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest | grep -m1 '"tag_name"' | cut -d '"' -f4)
mkdir -p "$DIR"
cd "$DIR"
if [ ! -f docker-compose.yml ]; then
  curl -fsSL "https://github.com/jitsi/docker-jitsi-meet/archive/refs/tags/${TAG}.tar.gz" | tar xz --strip-components=1
fi

echo "==> Writing configuration"
if [ ! -f .env ]; then
  cp env.example .env
  ./gen-passwords.sh
fi
PUBLIC_IP=$(curl -fsSL https://api.ipify.org || true)
set_env() { grep -q "^#\?$1=" .env && sed -i "s|^#\?$1=.*|$1=$2|" .env || echo "$1=$2" >> .env; }
set_env CONFIG "$DIR/config"
set_env HTTP_PORT 80
set_env HTTPS_PORT 443
set_env TZ "$TZ_NAME"
set_env PUBLIC_URL "https://${DOMAIN}"
set_env ENABLE_LETSENCRYPT 1
set_env LETSENCRYPT_DOMAIN "$DOMAIN"
set_env LETSENCRYPT_EMAIL "$EMAIL"
set_env ENABLE_HTTP_REDIRECT 1
set_env JITSI_IMAGE_VERSION "$TAG"
set_env LIVE_EVENTS_WEB_IMAGE "$WEB_IMAGE"
[ -n "$PUBLIC_IP" ] && set_env JVB_ADVERTISE_IPS "$PUBLIC_IP"

cat > docker-compose.override.yml <<YAML
services:
    web:
        image: \${LIVE_EVENTS_WEB_IMAGE}
YAML

mkdir -p config/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}

echo "==> Starting LIVE EVENTS TZ"
docker compose pull
docker compose up -d

echo
echo "Done. Open https://${DOMAIN} in a minute, once the certificate is issued."
echo "Logs: cd $DIR && docker compose logs -f web"
