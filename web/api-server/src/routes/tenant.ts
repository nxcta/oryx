import type { FastifyInstance } from "fastify";
import type { ControlApiEnv } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { extractTenantSessionToken, TENANT_COOKIE, tenantTokenHash } from "../lib/tenant-session.js";

export async function registerTenantRoutes(app: FastifyInstance, env: ControlApiEnv) {
  app.get("/v1/tenant/me", async (req, reply) => {
    const token = extractTenantSessionToken(req);
    if (!token) {
      return reply.code(401).send({ error: "no_session" });
    }
    const db = getPrisma();
    const tokenHash = tenantTokenHash(token);
    const session = await db.controlSession.findUnique({ where: { tokenHash } });
    if (!session || session.revoked || session.kind !== "tenant") {
      return reply.code(401).send({ error: "invalid_session" });
    }
    if (session.expiresAt.getTime() < Date.now()) {
      return reply.code(401).send({ error: "session_expired" });
    }

    await db.controlSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    if (!session.guildId) {
      return reply.code(401).send({ error: "invalid_session" });
    }

    const policy = await db.guildSecurityConfig.findUnique({
      where: { guildId: session.guildId },
    });

    return reply.send({
      kind: session.kind,
      guildId: session.guildId,
      discordUserId: session.discordUserId,
      expiresAt: session.expiresAt.toISOString(),
      policy: policy
        ? {
            version: policy.version,
            updatedAt: policy.updatedAt.toISOString(),
          }
        : null,
    });
  });

  app.post("/v1/tenant/logout", async (req, reply) => {
    const token = extractTenantSessionToken(req);
    if (token) {
      const db = getPrisma();
      const tokenHash = tenantTokenHash(token);
      await db.controlSession.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }
    const secure = env.NODE_ENV === "production";
    reply.clearCookie(TENANT_COOKIE, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure,
      domain: env.COOKIE_DOMAIN || undefined,
    });
    return reply.send({ ok: true });
  });
}
