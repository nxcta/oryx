import type { Guild } from "discord.js";
import { DEFAULT_THRESHOLDS, type AntiNukeThresholds } from "../security/anti-nuke/thresholds.js";
import type { DbClient } from "../persistence/prisma.js";

export interface GuildPolicyDocument {
  thresholds: AntiNukeThresholds;
  features: {
    antiNuke: boolean;
    auditStreaming: boolean;
    autoLockdown: boolean;
  };
  lockdown: {
    /** Channel ID for security alerts */
    alertChannelId?: string;
  };
}

export const DEFAULT_POLICY: GuildPolicyDocument = {
  thresholds: DEFAULT_THRESHOLDS,
  features: {
    antiNuke: true,
    auditStreaming: true,
    autoLockdown: true,
  },
  lockdown: {},
};

export class GuildSecurityConfigService {
  constructor(private readonly db: DbClient) {}

  async ensureGuild(guild: Guild): Promise<GuildPolicyDocument> {
    const row = await this.db.guildSecurityConfig.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        policyJson: DEFAULT_POLICY as object,
      },
      update: {},
    });
    return parsePolicy(row.policyJson);
  }

  async getPolicy(guildId: string): Promise<GuildPolicyDocument | null> {
    const row = await this.db.guildSecurityConfig.findUnique({ where: { guildId } });
    if (!row) return null;
    return parsePolicy(row.policyJson);
  }
}

function parsePolicy(json: unknown): GuildPolicyDocument {
  if (!json || typeof json !== "object") return DEFAULT_POLICY;
  const o = json as Partial<GuildPolicyDocument>;
  return {
    ...DEFAULT_POLICY,
    ...o,
    thresholds: { ...DEFAULT_THRESHOLDS, ...o.thresholds },
    features: { ...DEFAULT_POLICY.features, ...o.features },
    lockdown: { ...DEFAULT_POLICY.lockdown, ...o.lockdown },
  };
}
