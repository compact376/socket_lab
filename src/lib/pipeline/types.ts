export type Language = "elixir" | "python" | "nodejs" | "bun" | "odin";
export type Outcome = "frame" | "close" | "error";
export type Zone = "hardware" | "kernel" | "runtime" | "handler" | "outcome";

export const LANGUAGES: { id: Language; label: string; runtime: string }[] = [
  { id: "elixir", label: "Elixir", runtime: "Thousand Island · BEAM" },
  { id: "python", label: "Python", runtime: "asyncio · selectors" },
  { id: "nodejs", label: "Node.js", runtime: "V8 · libuv" },
  { id: "bun", label: "Bun", runtime: "JavaScriptCore · libuv" },
  { id: "odin", label: "Odin", runtime: "native sockets · OS threads" },
];

export const OUTCOMES: Outcome[] = ["frame", "close", "error"];

export interface SourceConfig {
  /** Acceptors (Elixir), worker tasks (Python), listeners (Node), threads (Odin). */
  acceptors: number;
  prefix: string;
  activeMode: "once" | "true" | "false";
  handoff: boolean;
  requireBody: boolean;
  port: number;
}

export interface Step {
  id: string;
  language: Language;
  zone: Zone;
  /** Graph node this step highlights. */
  node: string;
  /** Node that owns the socket at this point (may be kernel). */
  ownerNode: string;
  title: string;
  explanation: string;
  owner: string;
  socketState: string;
  queue: string[];
  acceptors: number;
  handlerState: string;
  code: { file: string; snippet: string };
  /** Nodes on the packet path so far. */
  path: string[];
}
