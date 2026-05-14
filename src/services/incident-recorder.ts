import type { Prisma } from "@prisma/client";
import type { DbClient } from "../persistence/prisma.js";
import type { Logger } from "../logging/logger.js";
import type { AntiNukeEvaluation } from "../security/anti-nuke/engine.js";
import type { SecuritySignal } from "../security/types.js";
import { DEFAULT_POLICY } from "./guild-security-config.js";

export class IncidentRecorder {
  constructor(
    private readonly db: DbClient,
    private readonly log: Logger,
    private readonly nodeId: string,
  ) {}

  async appendSecurityEvent(input: {
    guildId: string;
    correlationId: string;
    eventType: string;
    actorId?: string | null;
    targetId?: string | null;
    payload: Record<string, unknown>;
    shardId?: number | null;
  }): Promise<void> {
    try {
      await this.db.securityEventLog.create({
        data: {
          guildId: input.guildId,
          correlationId: input.correlationId,
          eventType: input.eventType,
          actorId: input.actorId ?? null,
          targetId: input.targetId ?? null,
          payload: input.payload as Prisma.InputJsonValue,
          shardId: input.shardId ?? null,
          nodeId: this.nodeId,
        },
      });
    } catch (err) {
      this.log.error({ err, input }, "incident.append_failed");
    }
  }

  async recordIncident(signal: SecuritySignal, evaluation: AntiNukeEvaluation): Promise<void> {
    try {
      await this.db.guildSecurityConfig.upsert({
        where: { guildId: signal.guildId },
        create: {
          guildId: signal.guildId,
          policyJson: DEFAULT_POLICY as object,
        },
        update: {},
      });
      await this.db.securityIncident.create({
        data: {
          guildId: signal.guildId,
          correlationId: evaluation.correlationId,
          severity: evaluation.severity,
          category: "anti_nuke",
          summary: `Risk ${evaluation.riskScore.toFixed(1)} / ${evaluation.severity}`,
          detailJson: {
            signal,
            evaluation,
          } as object,
          riskScore: evaluation.riskScore,
        },
      });
    } catch (err) {
      this.log.error({ err, signal }, "incident.record_failed");
    }
  }
}
