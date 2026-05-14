# SecuBot Control Plane API (`web/api-server`)

Codename: **Oryx** (repository: `nxcta/oryx`).

This service is the **first production coding phase** for the SaaS control plane: it implements **secure access keys**, **one-time redemption**, **tenant sessions** (HttpOnly cookie), and **append-only control audit** events.

## Why this phase was chosen first

Both the **internal admin console** and the **server-owner console** depend on the same primitives:

- issuance/revocation/audit of access keys
- authenticated tenant sessions with **guild binding**
- centralized audit for human and automated actions

Shipping dashboards before this layer guarantees rework and weaker security boundaries.

## Endpoints (v0)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | none | LB health |
| `POST` | `/internal/v1/keys` | `x-admin-token` | Mint a one-time owner key (returns `rawKey` once) |
| `POST` | `/internal/v1/keys/:id/revoke` | `x-admin-token` | Revoke an active key |
| `POST` | `/v1/auth/redeem` | none (rate limited) | Redeem key → binds guild + Discord user → sets `oryx_tenant` cookie |
| `GET` | `/v1/tenant/me` | `oryx_tenant` cookie | Returns session claims |
| `POST` | `/v1/tenant/logout` | cookie | Revokes session server-side + clears cookie |

> Replace `x-admin-token` with SSO-backed service identity when your IdP integration lands; keep the route split (`/internal/*`) so edge ACLs can block it from the public internet.

## Database

Uses the **root** Prisma schema (`../../prisma/schema.prisma`) models:

- `ControlAccessKey`
- `ControlSession`
- `ControlAuditLog`

Run from repo root:

```bash
npm install
npm run db:push
npm run db:generate
```

## Run

```bash
npm run api:dev
```

Configure env vars from `web/api-server/.env.example` (either export them or load via your process manager).

## Security notes

- Raw keys are **never** stored; only **SHA-256** hashes are persisted.
- Session cookies are **opaque**; only **SHA-256** hashes are persisted.
- Redemption uses a **transaction** with `updateMany` to reduce double-spend races under concurrency.
- Next hardening steps: per-route rate limits on `/v1/auth/redeem`, Redis-backed session versioning, Discord OAuth proof before binding `guildId`.
