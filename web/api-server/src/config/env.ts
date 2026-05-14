import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CONTROL_API_HOST: z.string().default("0.0.0.0"),
  CONTROL_API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  /** High-entropy secret for hashing IPs in audit rows (rotate independently of DB). */
  AUDIT_PEPPER: z.string().min(16),
  /** Protects internal mint/revoke routes (replace with SSO service token later). */
  ADMIN_API_TOKEN: z.string().min(24),
  /** Cookie signing secret for @fastify/cookie (rotate on incident). */
  COOKIE_SECRET: z.string().min(32),
  /** Optional e.g. `.example.com` when API + sites share parent domain (omit for host-only cookies). */
  COOKIE_DOMAIN: z.string().min(3).optional(),
  /** Shared secret for Next.js BFF → `/v1/bff/redeem` (server-side only). */
  BFF_SERVER_SECRET: z.string().min(24).optional(),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export type ControlApiEnv = z.infer<typeof envSchema>;

export function loadControlEnv(
  processEnv: NodeJS.ProcessEnv = process.env,
): ControlApiEnv {
  const parsed = envSchema.safeParse(processEnv);
  if (!parsed.success) {
    throw new Error(`control-api invalid env: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  return parsed.data;
}
