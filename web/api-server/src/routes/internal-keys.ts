import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { ControlKeyStatus } from "@prisma/client";
import type { ControlApiEnv } from "../config/env.js";
import { constantTimeEqualString, randomTokenUrlSafe, sha256Hex } from "../lib/crypto.js";
import { writeControlAudit } from "../lib/audit.js";
import { getPrisma } from "../lib/prisma.js";

const mintBody = z.object({
  scopes: z.array(z.string()).default(["tenant.console.read", "tenant.console.write"]),
  expiresInDays: z.number().int().min(1).max(365).default(30),
  preboundGuildId: z.string().min(1).optional(),
  createdBySubject: z.string().min(1).optional(),
});

const revokeParams = z.object({
  id: z.string().min(1),
});

function adminTokenOk(headers: Record<string, string | string[] | undefined>, env: ControlApiEnv): boolean {
  const token = headers["x-admin-token"];
  if (typeof token !== "string") return false;
  return constantTimeEqualString(token, env.ADMIN_API_TOKEN);
}

export async function registerInternalKeyRoutes(app: FastifyInstance, env: ControlApiEnv) {
  app.post("/internal/v1/keys", async (req, reply) => {
    if (!adminTokenOk(req.headers, env)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const body = mintBody.parse(req.body);
    const db = getPrisma();

    const rawKey = randomTokenUrlSafe(28);
    const keyHash = sha256Hex(rawKey);
    const expiresAt = new Date(Date.now() + body.expiresInDays * 86_400_000);

    const row = await db.controlAccessKey.create({
      data: {
        keyHash,
        lookupPrefix: keyHash.slice(0, 10),
        status: ControlKeyStatus.ACTIVE,
        scopesJson: body.scopes,
        preboundGuildId: body.preboundGuildId,
        expiresAt,
        createdBySubject: body.createdBySubject,
      },
    });

    await writeControlAudit(db, {
      actorKind: "admin",
      actorId: body.createdBySubject ?? "unknown",
      action: "control.key.mint",
      ip: req.ip,
      metadata: { keyId: row.id, expiresAt: row.expiresAt.toISOString() },
      pepper: env.AUDIT_PEPPER,
    });

    return reply.send({
      id: row.id,
      rawKey,
      expiresAt: row.expiresAt.toISOString(),
      preboundGuildId: row.preboundGuildId,
      scopes: body.scopes,
    });
  });

  app.post("/internal/v1/keys/:id/revoke", async (req, reply) => {
    if (!adminTokenOk(req.headers, env)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const { id } = revokeParams.parse(req.params);
    const db = getPrisma();

    const updated = await db.controlAccessKey.updateMany({
      where: { id, status: ControlKeyStatus.ACTIVE },
      data: {
        status: ControlKeyStatus.REVOKED,
        revokedAt: new Date(),
        revokeReason: "admin_revoke",
      },
    });

    await writeControlAudit(db, {
      actorKind: "admin",
      actorId: "unknown",
      action: "control.key.revoke",
      ip: req.ip,
      metadata: { keyId: id, matched: updated.count },
      pepper: env.AUDIT_PEPPER,
    });

    return reply.send({ ok: true, revoked: updated.count > 0 });
  });
}
