import type { SecurityActionCategory } from "../types.js";

/** Tunable per-guild policy; persisted as JSON in `GuildSecurityConfig.policyJson`. */
export interface AntiNukeThresholds {
  /** Sliding window in ms for burst detection */
  burstWindowMs: number;
  /** Long-horizon window for slow attacks */
  sustainedWindowMs: number;
  /** Max destructive events per burst window before escalation */
  destructiveBurstMax: number;
  /** Max bans/kicks combined per burst window */
  memberRemovalBurstMax: number;
  /** Max webhook mutations per burst window */
  webhookBurstMax: number;
  /** Sustained destructive events across sustained window */
  destructiveSustainedMax: number;
  /** Minimum score to auto-lockdown */
  autoLockdownMinScore: number;
}

export const DEFAULT_THRESHOLDS: AntiNukeThresholds = {
  burstWindowMs: 30_000,
  sustainedWindowMs: 900_000,
  destructiveBurstMax: 4,
  memberRemovalBurstMax: 12,
  webhookBurstMax: 6,
  destructiveSustainedMax: 15,
  autoLockdownMinScore: 78,
};

export function mergeThresholds(
  partial: Partial<AntiNukeThresholds> | undefined,
): AntiNukeThresholds {
  return { ...DEFAULT_THRESHOLDS, ...partial };
}

const DESTRUCTIVE: ReadonlySet<SecurityActionCategory> = new Set([
  "channel_delete",
  "role_delete",
  "emoji_delete",
  "sticker_delete",
  "thread_delete",
]);

const MEMBER_REMOVAL: ReadonlySet<SecurityActionCategory> = new Set([
  "member_ban",
  "member_kick",
]);

const WEBHOOK: ReadonlySet<SecurityActionCategory> = new Set([
  "webhook_create",
  "webhook_update",
  "webhook_delete",
]);

export function isDestructive(category: SecurityActionCategory): boolean {
  return DESTRUCTIVE.has(category);
}

export function isMemberRemoval(category: SecurityActionCategory): boolean {
  return MEMBER_REMOVAL.has(category);
}

export function isWebhookMutation(category: SecurityActionCategory): boolean {
  return WEBHOOK.has(category);
}
