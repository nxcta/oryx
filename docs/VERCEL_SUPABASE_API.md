# Vercel (dashboards) + separate API

## Roles

| Surface | Host | Env highlights |
| --- | --- | --- |
| **Owner + Admin Next apps** | **Vercel** | `NEXT_PUBLIC_*` Supabase, `CONTROL_API_URL`, server secrets for BFF/admin proxy |
| **Control API** | **Not Vercel** (Fly, Railway, Render, VPS) | `DATABASE_URL`, `ADMIN_API_TOKEN`, `BFF_SERVER_SECRET`, `COOKIE_SECRET`, … |
| **Discord bot** | Wispbyte / VPS | `DISCORD_*`, `DATABASE_URL` (same Supabase Postgres URI as API) |

## Vercel project setup

1. Create **one Vercel project per app** (recommended): `owner-dashboard` and `admin-dashboard` as separate Git-connected projects, **Root Directory** = `web/owner-dashboard` or `web/admin-dashboard`.
2. **Environment variables** (Production + Preview):

**Both apps**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key — both work with `createServerClient` / `createBrowserClient` when configured in Supabase)

**Owner app only**

- `CONTROL_API_URL` → `https://api.yourdomain.com` (your separate API)
- `BFF_SERVER_SECRET` → **same** secret as on the API (`BFF_SERVER_SECRET`)

**Admin app only**

- `CONTROL_API_URL`
- `ADMIN_API_TOKEN` → **same** as API `ADMIN_API_TOKEN`

3. **Build / install**

- **Install Command:** `npm install` (from app root on Vercel = that `web/...` folder)
- **Build:** `npm run build`
- **Output:** default Next.js

## API host (separate from Vercel)

1. Expose `https://api...` with TLS (Caddy / Traefik / cloud LB).
2. Set `CORS_ORIGINS` on the API to your Vercel origins, e.g.  
   `https://owner-xxxxx.vercel.app,https://admin-xxxxx.vercel.app`  
   (only needed if the browser calls the API **directly** with credentials; the BFF routes under `/api/*` mostly avoid cross-site cookies.)
3. Keep **`/internal/*`** off the public internet (IP allowlist, separate internal hostname, or mTLS).

## Database

Use Supabase **Postgres** connection string as `DATABASE_URL` for:

- Bot (Wispbyte)
- Control API

Use **Transaction** pooler URL for many serverless workers; use **Session/direct** URI for long-lived Node (bot + API) if you see pooler errors with Prisma.

## shadcn Supabase block (optional)

This repo does **not** run `npx shadcn@latest add @supabase/supabase-client-nextjs` automatically — it expects a standard `components.json` shadcn setup. If you want those UI primitives:

```bash
cd web/owner-dashboard
npx shadcn@latest init
npx shadcn@latest add @supabase/supabase-client-nextjs
```

Repeat for `web/admin-dashboard` if desired.

## Security note

Never commit `.env` / `.env.local`. If a **publishable** or **anon** key was pasted in a chat, rotate it in Supabase if you treat that channel as untrusted.
