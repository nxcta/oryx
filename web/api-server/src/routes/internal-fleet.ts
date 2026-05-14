import type { FastifyInstance } from "fastify";
import type { ControlApiEnv } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { constantTimeEqualString } from "../lib/crypto.js";

function adminTokenOk(headers: Record<string, string | string[] | undefined>, env: ControlApiEnv): boolean {
  const token = headers["x-admin-token"];
  if (typeof token !== "string") return false;
  return constantTimeEqualString(token, env.ADMIN_API_TOKEN);
}

export async function registerInternalFleetRoutes(app: FastifyInstance, env: ControlApiEnv) {
  app.get("/internal/v1/keys", async (req, reply) => {
    if (!adminTokenOk(req.headers, env)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const db = getPrisma();
    const rows = await db.controlAccessKey.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        lookupPrefix: true,
        status: true,
        preboundGuildId: true,
        boundGuildId: true,
        createdAt: true,
        expiresAt: true,
        redeemedAt: true,
        revokedAt: true,
      },
    });
    return reply.send({ keys: rows });
  });

  app.get("/internal/v1/guilds", async (req, reply) => {
    if (!adminTokenOk(req.headers, env)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const db = getPrisma();
    const rows = await db.guildSecurityConfig.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: {
        guildId: true,
        version: true,
        updatedAt: true,
        _count: { select: { incidents: true } },
      },
    });
    return reply.send({
      guilds: rows.map((r) => ({
        guildId: r.guildId,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
        incidentCount: r._count.incidents,
      })),
    });
  });
}
