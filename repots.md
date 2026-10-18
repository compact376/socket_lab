# Terminal Implementation Report

> Rollback note: the multi-terminal workspace UI described below has been
> removed. The editor is restored to one terminal panel with one active REPL.
> The Bun-native PTY, raw input, scrolling, copy, and Ctrl/Cmd+L fixes remain.

## Project

Wire Ingest Lab:

```text
/home/dida/examples/wire_digest_lab/networking-lab
```

This report documents the multi-terminal implementation and the related PTY,
WebSocket, editor, layout, scrolling, and lifecycle changes.

## Overview

The editor now supports multiple independent terminal sessions instead of one
global REPL terminal. A session can be:

- A language REPL:
  - Elixir: `iex`
  - Python: `python3 -i`
  - Node.js: `node -i`
- A persistent system shell, when explicitly enabled for a trusted local
  workspace.

Each session has its own:

- Stable session ID
- Display name
- Runtime type
- Language
- Working directory
- PTY process
- Output stream
- Resize state
- Lifecycle and exit status
- Terminal scrollback and xterm instance

The ordinary one-shot `/api/run` code runner remains separate and continues to
use pipe-based `Bun.spawn()` execution.

## Root Cause of the Original REPL Echo Problem

Interactive REPLs were originally started with ordinary stdin/stdout/stderr
pipes. Many interactive runtimes change their line editing, prompt, and echo
behavior when they detect that they are not attached to a terminal.

The implementation now uses Bun's native PTY API:

```ts
const terminal = new Bun.Terminal({
  cols: 80,
  rows: 24,
  name: "xterm-256color",
  data: (_pty, bytes) => {
    // Forward PTY output to the WebSocket.
  },
});

const child = Bun.spawn(command, {
  terminal,
});
```

The browser sends raw xterm input directly to the PTY. The frontend does not
manually echo typed characters and does not rewrite carriage returns. Echo,
history, line editing, Backspace, arrow keys, Ctrl+C, Ctrl+D, Tab, and ANSI
terminal behavior are supplied by the PTY and child process.

`node-pty` is not installed and is not required. Bun's built-in
`Bun.Terminal` is the PTY implementation.

## Files Changed

### `runner-server.ts`

The Bun runner now provides session-aware PTY management.

Implemented behavior:

- Multiplexes multiple terminal sessions over one WebSocket.
- Limits each WebSocket connection to eight sessions.
- Assigns every process, terminal, output message, resize request, and cleanup
  operation to a validated `sessionId`.
- Starts REPL sessions using Bun's native `Bun.Terminal`.
- Starts persistent shell sessions using an interactive shell process.
- Preserves independent working directories per session.
- Validates working directories against the configured workspace root.
- Supports session operations:
  - `create`
  - `input`
  - `resize`
  - `stop`
  - `close`
  - `restart`
- Streams PTY output exactly once.
- Cleans up timers, PTYs, process references, and session records.
- Reports actual process exit codes where available.
- Enforces PTY dimensions:
  - Columns: 1–300
  - Rows: 1–200
- Limits WebSocket messages and input payloads.
- Preserves the existing REPL lifetime limit.
- Preserves Docker resource restrictions for Docker-backed execution.

Shells are disabled by default because local shell mode executes commands in
the configured workspace. Enable it only for a trusted local environment:

```bash
EDITOR_RUNNER_ALLOW_SHELL=true bun run editor-server
```

The runner uses `EDITOR_RUNNER_WORKSPACE` as the shell workspace root. If it is
not set, the project directory is used.

### `src/runner/workspace.tsx`

Added the React terminal workspace manager.

Implemented UI behavior:

- Creates independent terminal sessions.
- Displays terminal tabs.
- Shows running, starting, stopped, and error status.
- Creates REPL and shell terminals.
- Switches between sessions without restarting processes.
- Renames terminals by double-clicking the tab title.
- Closes terminals and sends backend cleanup commands.
- Minimizes terminals without destroying their process.
- Restores minimized terminals from their tabs.
- Maximizes a selected terminal.
- Restores the previous multi-pane view.
- Creates horizontal and vertical split panes.
- Supports nested splits.
- Resizes split panes through draggable dividers.
- Preserves stable session IDs instead of using array indexes.
- Keeps output buffers separate per session.
- Provides an empty-state message when no terminal pane is available.

The workspace does not persist live PTY processes across a page reload. This
is intentional because process reconnection and ownership transfer have not
been implemented.

### `src/runner/terminal.tsx`

Owns one xterm.js instance for one terminal pane.

Implemented behavior:

- Creates xterm dynamically to avoid SSR and `document` access problems.
- Forwards raw `onData` input to the correct session.
- Does not manually echo input.
- Does not replace `\r` with `\n`.
- Enables xterm terminal input.
- Uses a 5,000-line scrollback buffer.
- Uses FitAddon and ResizeObserver for terminal sizing.
- Sends terminal dimensions to the correct backend session.
- Preserves ANSI output and control sequences.
- Renders output exactly once.
- Keeps output scrolling at the bottom only when the user was already there.
- Preserves manual upward scrolling when new output arrives.
- Supports mouse-wheel and touch scrolling inside the terminal viewport.
- Supports Ctrl/Cmd+L clearing.
- Explicitly prevents the browser default Ctrl/Cmd+L shortcut.
- Supports Ctrl/Cmd+C for selected terminal text.
- Supports right-click copy when text is selected.
- Restores focus when a terminal becomes active.
- Disposes xterm, FitAddon, listeners, and observers on unmount.

### `src/runner/websocket.ts`

Expanded the client-side WebSocket wrapper.

The client now:

- Maintains one multiplexed WebSocket connection.
- Queues messages until the connection opens.
- Creates sessions with stable IDs.
- Sends raw input to a selected session.
- Sends resize messages to a selected session.
- Stops, closes, and restarts selected sessions.
- Retains the original `start(language)` helper for compatibility with the
  former single-REPL flow.
- Reports malformed server messages as terminal errors.

### `src/runner/types.ts`

Added shared protocol and session types:

```ts
type TerminalType = "shell" | "repl";

type TerminalStatus =
  | "starting"
  | "running"
  | "stopped"
  | "error";

type TerminalSession = {
  id: string;
  name: string;
  type: TerminalType;
  language?: "elixir" | "python" | "nodejs";
  cwd: string;
  status: TerminalStatus;
  createdAt: number;
};
```

`ReplMessage` now supports session-aware `created`, `output`, `status`,
`error`, and `exit` messages while retaining compatibility with the existing
message shapes.

### `src/runner/index.ts`

Exports the terminal workspace, client, terminal panel, and shared terminal
types for use by the editor.

### `src/routes/editor.tsx`

The editor now embeds `TerminalWorkspace` instead of a single terminal tied to
one global `ReplClient`.

Also implemented:

- A draggable terminal-panel height handle.
- Minimum and maximum terminal panel heights.
- Local persistence of the selected terminal panel height.
- Continued separation between one-shot runner output and interactive
  terminal sessions.
- Existing Monaco editing, saving, parsing, and ordinary code execution.

The saved source model remains browser-localStorage-backed. It has not been
silently replaced with a second server filesystem.

### `src/styles.css`

Added styles for:

- Terminal workspace sizing
- Terminal tabs
- Active tabs
- Session status indicators
- Terminal headers
- Minimize/maximize/close controls
- Horizontal and vertical split panes
- Split dividers
- Terminal panel resize handle
- Terminal empty state
- xterm viewport scrolling
- Overscroll containment
- Touch scrolling

### `README.md`

Documented:

- The multiplexed WebSocket protocol
- Shell activation
- Workspace configuration
- Session operations
- Bun-native PTY behavior
- Multi-terminal tabs and splits
- Terminal panel resizing
- Live-process persistence limitations
- Odin's run-file-only behavior

## WebSocket Protocol

### Client to server

Create a REPL:

```json
{
  "type": "create",
  "sessionId": "python-1",
  "terminalType": "repl",
  "language": "python",
  "name": "Python experiments"
}
```

Create a shell:

```json
{
  "type": "create",
  "sessionId": "shell-1",
  "terminalType": "shell",
  "name": "Shell project"
}
```

Send input:

```json
{
  "type": "input",
  "sessionId": "python-1",
  "data": "print(1 + 1)\r"
}
```

Resize:

```json
{
  "type": "resize",
  "sessionId": "python-1",
  "cols": 80,
  "rows": 24
}
```

Stop or close:

```json
{
  "type": "stop",
  "sessionId": "python-1"
}
```

```json
{
  "type": "close",
  "sessionId": "python-1"
}
```

Restart:

```json
{
  "type": "restart",
  "sessionId": "python-1"
}
```

### Server to client

Created:

```json
{
  "type": "created",
  "sessionId": "python-1",
  "terminalType": "repl",
  "language": "python",
  "name": "Python experiments"
}
```

Output:

```json
{
  "type": "output",
  "sessionId": "python-1",
  "data": "..."
}
```

Status:

```json
{
  "type": "status",
  "sessionId": "python-1",
  "status": "running",
  "data": "python3 started"
}
```

Exit:

```json
{
  "type": "exit",
  "sessionId": "python-1",
  "exitCode": 0
}
```

## Running the Feature

Install dependencies:

```bash
cd /home/dida/examples/wire_digest_lab/networking-lab
bun install
```

Start the application and runner together:

```bash
bun run dev:all
```

Alternatively, start them separately:

```bash
bun run dev
```

In another terminal:

```bash
EDITOR_RUNNER_ALLOW_SHELL=true bun run editor-server
```

The runner listens on:

```text
http://127.0.0.1:7777
```

The terminal WebSocket endpoint is:

```text
ws://127.0.0.1:7777/api/repl
```

Without `EDITOR_RUNNER_ALLOW_SHELL=true`, language REPLs remain available but
shell creation is rejected.

## Security Decisions

The implementation preserves the existing local-first security boundaries:

- The runner binds to `127.0.0.1`.
- Languages are selected from an explicit allowlist.
- Clients cannot select arbitrary executable paths.
- PTY dimensions are bounded.
- WebSocket payloads are size-limited.
- Each WebSocket has a maximum session count.
- Shell working directories are constrained to the configured workspace root.
- Docker execution retains:
  - `--network none`
  - CPU limit
  - Memory limit
  - PID limit
- REPL lifetime limits remain active.
- WebSocket disconnects stop associated terminal sessions.
- The ordinary runner remains separate from interactive PTYs.

Shell mode is intentionally opt-in. Local shell mode is not an untrusted
multi-user sandbox. For untrusted code execution, Docker mode should be used
with the existing resource restrictions and an appropriately isolated
workspace.

## Filesystem Limitation

The editor's current source storage uses browser localStorage. The backend
shell uses a real filesystem workspace. These are currently separate systems.

As a result:

- A shell can create real files in its workspace.
- Monaco source files remain managed by the browser persistence layer.
- Shell-created files are not automatically added to Monaco tabs.
- Monaco-created localStorage files are not automatically written to the
  backend workspace.

Synchronizing these systems requires a deliberate workspace API, file watcher,
authorization model, conflict policy, and persistence design. The current
implementation avoids silently introducing a divergent or unsafe filesystem
model.

## Validation Performed

The following checks were executed successfully:

```bash
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
bun run lint
bun test --run
bun run build
bun --check runner-server.ts
```

Test result:

```text
20 pass
0 fail
```

Live WebSocket verification also confirmed:

- A shell and Python REPL can run simultaneously.
- Output is routed by session ID.
- The shell process remains alive between commands.
- `cd /tmp` changes only that shell's working directory.
- A subsequent `pwd` reports `/tmp`.
- PTY output includes terminal echo and ANSI control sequences.

## Remaining Limitations

The following work is intentionally not claimed as complete:

1. Browser-local editor files and backend shell files are not synchronized.
2. Live terminal sessions do not survive a page reload.
3. Authentication and multi-user authorization are not implemented for the
   standalone local runner.
4. Shell mode should not be exposed outside a trusted local environment.
5. Docker shell mode requires the configured Docker image and daemon.
6. Browser end-to-end tests for dragging, clipboard behavior, keyboard focus,
   and split-pane interactions have not been added.
7. Terminal names and split layouts are currently runtime UI state; only the
   terminal panel height is persisted.
