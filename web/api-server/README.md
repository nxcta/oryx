# SecuBot Control Plane API (`web/api-server`)

This deployable is the **authoritative backend** for:

- internal **admin/SOC** operations,
- **tenant (server owner)** operations,
- **license key** lifecycle (mint, redeem, revoke),
- **session** issuance and verification,
- **realtime ticket** minting for websocket connections,
- **audit append** endpoints and export orchestration.

## Recommended stack

- **NestJS** + TypeScript
- **PostgreSQL** + Prisma (consider a dedicated schema `controlplane` or a separate database from the bot runtime DB)
- **Redis** for sessions, rate limits, WS adapter, locks
- **OpenTelemetry** + Prometheus metrics
- **Zod** (or `class-validator`) for strict request validation at the edge of each controller

## Bootstrap (local)

```bash
cd web/api-server
npm install
npm run start:dev
```

> The repository ships **policy and scaffolding metadata** here; generate the NestJS project in this folder using your org’s standard template, then align modules to `docs/ENTERPRISE_PRODUCTION_AND_OPERATIONS.md`.

## Security invariants

- **No Discord bot token** on this service.
- **RLS** on all tenant tables; admin queries use a distinct DB role with explicit bypass procedures (preferably still logged).
- **Separate JWT signing keys** for admin vs tenant if you use JWT at all; prefer **opaque server sessions** stored in Redis keyed by random session IDs.

## Suggested module boundaries

- `AuthAdminModule` (SSO/OIDC)
- `AuthTenantModule` (redeem + Discord OAuth binding)
- `KeysModule` (HMAC/hashed key storage, issuance workflows)
- `GuildsModule` (admin list + tenant single-guild views)
- `RealtimeModule` (short-lived WS tickets)
- `AuditModule` (append-only ingestion from bot workers + human actions)
