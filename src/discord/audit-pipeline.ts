import { Events, type Client, type GuildAuditLogsEntry } from "discord.js";
import { mapAuditLogAction } from "./audit-mapper.js";
import type { Logger } from "../logging/logger.js";
import type { AntiNukeEngineRegistry } from "../security/engine-registry.js";
import type { SecuritySignal } from "../security/types.js";
import { GuildSecurityConfigService } from "../services/guild-security-config.js";
import { IncidentRecorder } from "../services/incident-recorder.js";
import { EmergencyResponder } from "../incidents/emergency-responder.js";

export interface AuditPipelineDeps {
  log: Logger;
  client: Client;
  configService: GuildSecurityConfigService;
  recorder: IncidentRecorder;
  responder: EmergencyResponder;
  engines: AntiNukeEngineRegistry;
}

export function registerAuditPipeline(deps: AuditPipelineDeps): void {
  const { client, log, configService, recorder, responder, engines } = deps;

  client.on(Events.GuildAuditLogEntryCreate, async (entry: GuildAuditLogsEntry, guild) => {
    if (!guild) return;
    const g = guild;
    try {
      const policy = await configService.ensureGuild(g);
      if (!policy.features.antiNuke) return;

      const engine = engines.obtain(g.id, policy.thresholds);

      const category = mapAuditLogAction(entry.action);
      const signal: SecuritySignal = {
        guildId: g.id,
        actorId: entry.executorId,
        category,
        rawAction: String(entry.action),
        targetId: entry.targetId,
        targetType: entry.targetType ?? undefined,
        extra: {
          changes: entry.changes,
          reason: entry.reason,
        },
        occurredAt: entry.createdTimestamp,
      };

      const evaluation = engine.ingest(signal);

      if (policy.features.autoLockdown) {
        await responder.handleEvaluation(g, entry, signal, evaluation, g.shardId);
      } else {
        await recorder.appendSecurityEvent({
          guildId: g.id,
          correlationId: evaluation.correlationId,
          eventType: "anti_nuke.evaluation",
          actorId: signal.actorId,
          targetId: signal.targetId ?? null,
          shardId: g.shardId,
          payload: {
            riskScore: evaluation.riskScore,
            severity: evaluation.severity,
            velocity: evaluation.velocity,
            shouldLockdown: evaluation.shouldLockdown,
            autoLockdownDisabled: true,
          },
        });
      }
    } catch (err) {
      log.error({ err, guildId: g.id }, "audit.pipeline_failed");
    }
  });
}
