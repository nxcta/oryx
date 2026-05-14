import { ControlKeyStatus } from "@prisma/client";
import { randomTokenUrlSafe, sha256Hex } from "../lib/crypto.js";
import type { PrismaClient } from "@prisma/client";

export type RedeemResult =
  | { ok: true; sessionToken: string; expiresAt: Date; guildId: string; keyId: string }
  | { ok: false; reason: "invalid" | "expired" | "guild_mismatch" | "race"; keyId?: string };

export async function redeemAccessKey(
  db: PrismaClient,
  input: {
    rawKey: string;
    guildId: string;
    discordUserId: string;
    sessionTtlDays?: number;
  },
): Promise<RedeemResult> {
  const keyHash = sha256Hex(input.rawKey);
  const sessionTtlDays = input.sessionTtlDays ?? 30;
  const expiresAt = new Date(Date.now() + sessionTtlDays * 86_400_000);

  return await db.$transaction(async (tx) => {
    const key = await tx.controlAccessKey.findFirst({
      where: { keyHash, status: ControlKeyStatus.ACTIVE },
    });
    if (!key) {
      return { ok: false, reason: "invalid" };
    }
    if (key.expiresAt.getTime() < Date.now()) {
      await tx.controlAccessKey.update({
        where: { id: key.id },
        data: { status: ControlKeyStatus.EXPIRED },
      });
      return { ok: false, reason: "expired" };
    }
    if (key.preboundGuildId && key.preboundGuildId !== input.guildId) {
      return { ok: false, reason: "guild_mismatch", keyId: key.id };
    }

    const updated = await tx.controlAccessKey.updateMany({
      where: { id: key.id, status: ControlKeyStatus.ACTIVE },
      data: {
        status: ControlKeyStatus.REDEEMED,
        redeemedAt: new Date(),
        redeemedByUserId: input.discordUserId,
        boundGuildId: input.guildId,
      },
    });
    if (updated.count !== 1) {
      return { ok: false, reason: "race" };
    }

    const sessionToken = randomTokenUrlSafe(32);
    const tokenHash = sha256Hex(sessionToken);
    await tx.controlSession.create({
      data: {
        tokenHash,
        kind: "tenant",
        discordUserId: input.discordUserId,
        guildId: input.guildId,
        expiresAt,
      },
    });

    return {
      ok: true,
      sessionToken,
      expiresAt,
      guildId: input.guildId,
      keyId: key.id,
    };
  });
}
