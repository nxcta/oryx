import type { Client } from "discord.js";
import type { Logger } from "../logging/logger.js";
import type { DbClient } from "../persistence/prisma.js";

export interface PluginContext {
  client: Client;
  log: Logger;
  db: DbClient;
}

/** Extension point for vetted internal modules (not arbitrary user JS). */
export interface SecuBotPlugin {
  readonly name: string;
  register(ctx: PluginContext): Promise<void> | void;
  unregister?(ctx: PluginContext): Promise<void> | void;
}
