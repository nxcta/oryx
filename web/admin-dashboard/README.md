# SecuBot Admin / Dev Console (`web/admin-dashboard`)

This is the **internal-only** security operations console. It must not share authentication cookies, deployment pipelines, or build graphs with the tenant console.

## Recommended stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS** + Radix UI primitives
- **TanStack Query**
- **SSO** via your IdP (OIDC). Prefer **private ingress** (IP allowlist, VPN, or Zero Trust access).

## UX goals

- dark-first SOC layout: dense tables, sparklines, incident queues, “blast radius” panels
- every destructive action uses **step-up** (WebAuthn or re-auth) + typed confirmation phrases

## Bootstrap (local)

```bash
cd web/admin-dashboard
npx create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*"
```

Then align routes to the API contract described in `docs/ENTERPRISE_PRODUCTION_AND_OPERATIONS.md`.

## Deployment posture

- deploy to a **different origin** than `owner-dashboard`
- stricter **CSP** than tenant UI
- disable public indexing (`robots.txt`, `X-Robots-Tag`)
