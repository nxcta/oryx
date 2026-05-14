import type { SecurityActionCategory } from "../types.js";
import {
  isDestructive,
  isMemberRemoval,
  isWebhookMutation,
  type AntiNukeThresholds,
} from "./thresholds.js";

interface TimedHit {
  t: number;
  category: SecurityActionCategory;
  actorId: string | null;
}

/** In-process sliding window; swap for Redis-backed implementation in production cluster. */
export class VelocityTracker {
  private readonly hits = new Map<string, TimedHit[]>();

  constructor(private readonly thresholds: AntiNukeThresholds) {}

  private key(guildId: string, actorId: string | null): string {
    return `${guildId}:${actorId ?? "__unknown__"}`;
  }

  record(
    guildId: string,
    actorId: string | null,
    category: SecurityActionCategory,
    now = Date.now(),
  ): void {
    const k = this.key(guildId, actorId);
    const arr = this.hits.get(k) ?? [];
    arr.push({ t: now, category, actorId });
    this.prune(arr, now);
    this.hits.set(k, arr);
  }

  private prune(arr: TimedHit[], now: number) {
    const horizon = Math.max(this.thresholds.burstWindowMs, this.thresholds.sustainedWindowMs);
    const cutoff = now - horizon - 1_000;
    while (arr.length > 0 && arr[0]!.t < cutoff) {
      arr.shift();
    }
  }

  evaluate(
    guildId: string,
    actorId: string | null,
    now = Date.now(),
  ): {
    destructiveBurst: number;
    memberRemovalBurst: number;
    webhookBurst: number;
    destructiveSustained: number;
  } {
    const k = this.key(guildId, actorId);
    const arr = this.hits.get(k) ?? [];
    this.prune(arr, now);

    const burstCut = now - this.thresholds.burstWindowMs;
    const sustainedCut = now - this.thresholds.sustainedWindowMs;

    let destructiveBurst = 0;
    let memberRemovalBurst = 0;
    let webhookBurst = 0;
    let destructiveSustained = 0;

    for (const h of arr) {
      if (h.t >= burstCut) {
        if (isDestructive(h.category)) destructiveBurst += 1;
        if (isMemberRemoval(h.category)) memberRemovalBurst += 1;
        if (isWebhookMutation(h.category)) webhookBurst += 1;
      }
      if (h.t >= sustainedCut && isDestructive(h.category)) {
        destructiveSustained += 1;
      }
    }

    return { destructiveBurst, memberRemovalBurst, webhookBurst, destructiveSustained };
  }
}
