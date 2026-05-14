import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { loadControlEnv } from "./config/env.js";
import { registerInternalKeyRoutes } from "./routes/internal-keys.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerTenantRoutes } from "./routes/tenant.js";
import { getPrisma } from "./lib/prisma.js";

async function main() {
  const env = loadControlEnv();
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });

  const origins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: 600,
    timeWindow: "1 minute",
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation_error", details: err.flatten() });
    }
    req.log.error({ err }, "unhandled");
    return reply.code((err as { statusCode?: number }).statusCode ?? 500).send({
      error: "internal_error",
    });
  });

  app.get("/health", async () => ({ ok: true, service: "oryx-control-api" }));

  await registerInternalKeyRoutes(app, env);
  await registerAuthRoutes(app, env);
  await registerTenantRoutes(app, env);

  await app.listen({ host: env.CONTROL_API_HOST, port: env.CONTROL_API_PORT });
  app.log.info(
    { host: env.CONTROL_API_HOST, port: env.CONTROL_API_PORT },
    "oryx.control_api.listening",
  );

  const shutdown = async () => {
    try {
      await app.close();
    } catch {
      /* ignore */
    }
    await getPrisma().$disconnect();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
