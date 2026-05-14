import {
  Colors,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { AntiNukeEngine } from "../security/anti-nuke/engine.js";
import { severityFromScore } from "../security/risk-engine.js";
import type { SecuritySignal } from "../security/types.js";
import { analyzeTextRisk } from "../security/ai/text-risk.js";

function isOperator(userId: string, trusted: readonly string[]): boolean {
  return trusted.length === 0 || trusted.includes(userId);
}

export function buildSecurityCommands() {
  const status = new SlashCommandBuilder()
    .setName("security")
    .setDescription("Enterprise security controls and diagnostics")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s.setName("status").setDescription("Live anti-nuke thresholds and platform posture"),
    )
    .addSubcommand((s) =>
      s
        .setName("analyze")
        .setDescription("Deterministic + heuristic risk scan on provided text")
        .addStringOption((o) =>
          o.setName("content").setDescription("Text to analyze").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("simulate")
        .setDescription("Dry-run risk score for a synthetic destructive signal (operators only)")
        .addStringOption((o) =>
          o
            .setName("category")
            .setDescription("Internal category")
            .setRequired(true)
            .addChoices(
              { name: "channel_delete", value: "channel_delete" },
              { name: "role_delete", value: "role_delete" },
              { name: "webhook_create", value: "webhook_create" },
              { name: "member_ban", value: "member_ban" },
            ),
        ),
    );

  return [status.toJSON()];
}

export async function handleSecurityCommand(
  interaction: ChatInputCommandInteraction,
  opts: {
    trustedOperatorIds: readonly string[];
    resolveEngine: () => AntiNukeEngine;
  },
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand(true);

  if (sub === "status") {
    const engine = opts.resolveEngine();
    const t = engine.getThresholds();
    const embed = new EmbedBuilder()
      .setTitle("SecuBot — security posture")
      .setColor(Colors.Blurple)
      .addFields(
        { name: "Burst window", value: `${t.burstWindowMs} ms`, inline: true },
        { name: "Sustained window", value: `${t.sustainedWindowMs} ms`, inline: true },
        { name: "Auto lockdown ≥ score", value: String(t.autoLockdownMinScore), inline: true },
        {
          name: "Destructive burst max",
          value: String(t.destructiveBurstMax),
          inline: true,
        },
        {
          name: "Member removal burst max",
          value: String(t.memberRemovalBurstMax),
          inline: true,
        },
        { name: "Webhook burst max", value: String(t.webhookBurstMax), inline: true },
      )
      .setTimestamp(new Date());
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "analyze") {
    const content = interaction.options.getString("content", true);
    const r = analyzeTextRisk(content);
    const embed = new EmbedBuilder()
      .setTitle("Heuristic text risk")
      .setColor(r.score >= 70 ? Colors.Red : r.score >= 40 ? Colors.Orange : Colors.Green)
      .addFields(
        { name: "Score", value: r.score.toFixed(1), inline: true },
        { name: "Severity", value: severityFromScore(r.score), inline: true },
        { name: "Signals", value: r.reasons.join(", ") || "none", inline: false },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "simulate") {
    if (!isOperator(interaction.user.id, opts.trustedOperatorIds)) {
      await interaction.reply({ content: "Forbidden.", flags: MessageFlags.Ephemeral });
      return;
    }
    const category = interaction.options.getString("category", true) as SecuritySignal["category"];
    const engine = opts.resolveEngine();
    const evaluation = engine.ingest({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      category,
      occurredAt: Date.now(),
    });
    const embed = new EmbedBuilder()
      .setTitle("Simulation (ingested into live velocity)")
      .setDescription("This nudges the real velocity tracker for your account in this guild.")
      .setColor(Colors.DarkRed)
      .addFields(
        { name: "Risk score", value: evaluation.riskScore.toFixed(1), inline: true },
        { name: "Severity", value: evaluation.severity, inline: true },
        { name: "Lockdown", value: evaluation.shouldLockdown ? "yes" : "no", inline: true },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
