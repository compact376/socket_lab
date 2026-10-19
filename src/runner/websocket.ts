import { replUrl } from "./constants";
import type {
  ReplEventHandlers,
  ReplMessage,
  ReplSize,
  TerminalType,
  ReplLanguage,
} from "./types";

type CreateOptions = {
  sessionId: string;
  terminalType: TerminalType;
  language?: ReplLanguage;
  cwd?: string;
  name?: string;
};

export class ReplClient {
  private socket: WebSocket | null = null;
  private readonly handlers: ReplEventHandlers;
  private readonly pending: string[] = [];

  constructor(handlers: ReplEventHandlers) {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.socket) return;
    const socket = new WebSocket(replUrl());
    this.socket = socket;
    socket.onopen = () => {
      this.handlers.onStatus?.("open");
      for (const message of this.pending.splice(0)) socket.send(message);
    };
    socket.onmessage = (event) => {
      try {
        this.handlers.onMessage(JSON.parse(event.data) as ReplMessage);
      } catch {
        this.handlers.onMessage({ type: "error", error: "Terminal returned an invalid message" });
      }
    };
    socket.onerror = () => this.handlers.onStatus?.("error");
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.pending.length = 0;
      this.handlers.onStatus?.("closed");
    };
  }

  private sendMessage(message: Record<string, unknown>): void {
    const encoded = JSON.stringify(message);
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(encoded);
    else {
      this.pending.push(encoded);
      this.connect();
    }
  }

  create(options: CreateOptions): void {
    this.sendMessage({ type: "create", ...options });
  }

  /** Compatibility helper for the original single-REPL editor flow. */
  start(language: ReplLanguage, sessionId = "default"): void {
    this.create({ sessionId, terminalType: "repl", language, name: `${language} REPL` });
  }

  send(data: string, sessionId = "default"): void {
    if (data.length > 64 * 1024) return;
    this.sendMessage({ type: "input", sessionId, data });
  }

  resize(cols: number, rows: number, sessionId = "default"): void {
    this.sendMessage({ type: "resize", sessionId, cols, rows });
  }

  stop(sessionId = "default"): void {
    this.sendMessage({ type: "stop", sessionId });
  }

  close(sessionId = "default"): void {
    this.sendMessage({ type: "close", sessionId });
  }

  restart(sessionId = "default"): void {
    this.sendMessage({ type: "restart", sessionId });
  }

  dispose(): void {
    this.pending.length = 0;
    this.socket?.close();
    this.socket = null;
  }
}

export type { ReplSize };
