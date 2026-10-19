# Wire Ingest Lab

Deterministic, no-network simulator for following one TCP socket from the NIC
through the Linux kernel and into Elixir, Python, Node.js, Bun, or Odin runtimes.
Edit the source snippets, save them, and step through the resulting observer
graph.

## Run locally

```bash
bun install
bun run dev
```

The dev server prints its local URL (the project config uses port `8080`).

To start both the app and the editor runner with one command, use:

```bash
bun run dev:all
```

To enable **Run in Docker** in the editor, start the runner in a second
terminal:

```bash
bun run editor-server
```

The runner listens on `http://127.0.0.1:7777` and accepts `elixir`, `python`,
`nodejs`, `bun`, and `odin` requests. Local mode uses the corresponding installed
binary. Odin also checks `/home/dida/Odin/odin` in this environment; set
`EDITOR_RUNNER_ODIN_PATH` to another executable when needed. Set
`EDITOR_RUNNER_COMMAND=docker` to use the pinned images
`elixir:1.18-alpine`, `python:3.12-alpine`, `node:22-alpine`,
`oven/bun:1.4-alpine`, and
`odin:dev` (the images must already be available locally; build or retag an
Odin image for your toolchain). Docker mode disables networking and applies
CPU, memory, and PID limits.

The runner API is `POST /api/run` with
`{ language, files, entry, timeoutMs }`; timeout is clamped to 100 ms–30 s.
`GET /health` reports each language's image and local/Docker availability.
Elixir, Python, Node.js, and Bun support interactive terminals at
`ws://127.0.0.1:7777/api/repl`. The connection multiplexes independent
session IDs. Create a REPL with
`{ "type": "create", "sessionId": "python-1", "terminalType": "repl", "language": "python" }`,
or create a persistent shell with
`{ "type": "create", "sessionId": "shell-1", "terminalType": "shell" }`.
Shells are intentionally disabled by default because local mode executes on
the host; enable them only for a trusted local workspace with
`EDITOR_RUNNER_ALLOW_SHELL=true bun run editor-server`. Use `cwd` only within
`EDITOR_RUNNER_WORKSPACE` (defaults to the project directory). Send input,
resize, stop, close, and restart messages with the same `sessionId`.
Input is forwarded unchanged to a Bun-native PTY, which provides terminal echo,
editing, history, and control-key behavior. Each session has an independent
process, working directory, output stream, and lifetime. Odin has no
Bun uses `bun repl` for its interactive terminal. Odin has no traditional REPL
and remains run-file only.

The editor's terminal workspace provides tabs, independent REPL/shell
sessions, minimize/restore, maximize/restore, horizontal and vertical splits,
draggable split dividers, a resizable terminal panel, rename-on-double-click,
and per-session close controls. Live PTY state is not persisted across a page
reload; only layout preferences such as terminal height are stored locally.
Local binaries are preferred; Docker mode uses the same
network-disabled resource limits as one-shot execution.
The SSH panel is intentionally disabled: remote execution requires a trusted
server-side bridge and credentials must never be sent by the browser.

The editor starts each language with its educational default files, then stores
the complete file map under that language's localStorage key. **New file**,
**Rename**, and **Delete** affect only the local draft until **Save**. Save does
not recreate the Monaco model, so the current text remains visible and the
simulation changes only after the explicit save. Odin uses a dedicated Monaco
language registration, Monarch tokenizer, and editor theme rules for keywords,
types, procedures, strings, comments, numbers, and operators.

## Verify

```bash
bun test
bun run lint
bunx tsc -p tsconfig.app.json --noEmit
bun run build
```

## Routes

- `/` — lab timeline and saved-source summary
- `/graph` — interactive observer graph
- `/editor` — source editor and parser configuration

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
