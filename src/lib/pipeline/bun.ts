import { nodejsSteps } from "./nodejs";
import type { Language, Outcome, SourceConfig, Step } from "./types";

/** Bun uses the same evented socket model as Node, with Bun's JavaScriptCore runtime. */
export function bunSteps(payload: string, outcome: Outcome, cfg: SourceConfig): Step[] {
  return nodejsSteps(payload, outcome, cfg).map((step) => ({
    ...step,
    language: "bun" as Language,
    explanation: step.explanation.replace(/Node|V8|libuv/g, (term) =>
      term === "Node" ? "Bun" : term === "V8" ? "JavaScriptCore" : "libuv",
    ),
  }));
}
