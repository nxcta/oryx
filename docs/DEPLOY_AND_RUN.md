# Oryx — deploy & run (single reference)

This repo contains **four runnable pieces**:

| Piece | Folder | Purpose |
| --- | --- | --- |
| Discord bot | repo root `src/` | Data plane: gateway + anti-nuke |
| Control API | `web/api-server/` | Keys, sessions, internal fleet APIs |
| Owner console | `web/owner-dashboard/` | Server-owner UI (redeem + console) |
| Admin console | `web/admin-dashboard/` | Internal keys + fleet directory |

## 1) Install once

```bash
git clone https://github.com/nxcta/oryx.git
cd oryx
npm install
```

## 2) Database

Use managed Postgres (Neon, Supabase, RDS, …). Set `DATABASE_URL` in `.env` at repo root **and** use the same URL for the control API / Next server envs where required.

```bash
npm run db:push
```

## 3) Environment files (minimum)

### Repo root `.env` (bot)

See `.env.example` — needs `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`.

### `web/api-server/.env` (or export vars)

Copy from `web/api-server/.env.example`:

- `DATABASE_URL` (same DB)
- `AUDIT_PEPPER`, `ADMIN_API_TOKEN`, `COOKIE_SECRET`, `BFF_SERVER_SECRET`
- optional `CORS_ORIGINS` for direct browser → API (BFF normally avoids this)

### `web/owner-dashboard/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
CONTROL_API_URL=http://127.0.0.1:4000
BFF_SERVER_SECRET=same-as-api-BFF_SERVER_SECRET
```

### `web/admin-dashboard/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
CONTROL_API_URL=http://127.0.0.1:4000
ADMIN_API_TOKEN=same-as-api-ADMIN_API_TOKEN
```

## 4) Run locally (four terminals)

```bash
# Terminal A — API
npm run api:dev

# Terminal B — bot
npm run dev

# Terminal C — owner UI (http://localhost:3101)
npm run owner:dev

# Terminal D — admin UI (http://localhost:3102)
npm run admin:dev
```

### Smoke test

1. Open `http://localhost:3102/keys` → mint a key (copy `rawKey`).
2. Open `http://localhost:3101/login` → redeem with guild id + your Discord user id.
3. Open `http://localhost:3101/console` → session should load.

## 5) Wispbyte (bot only)

See `docs/WISPBYTE_BOT_HOSTING.md`.

**Panel language:** **Node.js** (the bot is TypeScript compiled to JavaScript).

## 6) Production hosting (recommended split)

- **Bot:** Wispbyte (or any Node host) — `npm run build` then `npm run start` / `node dist/index.js`.
- **API + dashboards:** a small VPS (Caddy/Traefik + TLS) or a Node PaaS (Fly.io, Railway, Render). Run `npm run api:build` + `node web/api-server/dist/server.js`, and `next start` for each dashboard (or Docker).

Deeper architecture: `docs/ENTERPRISE_PRODUCTION_AND_OPERATIONS.md`.
