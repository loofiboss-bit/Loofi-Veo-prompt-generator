# Workspace LAN Hosting on 192.168.1.3

This guide hosts all web-capable projects in this workspace on a Windows 11 machine at `192.168.1.3`.

## Services in this workspace

- `Loofi-Veo-prompt-generator`: web app on `8080`
- `Loofi-Suno-AI-Generator`: FastAPI + frontend on `18000` (LAN profile)
- `loofi-fedora-tweaks`: optional Web API on `18001`
- `plasma-ai-usage-monitor`: desktop widget (no HTTP service)
- `LoofiLearn`: no runtime service yet

## Recommended port map

- `192.168.1.3:8080` → Veo
- `192.168.1.3:18000` → Suno
- `192.168.1.3:18001` → Fedora Tweaks Web API

## Start each project

### 1) Loofi Flow/Veo Studio

Run from `Loofi-Veo-prompt-generator`:

- `npm run dev` for development
- `docker compose up --build` for containerized runtime

Veo is already configured for host binding on `8080`.

### 2) Suno AI Generator

Run from `Loofi-Suno-AI-Generator`:

1. Create env file: `Copy-Item .env.example .env` (PowerShell)
2. Start with LAN compose profile:
   - `docker compose -f docker-compose.yml -f docker-compose.lan.yml up --build`

This publishes Suno on `18000` to avoid collisions with Fedora Tweaks API.

### 3) Fedora Tweaks Web API

Run from `loofi-fedora-tweaks`:

- Set env vars before launch:
  - `LOOFI_API_HOST=0.0.0.0`
  - `LOOFI_API_PORT=18001`
  - `LOOFI_CORS_ORIGINS=http://192.168.1.3:18001`
- Start API: `python -m loofi_fedora_tweaks --web`

## Windows Firewall

Allow inbound only for trusted private network profile:

- TCP `8080`
- TCP `18000`
- TCP `18001`

Avoid opening debug ports (for example `9229`) on public networks.

## Optional reverse proxy

For a single front door, place Nginx/Caddy in front and route to local services:

- Veo → `127.0.0.1:8080`
- Suno → `127.0.0.1:18000`
- Fedora API → `127.0.0.1:18001`

Use the reverse proxy to add TLS, request limits, and centralized access logs.

### Caddy profile included in this workspace

Files:

- `infra/reverse-proxy/caddy/Caddyfile`
- `infra/reverse-proxy/caddy/docker-compose.yml`

Run from `Loofi-Veo-prompt-generator`:

```powershell
docker compose -f infra/reverse-proxy/caddy/docker-compose.yml up -d
```

Add these entries on client machines (`C:\Windows\System32\drivers\etc\hosts`):

```text
192.168.1.3 veo.local
192.168.1.3 suno.local
192.168.1.3 fedora-api.local
```

Then access:

- `http://veo.local`
- `http://suno.local`
- `http://fedora-api.local`
