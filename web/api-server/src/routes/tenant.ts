import type { FastifyInstance } from "fastify";
import type { ControlApiEnv } from "../config/env.js";
import { sha256Hex } from "../lib/crypto.js";
import { getPrisma } from "../lib/prisma.js";
import { TENANT_COOKIE } from "./auth.js";

export async function registerTenantRoutes(app: FastifyInstance, env: ControlApiEnv) {
  app.get("/v1/tenant/me", async (req, reply) => {
    const token = req.cookies[TENANT_COOKIE];
    if (!token) {
      return reply.code(401).send({ error: "no_session" });
    }
    const db = getPrisma();
    const tokenHash = sha256Hex(token);
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

    return reply.send({
      kind: session.kind,
      guildId: session.guildId,
      discordUserId: session.discordUserId,
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  app.post("/v1/tenant/logout", async (req, reply) => {
    const token = req.cookies[TENANT_COOKIE];
    if (token) {
      const db = getPrisma();
      const tokenHash = sha256Hex(token);
      await db.controlSession.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }
    const secure = env.NODE_ENV === "production";
    reply.clearCookie(TENANT_COOKIE, { path: "/", httpOnly: true, sameSite: "strict", secure });
    return reply.send({ ok: true });
  });
}
