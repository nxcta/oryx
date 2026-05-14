import pino from "pino";
import type { AppEnv } from "../config/env.js";

export function createLogger(env: AppEnv) {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      nodeId: env.NODE_ID,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
