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
