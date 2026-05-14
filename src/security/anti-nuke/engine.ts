import { randomUUID } from "node:crypto";
import type { Logger } from "../../logging/logger.js";
import { aggregateRisk, severityFromScore } from "../risk-engine.js";
import type { IncidentPayload, SecuritySignal, ThreatSeverity } from "../types.js";
import { VelocityTracker } from "./velocity-tracker.js";
import {
  DEFAULT_THRESHOLDS,
  mergeThresholds,
  type AntiNukeThresholds,
} from "./thresholds.js";

export interface AntiNukeEvaluation {
  correlationId: string;
  shouldLockdown: boolean;
  severity: ThreatSeverity;
  riskScore: number;
  velocity: {
    destructiveBurst: number;
    memberRemovalBurst: number;
    webhookBurst: number;
    destructiveSustained: number;
  };
  thresholds: AntiNukeThresholds;
  payload: IncidentPayload;
}

export class AntiNukeEngine {
  private readonly tracker: VelocityTracker;
  private thresholds: AntiNukeThresholds;

  constructor(
    private readonly log: Logger,
    thresholds?: Partial<AntiNukeThresholds>,
  ) {
    this.thresholds = mergeThresholds(thresholds);
    this.tracker = new VelocityTracker(this.thresholds);
  }

  setThresholds(partial: Partial<AntiNukeThresholds>) {
    this.thresholds = mergeThresholds({ ...this.thresholds, ...partial });
  }

  getThresholds(): AntiNukeThresholds {
    return this.thresholds;
  }

  ingest(signal: SecuritySignal): AntiNukeEvaluation {
    this.tracker.record(signal.guildId, signal.actorId, signal.category, signal.occurredAt);

    const velocity = this.tracker.evaluate(signal.guildId, signal.actorId, signal.occurredAt);

    const burstViolations: string[] = [];
    if (velocity.destructiveBurst >= this.thresholds.destructiveBurstMax) {
      burstViolations.push("destructive_burst");
    }
    if (velocity.memberRemovalBurst >= this.thresholds.memberRemovalBurstMax) {
      burstViolations.push("member_removal_burst");
    }
    if (velocity.webhookBurst >= this.thresholds.webhookBurstMax) {
      burstViolations.push("webhook_burst");
    }
    if (velocity.destructiveSustained >= this.thresholds.destructiveSustainedMax) {
      burstViolations.push("destructive_sustained");
    }

    const base = aggregateRisk([signal]);
    const breachBonus = burstViolations.length * 18 + (burstViolations.length >= 3 ? 25 : 0);
    const riskScore = Math.min(100, base.score + breachBonus);
    const severity = severityFromScore(riskScore);
    const correlationId = randomUUID();

    const recommended: string[] = [];
    const automated: string[] = [];

    if (burstViolations.length > 0) {
      recommended.push("enable_lockdown", "freeze_invites", "isolate_webhooks");
    }
    if (riskScore >= this.thresholds.autoLockdownMinScore) {
      recommended.push("emergency_lockdown");
    }

    const shouldLockdown =
      riskScore >= this.thresholds.autoLockdownMinScore || burstViolations.length >= 2;

    if (shouldLockdown) {
      automated.push("auto_lockdown_armed");
    }

    if (burstViolations.length > 0) {
      this.log.warn(
        {
          guildId: signal.guildId,
          actorId: signal.actorId,
          category: signal.category,
          velocity,
          burstViolations,
          correlationId,
        },
        "anti_nuke.threshold_breach",
      );
    }

    return {
      correlationId,
      shouldLockdown,
      severity,
      riskScore,
      velocity,
      thresholds: this.thresholds,
      payload: {
        signals: [signal],
        recommendedActions: [...new Set([...recommended, ...burstViolations.map((b) => `velocity:${b}`)])],
        automatedActions: automated,
      },
    };
  }
}
