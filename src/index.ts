import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type Interaction,
} from "discord.js";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./logging/logger.js";
import { createPrismaClient } from "./persistence/prisma.js";
import { createRedis } from "./infrastructure/redis.js";
import { GuildSecurityConfigService } from "./services/guild-security-config.js";
import { IncidentRecorder } from "./services/incident-recorder.js";
import { EmergencyResponder } from "./incidents/emergency-responder.js";
import { registerAuditPipeline } from "./discord/audit-pipeline.js";
import { registerGlobalApplicationCommands } from "./discord/register-commands.js";
import { AntiNukeEngineRegistry } from "./security/engine-registry.js";
import { handleSecurityCommand } from "./commands/security.js";

async function main() {
  const env = loadEnv();
  const log = createLogger(env);
  const prisma = createPrismaClient();
  const redis = createRedis(env.REDIS_URL, log);
  const engineRegistry = new AntiNukeEngineRegistry(log);

  const configService = new GuildSecurityConfigService(prisma);
  const recorder = new IncidentRecorder(prisma, log, env.NODE_ID);
  const responder = new EmergencyResponder(log, recorder);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildBans,
    ],
    partials: [Partials.GuildMember, Partials.User],
  });

  registerAuditPipeline({
    client,
    log,
    configService,
    recorder,
    responder,
    engines: engineRegistry,
  });

  client.once(Events.ClientReady, async (c) => {
    log.info({ tag: c.user.tag, guilds: c.guilds.cache.size }, "client.ready");
    try {
      await registerGlobalApplicationCommands(env, log);
    } catch (err) {
      log.error({ err }, "commands.register_failed");
    }
    for (const g of c.guilds.cache.values()) {
      try {
        await configService.ensureGuild(g);
      } catch (err) {
        log.warn({ err, guildId: g.id }, "guild.ensure_failed");
      }
    }
  });

  client.on(Events.GuildDelete, (g) => {
    engineRegistry.dispose(g.id);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "security") return;
    if (!interaction.inGuild() || !interaction.guild) return;
    const policy = await configService.ensureGuild(interaction.guild);
    const engine = engineRegistry.obtain(interaction.guild.id, policy.thresholds);
    try {
      await handleSecurityCommand(interaction, {
        trustedOperatorIds: env.TRUSTED_OPERATOR_IDS,
        resolveEngine: () => engine,
      });
    } catch (err) {
      log.error({ err }, "interaction.security_failed");
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Internal error.", ephemeral: true });
      }
    }
  });

  client.on(Events.Error, (err) => log.error({ err }, "discord.client_error"));
  client.on(Events.Warn, (msg) => log.warn({ msg }, "discord.client_warn"));

  const shutdown = async () => {
    try {
      client.destroy();
    } catch {
      /* ignore */
    }
    try {
      await redis?.quit();
    } catch {
      /* ignore */
    }
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
