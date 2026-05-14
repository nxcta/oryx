import { describe, expect, it } from "vitest";
import { VelocityTracker } from "../src/security/anti-nuke/velocity-tracker.js";
import { DEFAULT_THRESHOLDS } from "../src/security/anti-nuke/thresholds.js";
import { SecurityActionCategory } from "../src/security/types.js";

describe("VelocityTracker", () => {
  it("counts destructive burst within window", () => {
    const t = { ...DEFAULT_THRESHOLDS, destructiveBurstMax: 3, burstWindowMs: 60_000 };
    const v = new VelocityTracker(t);
    const guild = "g1";
    const actor = "u1";
    const t0 = Date.now();
    v.record(guild, actor, SecurityActionCategory.CHANNEL_DELETE, t0);
    v.record(guild, actor, SecurityActionCategory.CHANNEL_DELETE, t0 + 1000);
    v.record(guild, actor, SecurityActionCategory.CHANNEL_DELETE, t0 + 2000);
    const e = v.evaluate(guild, actor, t0 + 3000);
    expect(e.destructiveBurst).toBe(3);
  });
});
