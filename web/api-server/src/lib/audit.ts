import type { PrismaClient } from "@prisma/client";
import { sha256Hex } from "./crypto.js";

export async function writeControlAudit(
  db: PrismaClient,
  input: {
    actorKind: "admin" | "tenant" | "system";
    actorId?: string | null;
    action: string;
    ip?: string | null;
    metadata?: Record<string, unknown>;
    pepper: string;
  },
): Promise<void> {
  const ipHash =
    input.ip && input.ip.length > 0
      ? sha256Hex(`${input.pepper}|${input.ip}`)
      : null;
  await db.controlAuditLog.create({
    data: {
      actorKind: input.actorKind,
      actorId: input.actorId ?? undefined,
      action: input.action,
      ipHash: ipHash ?? undefined,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}
