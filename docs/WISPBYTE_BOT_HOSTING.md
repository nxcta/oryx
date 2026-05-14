# Wispbyte — hosting the Oryx / SecuBot Discord bot

Wispbyte is a **Discord bot host** (Pterodactyl-style panel: file manager, start/stop, env vars, console).

## What to select in the panel

- **Server type / language:** **Node.js** (sometimes labeled **NodeJS** or **JavaScript (Node.js)**).
- **Node.js version:** **20 LTS** or **22 LTS** (match `engines` in `package.json`; avoid EOL versions).

The bot codebase is **TypeScript** that compiles to **JavaScript** — you still pick **Node.js** as the runtime, not “TypeScript” as a separate language.

## What Wispbyte runs

Wispbyte should execute the **compiled bot**:

- Entry file: `dist/index.js` (after `npm run build`)
- Or startup: `npm run start` (runs `node dist/index.js` per root `package.json`)

Do **not** rely on `npm run dev` in production (tsx dev server).

## Upload layout (recommended)

Upload the repository (or a release zip) so the server has:

- `package.json`, `package-lock.json`
- `prisma/` (schema)
- `src/` (optional if you build locally and upload only `dist` + `node_modules` — source is fine)
- `dist/` **if you build on your PC** and upload artifacts; otherwise build on the server (below)

## One-time setup on the Wispbyte server (SSH or console)

```bash
cd /home/container   # or the path Wispbyte uses for your bot
npm ci                 # or npm install
npm run db:generate    # generates Prisma client (requires DATABASE_URL in env)
npm run build          # produces dist/
```

## Environment variables (Wispbyte panel)

Set at minimum:

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Bot token (never commit) |
| `DISCORD_CLIENT_ID` | Application id |
| `DATABASE_URL` | Postgres connection string |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` (or `warn`) |
| `NODE_ID` | Unique per process, e.g. `wispbyte-1` |

Optional:

| Variable | Purpose |
| --- | --- |
| `REDIS_URL` | If you enable Redis-backed features |
| `TRUSTED_OPERATOR_IDS` | Comma-separated Discord user ids for `/security simulate` |

## Database

Wispbyte free/low tiers often **do not include PostgreSQL**. You still need a **managed Postgres** (Neon, Supabase, RDS, etc.) and put its URL in `DATABASE_URL`, then run migrations:

```bash
npm run db:push
# or: npm run db:migrate
```

## Startup command examples

Use whichever your panel expects:

```bash
node dist/index.js
```

or

```bash
npm run start
```

## RAM / scaling guidance

- Small guilds: **512MB–1GB** may work.
- Large guilds / audit-heavy workloads: plan **1GB+** and consider **sharding** later (not included in the default single-process template).

## What **not** to host on Wispbyte (recommended split)

- **Control API** (`web/api-server`) and **dashboards** (`web/owner-dashboard`, `web/admin-dashboard`) are normal **web services** (HTTP + Next.js). They are best deployed on a **VPS with a reverse proxy**, **Railway/Fly/Render**, or a **Node-capable PaaS**, with TLS and separate secrets.
- Keeping the **bot** on Wispbyte while hosting **API + sites** elsewhere is a common, clean split.

## Health check

Watch the process console for `client.ready` logs from the bot. Use a staging guild to validate `/security` commands before production traffic.
