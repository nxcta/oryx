import { describe, expect, it } from "vitest";
import { aggregateRisk, assessSignal, severityFromScore } from "../src/security/risk-engine.js";
import { SecurityActionCategory } from "../src/security/types.js";

describe("risk-engine", () => {
  it("scores destructive actions higher", () => {
    const s = assessSignal({
      guildId: "1",
      actorId: "2",
      category: SecurityActionCategory.CHANNEL_DELETE,
      occurredAt: Date.now(),
    });
    expect(s.score).toBeGreaterThan(30);
    expect(s.reasons).toContain("destructive_structure_change");
  });

  it("aggregates multiple signals", () => {
    const now = Date.now();
    const agg = aggregateRisk([
      {
        guildId: "1",
        actorId: "2",
        category: SecurityActionCategory.ROLE_DELETE,
        occurredAt: now,
      },
      {
        guildId: "1",
        actorId: "2",
        category: SecurityActionCategory.WEBHOOK_CREATE,
        occurredAt: now,
      },
    ]);
    expect(agg.score).toBeGreaterThan(40);
    expect(severityFromScore(agg.score)).toMatch(/medium|high|critical/);
  });
});
