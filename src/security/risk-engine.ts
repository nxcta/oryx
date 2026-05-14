import type { RiskAssessment, SecuritySignal, ThreatSeverity } from "./types.js";

const severityOrder: ThreatSeverity[] = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic risk scoring with explicit reason codes for forensics. */
export function assessSignal(signal: SecuritySignal): RiskAssessment {
  const reasons: string[] = [];
  let score = 5;

  switch (signal.category) {
    case "channel_delete":
    case "role_delete":
      score += 35;
      reasons.push("destructive_structure_change");
      break;
    case "member_ban":
      score += 15;
      reasons.push("moderation_mass_risk");
      break;
    case "member_kick":
      score += 10;
      reasons.push("member_removal");
      break;
    case "webhook_create":
    case "webhook_update":
      score += 25;
      reasons.push("webhook_abuse_surface");
      break;
    case "integration_update":
      score += 20;
      reasons.push("integration_change");
      break;
    case "bot_add":
      score += 30;
      reasons.push("unauthorized_automation_risk");
      break;
    case "guild_update":
      score += 25;
      reasons.push("server_surface_change");
      break;
    case "emoji_delete":
    case "sticker_delete":
      score += 12;
      reasons.push("asset_wipe");
      break;
    case "overwrite_update":
      score += 18;
      reasons.push("permission_overwrite_change");
      break;
    case "role_update":
      score += 22;
      reasons.push("privilege_escalation_surface");
      break;
    default:
      score += 2;
      reasons.push("baseline_noise");
  }

  if (!signal.actorId) {
    score += 5;
    reasons.push("missing_actor_context");
  }

  score = clamp(score, 0, 100);
  const severity = severityFromScore(score);
  const confidence = signal.actorId ? 0.82 : 0.55;

  return { score, severity, reasons, confidence };
}

export function aggregateRisk(signals: SecuritySignal[]): RiskAssessment {
  if (signals.length === 0) {
    return { score: 0, severity: "info", reasons: ["no_signals"], confidence: 1 };
  }
  const parts = signals.map(assessSignal);
  const score = clamp(
    parts.reduce((a, p) => a + p.score, 0) / parts.length + Math.log2(signals.length + 1) * 6,
    0,
    100,
  );
  const reasons = [...new Set(parts.flatMap((p) => p.reasons))];
  const severity = severityFromScore(score);
  const confidence = clamp(
    parts.reduce((a, p) => a + p.confidence, 0) / parts.length,
    0,
    1,
  );
  return { score, severity, reasons, confidence };
}

export function severityFromScore(score: number): ThreatSeverity {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "info";
}

export function maxSeverity(a: ThreatSeverity, b: ThreatSeverity): ThreatSeverity {
  return severityOrder.indexOf(a) >= severityOrder.indexOf(b) ? a : b;
}
