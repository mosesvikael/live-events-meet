# LIVE EVENTS TZ (Jitsi Meet fork)

LIVE EVENTS TZ is a fork of [Jitsi Meet](https://github.com/jitsi/jitsi-meet) (Apache 2.0) with:

- **The LIVE EVENTS TZ brand:** name, green and gold colors, logo, favicon and welcome page.
- **A Kiswahili interface** (`lang/main-sw.json`) next to English and French. Pick it in Settings > Language.
- **Live captions** (toolbar button with the captions icon). Each person captions their own voice in their browser,
  in the language set in Settings (English, Kiswahili or French), and every line is shared with the meeting under
  their name. No transcription server is needed. Captioning your voice needs Chrome or Edge, and anyone can read captions.
- **Meeting notes** (in the toolbar's More menu). It builds a summary, action items (with English, Kiswahili and French cues),
  key points and who spoke from the captions and public chat. You can copy the notes or download them with the full transcript.

The code for captions and notes is in `react/features/live-captions/`.

## How it runs

Jitsi needs its own server. It can't run on Render, because video goes over UDP port 10000.
The stack is the official [docker-jitsi-meet](https://github.com/jitsi/docker-jitsi-meet) (prosody, jicofo, jvb)
with this fork's web app in place of the stock one:

1. Each push to `master` runs `.github/workflows/live-events-tz-web.yml`. It builds
   `live-events-tz/Dockerfile.web` and publishes `ghcr.io/<owner>/live-events-tz-web:latest`.
2. On the server, `docker-compose.override.yml` points the `web` service at that image.

## Set up a server (about 20 minutes)

You need:
- A Linux VPS running Ubuntu 22.04 or 24.04 with at least 4 GB of RAM, such as Hetzner CX22 or a DigitalOcean 4 GB droplet.
  A server in Europe or Johannesburg gives good latency to Tanzania.
- A domain or subdomain, such as `meet.example.co.tz`, with an **A record** pointing at the server's IP.

Steps:
1. In GitHub, open **Actions** for this repository and enable workflows (forks start with them off).
   Then run **LIVE EVENTS TZ web image** once, or push to `master`. Wait for it to finish (about 15 minutes).
2. Open **Packages** on your GitHub profile, open `live-events-tz-web`, and under **Package settings** set visibility
   to **Public**, so the server can download it without a login.
3. SSH into the server and run:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/mosesvikael/live-events-tz-meet/master/live-events-tz/setup-vps.sh -o setup.sh
   sudo DOMAIN=meet.example.co.tz EMAIL=you@example.com bash setup.sh
   ```
4. Open `https://meet.example.co.tz`.

To update after new pushes: `cd /opt/live-events-tz && docker compose pull web && docker compose up -d web`.

Optional: to let only signed-in people start meetings, set `ENABLE_AUTH=1` and `AUTH_TYPE=internal` in
`/opt/live-events-tz/.env`, then follow the docker-jitsi-meet handbook's "Authentication" section.

## Develop

```bash
npm ci            # Node 24 and npm 11
make dev          # https://localhost:8080, backed by a public Jitsi deployment
npm run tsc:web && npx eslint react/features/live-captions
```

## Credits

Built on Jitsi Meet by 8x8 and the Jitsi community, under the Apache License 2.0 (see `LICENSE`).
"Jitsi" is a trademark of 8x8, Inc.; LIVE EVENTS TZ is not affiliated with or endorsed by 8x8.
