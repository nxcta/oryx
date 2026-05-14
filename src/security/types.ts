/**
 * Normalized high-risk audit actions for velocity correlation.
 * Maps Discord audit log `action` strings / enums into internal categories.
 */
export const SecurityActionCategory = {
  CHANNEL_DELETE: "channel_delete",
  CHANNEL_CREATE: "channel_create",
  CHANNEL_UPDATE: "channel_update",
  ROLE_DELETE: "role_delete",
  ROLE_CREATE: "role_create",
  ROLE_UPDATE: "role_update",
  MEMBER_BAN: "member_ban",
  MEMBER_KICK: "member_kick",
  MEMBER_UPDATE: "member_update",
  WEBHOOK_CREATE: "webhook_create",
  WEBHOOK_DELETE: "webhook_delete",
  WEBHOOK_UPDATE: "webhook_update",
  INTEGRATION_UPDATE: "integration_update",
  BOT_ADD: "bot_add",
  GUILD_UPDATE: "guild_update",
  EMOJI_DELETE: "emoji_delete",
  STICKER_DELETE: "sticker_delete",
  THREAD_CREATE: "thread_create",
  THREAD_DELETE: "thread_delete",
  OVERWRITE_UPDATE: "overwrite_update",
  INVITE_DELETE: "invite_delete",
  INVITE_CREATE: "invite_create",
  UNKNOWN: "unknown",
} as const;

export type SecurityActionCategory =
  (typeof SecurityActionCategory)[keyof typeof SecurityActionCategory];

export type ThreatSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface SecuritySignal {
  guildId: string;
  actorId: string | null;
  category: SecurityActionCategory;
  /** Raw Discord audit action key when available */
  rawAction?: string;
  targetId?: string | null;
  targetType?: string | null;
  extra?: Record<string, unknown>;
  occurredAt: number;
}

export interface RiskAssessment {
  score: number;
  severity: ThreatSeverity;
  reasons: string[];
  confidence: number;
}

export interface IncidentPayload {
  signals: SecuritySignal[];
  recommendedActions: string[];
  automatedActions: string[];
}
