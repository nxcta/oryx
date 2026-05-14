# SecuBot Server Owner Console (`web/owner-dashboard`)

This is the **tenant-facing** product UI: a single guild owner/admin can operate **only** their server’s configuration and telemetry.

## Recommended stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS** + Radix UI primitives
- **TanStack Query**
- **Discord OAuth** (recommended) to bind dashboard identity to a Discord user with verified permissions in the guild

## Bootstrap (local)

```bash
cd web/owner-dashboard
npx create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*"
```

## Isolation requirements

- separate **cookie namespace** and **CSP connect-src** allowlist from admin console
- UI must never call admin-only API routes; enforce at API + edge routes + CSP

## Premium UX direction

- “mission control” home: live threat dial, incident ribbon, join velocity, automod heatmap
- forensics timeline with faceted search (actor, module, severity, correlation id)
