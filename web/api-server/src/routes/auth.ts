import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ControlApiEnv } from "../config/env.js";
import { writeControlAudit } from "../lib/audit.js";
import { getPrisma } from "../lib/prisma.js";
import { redeemAccessKey } from "../services/redeem.js";
import { TENANT_COOKIE } from "../lib/tenant-session.js";

const redeemBody = z.object({
  rawKey: z.string().min(10),
  guildId: z.string().min(1),
  discordUserId: z.string().min(1),
});

function bffSecretOk(headers: Record<string, string | string[] | undefined>, env: ControlApiEnv): boolean {
  if (!env.BFF_SERVER_SECRET) return false;
  const h = headers["x-oryx-bff-secret"];
  if (typeof h !== "string") return false;
  return h === env.BFF_SERVER_SECRET;
}

export async function registerAuthRoutes(app: FastifyInstance, env: ControlApiEnv) {
  const sessionTtlDays = 30;

  app.post("/v1/auth/redeem", async (req, reply) => {
    const body = redeemBody.parse(req.body);
    const db = getPrisma();

    try {
      const result = await redeemAccessKey(db, {
        rawKey: body.rawKey,
        guildId: body.guildId,
        discordUserId: body.discordUserId,
        sessionTtlDays,
      });

      if (!result.ok) {
        if (result.reason === "guild_mismatch") {
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
        if (result.reason === "expired") {
          return reply.code(400).send({ error: "expired_key" });
        }
        await writeControlAudit(db, {
          actorKind: "tenant",
          actorId: body.discordUserId,
          action: "control.key.redeem_failed",
          ip: req.ip,
          metadata: { reason: result.reason },
          pepper: env.AUDIT_PEPPER,
        });
        return reply.code(400).send({ error: "invalid_key" });
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
        domain: env.COOKIE_DOMAIN || undefined,
      });

      return reply.send({
        ok: true,
        guildId: body.guildId,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (e) {
      req.log.error({ e }, "redeem.transaction_failed");
      return reply.code(500).send({ error: "redeem_failed" });
    }
  });

  /** Server-to-server: returns session token JSON for BFF (Next.js) to set first-party cookie. */
  app.post("/v1/bff/redeem", async (req, reply) => {
    if (!bffSecretOk(req.headers, env)) {
      return reply.code(401).send({ error: "bff_unauthorized" });
    }
    const body = redeemBody.parse(req.body);
    const db = getPrisma();

    try {
      const result = await redeemAccessKey(db, {
        rawKey: body.rawKey,
        guildId: body.guildId,
        discordUserId: body.discordUserId,
        sessionTtlDays,
      });

      if (!result.ok) {
        if (result.reason === "guild_mismatch") {
          await writeControlAudit(db, {
            actorKind: "tenant",
            actorId: body.discordUserId,
            action: "control.key.redeem_failed",
            ip: req.ip,
            metadata: { reason: "guild_mismatch", keyId: result.keyId, via: "bff" },
            pepper: env.AUDIT_PEPPER,
          });
          return reply.code(403).send({ error: "guild_mismatch" });
        }
        if (result.reason === "expired") {
          return reply.code(400).send({ error: "expired_key" });
        }
        await writeControlAudit(db, {
          actorKind: "tenant",
          actorId: body.discordUserId,
          action: "control.key.redeem_failed",
          ip: req.ip,
          metadata: { reason: result.reason, via: "bff" },
          pepper: env.AUDIT_PEPPER,
        });
        return reply.code(400).send({ error: "invalid_key" });
      }

      await writeControlAudit(db, {
        actorKind: "tenant",
        actorId: body.discordUserId,
        action: "control.key.redeemed",
        ip: req.ip,
        metadata: { keyId: result.keyId, guildId: body.guildId, via: "bff" },
        pepper: env.AUDIT_PEPPER,
      });

      return reply.send({
        ok: true,
        sessionToken: result.sessionToken,
        guildId: body.guildId,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (e) {
      req.log.error({ e }, "bff.redeem_failed");
      return reply.code(500).send({ error: "redeem_failed" });
    }
  });
}
