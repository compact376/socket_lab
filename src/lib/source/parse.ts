import { DEFAULT_CONFIG, clampCount } from "@/lib/pipeline/common";
import type { Language, SourceConfig } from "@/lib/pipeline/types";
import type { SourceFiles } from "./files";

/** The only source → config heuristic boundary. Never throws. */
export function parseSource(language: Language, files: SourceFiles | null | undefined): SourceConfig {
  try {
    const all = Object.values(files ?? {}).filter((v) => typeof v === "string").join("\n");
    const num = (re: RegExp) => {
      const m = all.match(re);
      return m ? clampCount(m[1]) : DEFAULT_CONFIG.acceptors;
    };
    const str = (re: RegExp, fb: string) => all.match(re)?.[1] ?? fb;
    const port = Number.parseInt(str(/\bPORT\s*(?:=|::)\s*(\d+)|port:\s*(\d+)/i, "4000"), 10) || 4000;

    switch (language) {
      case "elixir": {
        const active = all.match(/active:\s*(:once|true|false)/)?.[1];
        return {
          acceptors: num(/num_acceptors:\s*(\d+)/),
          prefix: str(/@prefix\s+"([^"]*)"/, DEFAULT_CONFIG.prefix),
          activeMode: active === "true" ? "true" : active === "false" ? "false" : "once",
          handoff: /controlling_process/.test(all),
          requireBody: /body\s*!=\s*""/.test(all),
          port: Number.parseInt(all.match(/port:\s*(\d+)/)?.[1] ?? "4000", 10),
        };
      }
      case "python":
        return { ...DEFAULT_CONFIG, acceptors: num(/BACKLOG\s*=\s*(\d+)/), prefix: str(/PREFIX\s*=\s*"([^"]*)"/, DEFAULT_CONFIG.prefix), port };
      case "nodejs":
        return { ...DEFAULT_CONFIG, acceptors: num(/maxConnections\s*=\s*(\d+)/), prefix: str(/PREFIX\s*=\s*"([^"]*)"/, DEFAULT_CONFIG.prefix), port };
      case "odin":
        return { ...DEFAULT_CONFIG, acceptors: num(/THREADS\s*::\s*(\d+)/), prefix: str(/PREFIX\s*::\s*"([^"]*)"/, DEFAULT_CONFIG.prefix), port };
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_CONFIG };
}
