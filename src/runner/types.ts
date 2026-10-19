import type { Language } from "@/lib/pipeline/types";
import type { SourceFiles } from "@/lib/source/files";

export type ReplLanguage = Exclude<Language, "odin">;

export type RunnerOutput = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  timedOut?: boolean;
  error?: string;
};

export type ReplMessage =
  | { type: "started"; sessionId?: string; language: ReplLanguage; command: string }
  | { type: "created"; sessionId: string; terminalType: TerminalType; language?: ReplLanguage; name?: string }
  | { type: "stdout" | "stderr" | "output"; sessionId?: string; data: string }
  | { type: "status"; sessionId?: string; data: string; status?: TerminalStatus }
  | { type: "error"; sessionId?: string; error: string }
  | { type: "exit"; sessionId?: string; exitCode: number | null };

export type TerminalType = "shell" | "repl";
export type TerminalStatus = "starting" | "running" | "stopped" | "error";

export type TerminalSession = {
  id: string;
  name: string;
  type: TerminalType;
  language?: ReplLanguage;
  cwd: string;
  status: TerminalStatus;
  createdAt: number;
};

export type ReplEventHandlers = {
  onMessage: (message: ReplMessage) => void;
  onStatus?: (status: "open" | "closed" | "error") => void;
};

export type ReplSize = {
  cols: number;
  rows: number;
};

export type RunInput = {
  language: Language;
  files: SourceFiles;
  entry: string;
  timeoutMs: number;
};
