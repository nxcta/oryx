import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { ControlKeyStatus } from "@prisma/client";
import type { ControlApiEnv } from "../config/env.js";
import { randomTokenUrlSafe, sha256Hex } from "../lib/crypto.js";
import { writeControlAudit } from "../lib/audit.js";
import { getPrisma } from "../lib/prisma.js";

const TENANT_COOKIE = "oryx_tenant";

const redeemBody = z.object({
  rawKey: z.string().min(10),
  guildId: z.string().min(1),
  discordUserId: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance, env: ControlApiEnv) {
  app.post("/v1/auth/redeem", async (req, reply) => {
    const body = redeemBody.parse(req.body);
    const db = getPrisma();
    const keyHash = sha256Hex(body.rawKey);

    const sessionTtlDays = 30;
    const expiresAt = new Date(Date.now() + sessionTtlDays * 86_400_000);

    try {
      const result = await db.$transaction(async (tx) => {
        const key = await tx.controlAccessKey.findFirst({
          where: { keyHash, status: ControlKeyStatus.ACTIVE },
        });
        if (!key) {
          return { type: "invalid" as const };
        }
        if (key.expiresAt.getTime() < Date.now()) {
          await tx.controlAccessKey.update({
            where: { id: key.id },
            data: { status: ControlKeyStatus.EXPIRED },
          });
          return { type: "expired" as const };
        }
        if (key.preboundGuildId && key.preboundGuildId !== body.guildId) {
          return { type: "guild_mismatch" as const, keyId: key.id };
        }

        const updated = await tx.controlAccessKey.updateMany({
          where: { id: key.id, status: ControlKeyStatus.ACTIVE },
          data: {
            status: ControlKeyStatus.REDEEMED,
            redeemedAt: new Date(),
            redeemedByUserId: body.discordUserId,
            boundGuildId: body.guildId,
          },
        });
        if (updated.count !== 1) {
          return { type: "race" as const };
        }

        const sessionToken = randomTokenUrlSafe(32);
        const tokenHash = sha256Hex(sessionToken);
        await tx.controlSession.create({
          data: {
            tokenHash,
            kind: "tenant",
            discordUserId: body.discordUserId,
            guildId: body.guildId,
            expiresAt,
          },
        });
        return { type: "ok" as const, sessionToken, keyId: key.id };
      });

      if (result.type === "invalid" || result.type === "race") {
        await writeControlAudit(db, {
          actorKind: "tenant",
          actorId: body.discordUserId,
          action: "control.key.redeem_failed",
          ip: req.ip,
          metadata: { reason: result.type },
          pepper: env.AUDIT_PEPPER,
        });
        return reply.code(400).send({ error: "invalid_key" });
      }
      if (result.type === "expired") {
        return reply.code(400).send({ error: "expired_key" });
      }
      if (result.type === "guild_mismatch") {
        await writeControlAudit(db, {
          actorKind: "tenant",
          actorId: body.discordUserId,
          action: "control.key.redeem_failed",
          ip: req.ip,
          metadata: { reason: "guild_mismatch", keyId: result.keyId },
          pepper: env.AUDIT_PEPPER,
        });
        return reply.code(403).send({ error: "guild_mismatch" });
      }

      await writeControlAudit(db, {
        actorKind: "tenant",
        actorId: body.discordUserId,
        action: "control.key.redeemed",
        ip: req.ip,
        metadata: { keyId: result.keyId, guildId: body.guildId },
        pepper: env.AUDIT_PEPPER,
      });

      const secure = env.NODE_ENV === "production";
      reply.setCookie(TENANT_COOKIE, result.sessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure,
        maxAge: sessionTtlDays * 86_400,
      });

      return reply.send({
        ok: true,
        guildId: body.guildId,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (e) {
      req.log.error({ e }, "redeem.transaction_failed");
      return reply.code(500).send({ error: "redeem_failed" });
    }
  });
}

export { TENANT_COOKIE };
