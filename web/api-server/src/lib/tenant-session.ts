import type { FastifyRequest } from "fastify";
import { sha256Hex } from "../lib/crypto.js";

const TENANT_COOKIE = "oryx_tenant";

export function extractTenantSessionToken(req: FastifyRequest): string | null {
  const c = req.cookies[TENANT_COOKIE];
  if (c) return c;
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export { TENANT_COOKIE };

export function tenantTokenHash(token: string): string {
  return sha256Hex(token);
}
