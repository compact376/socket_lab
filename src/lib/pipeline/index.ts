import { sanitizePayload, withConfig } from "./common";
import { elixirSteps } from "./elixir";
import { nodejsSteps } from "./nodejs";
import { odinSteps } from "./odin";
import { pythonSteps } from "./python";
import type { Language, Outcome, SourceConfig, Step } from "./types";

export * from "./types";
export { DEFAULT_CONFIG, MAX_ACCEPTORS, clampCount, sanitizePayload } from "./common";
export { activeAcceptor } from "./elixir";

const DISPATCH = { elixir: elixirSteps, python: pythonSteps, nodejs: nodejsSteps, odin: odinSteps };

export function stepsForLanguage(language: Language, payload: string, outcome: Outcome, sourceConfig?: Partial<SourceConfig>): Step[] {
  return DISPATCH[language](sanitizePayload(payload), outcome, withConfig(sourceConfig));
}

export function stepsFor(payload: string, outcome: Outcome, sourceConfig?: Partial<SourceConfig>, language: Language = "elixir"): Step[] {
  return stepsForLanguage(language, payload, outcome, sourceConfig);
}
