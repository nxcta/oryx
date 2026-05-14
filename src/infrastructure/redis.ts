import Redis from "ioredis";
import type { Logger } from "../logging/logger.js";

/** Optional Redis client for distributed locks, shared velocity, and queues. */
export function createRedis(url: string | undefined, log: Logger): Redis | null {
  if (!url) {
    log.info("redis.disabled");
    return null;
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });
  client.on("error", (err) => log.error({ err }, "redis.error"));
  return client;
}
