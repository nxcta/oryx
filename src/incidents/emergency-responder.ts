import { AuditLogEvent } from "discord-api-types/v10";
import {
  ChannelType,
  GuildVerificationLevel,
  PermissionFlagsBits,
  type Guild,
  type GuildAuditLogsEntry,
  type Webhook,
} from "discord.js";
import type { Logger } from "../logging/logger.js";
import type { AntiNukeEvaluation } from "../security/anti-nuke/engine.js";
import type { SecuritySignal } from "../security/types.js";
import type { IncidentRecorder } from "../services/incident-recorder.js";

/**
 * Executes defensive guild mutations. All branches are permission-aware and
 * degrade gracefully — protection prefers partial success over hard failure.
 */
export class EmergencyResponder {
  constructor(
    private readonly log: Logger,
    private readonly recorder: IncidentRecorder,
  ) {}

  async handleEvaluation(
    guild: Guild,
    entry: GuildAuditLogsEntry | null,
    signal: SecuritySignal,
    evaluation: AntiNukeEvaluation,
    shardId: number,
  ): Promise<void> {
    const me = guild.members.me;
    if (!me) return;

    await this.recorder.appendSecurityEvent({
      guildId: guild.id,
      correlationId: evaluation.correlationId,
      eventType: "anti_nuke.evaluation",
      actorId: signal.actorId,
      targetId: signal.targetId ?? null,
      shardId,
      payload: {
        riskScore: evaluation.riskScore,
        severity: evaluation.severity,
        velocity: evaluation.velocity,
        shouldLockdown: evaluation.shouldLockdown,
        auditEntryId: entry?.id,
      },
    });

    if (!evaluation.shouldLockdown) return;

    try {
      if (me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, "SecuBot emergency lockdown");
        await this.recorder.appendSecurityEvent({
          guildId: guild.id,
          correlationId: evaluation.correlationId,
          eventType: "lockdown.verification_level",
          payload: { level: GuildVerificationLevel.VeryHigh },
          shardId,
        });
      }
    } catch (err) {
      this.log.error({ err, guildId: guild.id }, "lockdown.verification_failed");
    }

    try {
      if (me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const invites = await guild.invites.fetch();
        let deleted = 0;
        for (const inv of invites.values()) {
          if (deleted >= 50) break;
          try {
            await inv.delete("SecuBot emergency invite freeze");
            deleted += 1;
          } catch {
            /* rate limits / missing perms */
          }
        }
        if (deleted > 0) {
          await this.recorder.appendSecurityEvent({
            guildId: guild.id,
            correlationId: evaluation.correlationId,
            eventType: "lockdown.invites_deleted",
            payload: { count: deleted },
            shardId,
          });
        }
      }
    } catch (err) {
      this.log.error({ err, guildId: guild.id }, "lockdown.invite_sweep_failed");
    }

    if (entry?.target && entry.action === AuditLogEvent.WebhookCreate) {
      const webhook = entry.target as Webhook;
      try {
        if (me.permissions.has(PermissionFlagsBits.ManageWebhooks) && webhook.channelId) {
          const ch = guild.channels.cache.get(webhook.channelId);
          if (ch && (ch.isTextBased() || ch.type === ChannelType.GuildForum)) {
            const hooks = await ch.fetchWebhooks();
            const created = hooks.get(webhook.id);
            if (created) {
              await created.delete("SecuBot suspicious webhook quarantine");
              await this.recorder.appendSecurityEvent({
                guildId: guild.id,
                correlationId: evaluation.correlationId,
                eventType: "lockdown.webhook_deleted",
                targetId: webhook.id,
                payload: { channelId: webhook.channelId },
                shardId,
              });
            }
          }
        }
      } catch (err) {
        this.log.warn({ err, guildId: guild.id }, "lockdown.webhook_delete_skipped");
      }
    }

    if (evaluation.shouldLockdown || evaluation.riskScore >= 60) {
      await this.recorder.recordIncident(signal, evaluation);
    }
  }
}
