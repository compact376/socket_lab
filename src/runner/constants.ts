import type { Language } from "@/lib/pipeline/types";

export const RUNNER_URL = (import.meta.env["VITE_EDITOR_RUNNER_URL"] as string | undefined)
  ?? "http://127.0.0.1:7777";

export const REPL_LANGUAGES = new Set<Language>(["elixir", "python", "nodejs"]);

export function replUrl(): string {
  return `${RUNNER_URL.replace(/^http/, "ws")}/api/repl`;
}
