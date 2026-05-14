/**
 * Deterministic, explainable text heuristics (no external LLM).
 * Suitable as a first-stage triage before ML or human review.
 */
export interface TextRiskResult {
  score: number;
  reasons: string[];
}

const NITRO_SCAM = /(free|claim).{0,40}(nitro|discord\s*gift)/i;
const TOKEN_GRAB = /(discordapp\.com\/api\/webhooks\/|\bMT[A-Za-z0-9_-]{20,}\b)/;
const PHISH_DOMAIN = /(discord-nitro|dlscord|discоrd)/i;

export function analyzeTextRisk(input: string): TextRiskResult {
  const reasons: string[] = [];
  let score = 0;
  const text = input.slice(0, 2000);

  if (NITRO_SCAM.test(text)) {
    score += 45;
    reasons.push("nitro_scam_pattern");
  }
  if (TOKEN_GRAB.test(text)) {
    score += 80;
    reasons.push("token_or_webhook_exfil_pattern");
  }
  if (PHISH_DOMAIN.test(text)) {
    score += 55;
    reasons.push("homoglyph_or_typosquat_domain");
  }

  const mentionSpam = (text.match(/<@!?\d+>/g) ?? []).length;
  if (mentionSpam >= 6) {
    score += 25;
    reasons.push("mass_mention");
  }

  score = Math.min(100, score);
  return { score, reasons };
}
