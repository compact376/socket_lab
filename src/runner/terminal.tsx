
import { useEffect, useRef } from "react";
import type { Terminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import type { ReplMessage } from "./types";

type TerminalPanelProps = {
  active: boolean;
  onInput: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  messages: ReplMessage[];
  streamKey: string;
};

type Disposable = {
  dispose: () => void;
};

function renderMessage(
  terminal: Terminal,
  message: ReplMessage,
  onWrite?: () => void,
): void {
  const write = (data: string) => terminal.write(data, onWrite);

  switch (message.type) {
    case "stdout":
    case "stderr":
    case "output":
      write(message.data);
      break;

    case "started":
      terminal.writeln(`\r\n${message.language} REPL started`, onWrite);
      break;

    case "status":
      terminal.writeln(`\r\n${message.data}`, onWrite);
      break;

    case "error":
      terminal.writeln(`\r\n[error] ${message.error}`, onWrite);
      break;

    case "exit":
      terminal.writeln(`\r\nREPL exited with code ${message.exitCode}`, onWrite);
      break;
  }
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Clipboard API can fail because of browser permissions.
    // Try the fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);

  try {
    textarea.select();

    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy failed.");
    }
  } finally {
    textarea.remove();
  }
}

function copySelection(terminal: Terminal): void {
  if (!terminal.hasSelection()) return;

  const selection = terminal.getSelection();
  if (!selection) return;

  void copyText(selection).catch((error: unknown) => {
    console.error("Unable to copy terminal selection:", error);
  });
}

export function TerminalPanel({
  active,
  onInput,
  onResize,
  messages,
  streamKey,
}: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const inputDisposableRef = useRef<Disposable | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const onInputRef = useRef(onInput);
  const onResizeRef = useRef(onResize);
  const activeRef = useRef(active);
  const messagesRef = useRef(messages);
  const streamKeyRef = useRef(streamKey);

  const renderedCountRef = useRef(0);
  const renderedStreamKeyRef = useRef(streamKey);

  // Keep event handlers synchronized with the latest React props.
  onInputRef.current = onInput;
  onResizeRef.current = onResize;
  activeRef.current = active;
  messagesRef.current = messages;
  streamKeyRef.current = streamKey;

  useEffect(() => {
    let disposed = false;
    let instance: Terminal | null = null;
    let fit: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeDisposable: Disposable | null = null;
    let contextMenuHandler: ((event: MouseEvent) => void) | null = null;

    async function initialize(): Promise<void> {
      try {
        const [{ Terminal: Xterm }, { FitAddon: Fit }] =
          await Promise.all([
            import("xterm"),
            import("xterm-addon-fit"),
          ]);

        // Dynamic imports may resolve after the component unmounts.
        if (disposed || !hostRef.current) return;

        const terminal = new Xterm({
          convertEol: true,
          cursorBlink: true,
          scrollback: 5000,
          scrollOnUserInput: true,
          disableStdin: false,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          theme: {
            background: "#101318",
            foreground: "#d4d4d4",
            cursor: "#d4d4d4",
            selectionBackground: "#264f78",
          },
        });

        instance = terminal;
        terminal.open(hostRef.current);

        const fitAddon = new Fit();
        fit = fitAddon;
        terminal.loadAddon(fitAddon);

        terminalRef.current = terminal;
        fitRef.current = fitAddon;

        fitAddon.fit();

        terminal.attachCustomKeyEventHandler((event) => {
          if (event.type !== "keydown") return true;

          const modifierPressed = event.ctrlKey || event.metaKey;
          const key = event.key.toLowerCase();

          if (modifierPressed && key === "l") {
            event.preventDefault();
            event.stopPropagation();
            terminal.clear();
            terminal.focus();
            return false;
          }

          if (
            modifierPressed &&
            key === "c" &&
            terminal.hasSelection()
          ) {
            copySelection(terminal);
            return false;
          }

          return true;
        });

        inputDisposableRef.current = terminal.onData((data) => {
          if (!activeRef.current) return;

          onInputRef.current(data);
        });
        resizeDisposable = terminal.onResize(({ cols, rows }) => {
          if (activeRef.current) onResizeRef.current?.(cols, rows);
        });
        if (activeRef.current) {
          onResizeRef.current?.(terminal.cols, terminal.rows);
        }

        contextMenuHandler = (event: MouseEvent) => {
          if (!terminal.hasSelection()) return;

          event.preventDefault();
          copySelection(terminal);
        };

        terminal.element?.addEventListener(
          "contextmenu",
          contextMenuHandler,
        );

        resizeObserver = new ResizeObserver(() => {
          try {
            fitRef.current?.fit();
          } catch {
            // The terminal may not have measurable dimensions yet.
          }
        });

        resizeObserver.observe(hostRef.current);

        // Render the latest messages, including updates received
        // while the dynamic imports were loading.
        const currentStreamKey = streamKeyRef.current;

        terminal.clear();

        for (const message of messagesRef.current) {
          renderMessage(terminal, message);
        }
        terminal.scrollToBottom();

        renderedCountRef.current = messagesRef.current.length;
        renderedStreamKeyRef.current = currentStreamKey;

        if (activeRef.current) {
          terminal.focus();
        }
      } catch (error: unknown) {
        if (!disposed) {
          console.error("Failed to initialize terminal:", error);
        }
      }
    }

    void initialize();

    return () => {
      disposed = true;

      resizeObserver?.disconnect();

      if (contextMenuHandler) {
        instance?.element?.removeEventListener(
          "contextmenu",
          contextMenuHandler,
        );
      }

      inputDisposableRef.current?.dispose();
      inputDisposableRef.current = null;
      resizeDisposable?.dispose();
      resizeDisposable = null;

      fit?.dispose();
      fitRef.current = null;

      instance?.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    // A new stream must start with a clean terminal and its own output.
    if (renderedStreamKeyRef.current !== streamKey) {
      terminal.clear();
      renderedCountRef.current = 0;
      renderedStreamKeyRef.current = streamKey;
    }

    // Messages may also be reset without changing the stream key.
    if (messages.length < renderedCountRef.current) {
      terminal.clear();
      renderedCountRef.current = 0;
    }

    const pending = messages.slice(renderedCountRef.current);

    for (const message of pending) {
      const buffer = terminal.buffer.active;
      const wasAtBottom =
        buffer.viewportY >= buffer.baseY - 1;

      renderMessage(terminal, message, () => {
        if (wasAtBottom) terminal.scrollToBottom();
      });
    }

    renderedCountRef.current = messages.length;
  }, [messages, streamKey]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!active || !terminal) return;

    const timeoutId = window.setTimeout(() => {
      terminalRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [active]);

  return (
    <div
      ref={hostRef}
      className="terminal min-h-0 min-w-0 flex-1 overflow-hidden px-3 pb-3"
      role="log"
      aria-live="polite"
    />
  );
}
