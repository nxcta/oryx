import type { Logger } from "../logging/logger.js";
import { AntiNukeEngine } from "./anti-nuke/engine.js";
import type { AntiNukeThresholds } from "./anti-nuke/thresholds.js";

export class AntiNukeEngineRegistry {
  private readonly engines = new Map<string, AntiNukeEngine>();

  constructor(private readonly log: Logger) {}

  obtain(guildId: string, thresholds?: Partial<AntiNukeThresholds>): AntiNukeEngine {
    let engine = this.engines.get(guildId);
    if (!engine) {
      engine = new AntiNukeEngine(this.log, thresholds);
      this.engines.set(guildId, engine);
      return engine;
    }
    if (thresholds) {
      engine.setThresholds(thresholds);
    }
    return engine;
  }

  dispose(guildId: string): void {
    this.engines.delete(guildId);
  }
}
