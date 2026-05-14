import { REST, Routes } from "discord.js";
import type { AppEnv } from "../config/env.js";
import type { Logger } from "../logging/logger.js";
import { buildSecurityCommands } from "../commands/security.js";

export async function registerGlobalApplicationCommands(env: AppEnv, log: Logger): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const body = [...buildSecurityCommands()];
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
  log.info({ commands: body.length }, "commands.registered");
}
