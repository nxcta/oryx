import { describe, expect, it } from "vitest";
import pino from "pino";
import { AntiNukeEngine } from "../src/security/anti-nuke/engine.js";
import { SecurityActionCategory } from "../src/security/types.js";

describe("AntiNukeEngine", () => {
  it("escalates on repeated destructive actions", () => {
    const log = pino({ level: "silent" });
    const engine = new AntiNukeEngine(log, {
      destructiveBurstMax: 2,
      burstWindowMs: 120_000,
      autoLockdownMinScore: 50,
    });
    const guild = "g";
    const actor = "a";
    const t0 = Date.now();
    engine.ingest({
      guildId: guild,
      actorId: actor,
      category: SecurityActionCategory.CHANNEL_DELETE,
      occurredAt: t0,
    });
    const second = engine.ingest({
      guildId: guild,
      actorId: actor,
      category: SecurityActionCategory.CHANNEL_DELETE,
      occurredAt: t0 + 500,
    });
    expect(second.velocity.destructiveBurst).toBeGreaterThanOrEqual(2);
    expect(second.shouldLockdown).toBe(true);
  });
});
