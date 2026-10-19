# Wire Ingest Lab — Technical Document

**Status:** Current implementation  
**Runtime:** Bun 1.4+, React 19, TypeScript, TanStack Start/Router, Vite  
**Purpose:** Explain how source files are edited, persisted, simulated, and optionally executed through the local runner.

## 1. System purpose and boundaries

Wire Ingest Lab is an educational simulator for following one conceptual TCP
connection through five runtime models:

- Elixir/BEAM and Thousand Island
- Python/asyncio
- Node.js/libuv
- Bun/JavaScriptCore and evented I/O
- Odin/native threads

The browser simulation is deterministic. It does not open sockets, connect to
remote hosts, or execute arbitrary source code. Real process execution is
available only through the explicitly started Bun runner on
`127.0.0.1:7777`.

The system has two independent flows:

1. **Simulation flow:** saved source is parsed into normalized configuration,
   then converted into deterministic lifecycle steps and an Observer graph.
2. **Execution flow:** clicking **Run in runner** submits files to the local
   Bun service, which stages and executes the selected entry file.

Execution output never changes the simulation state. Conversely, editing source
does not execute code unless the user explicitly presses **Run in runner**.

## 2. Component architecture

```text
Browser
├── TanStack routes
│   ├── /              Lab timeline
│   ├── /graph         Observer graph
│   └── /editor        Monaco editor and runner controls
├── External lab store
├── Source persistence adapter
├── Source parser
├── Language-specific simulation pipelines
└── D3 Observer projection

Local machine
└── Bun runner: 127.0.0.1:7777
    ├── Request validation
    ├── Temporary workspace staging
    ├── Local runtime or Docker command selection
    ├── Timeout/resource enforcement
    └── stdout/stderr response
```

Important files:

| File | Responsibility |
|---|---|
| `src/routes/editor.tsx` | Monaco editor, file tabs, draft state, Save, Run, output console |
| `src/lib/source/files.ts` | Default files for each language |
| `src/lib/source/persist.ts` | Language-scoped localStorage persistence |
| `src/lib/source/parse.ts` | Heuristic source-to-`SourceConfig` parser |
| `src/lib/lab-store.ts` | Lab state, saved source subscription, simulation hook |
| `src/lib/pipeline/index.ts` | Dispatch to language-specific pipelines |
| `src/lib/pipeline/*.ts` | Deterministic runtime lifecycle steps |
| `src/components/observer/layouts.ts` | Language-specific graph layouts |
| `runner-server.ts` | Secure local execution API |
| `dev-all.ts` | Starts Vite and the runner together |

## 3. Source editing lifecycle

### 3.1 Draft state

The editor maintains a `SourceFiles` object:

```ts
type SourceFiles = Record<string, string>;
```

Each language begins with the defaults in `DEFAULT_SOURCES`. The editor draft
is local React state and is not persisted while the user types.

The editor supports:

- creating a file;
- renaming a file;
- deleting a file, while retaining at least one file;
- switching between files using tabs;
- switching languages after handling unsaved changes.

File names are restricted to simple names containing letters, numbers, dots,
underscores, and hyphens. This matches the runner’s path-safety validation.

### 3.2 Save behavior

Save writes the complete current file map:

```text
thousand-island-source-config:<language>
```

For example:

```text
thousand-island-source-config:odin
```

After writing, `saveSource` emits a language-scoped update event. The editor
does not dispose its Monaco model for its own save event. This is intentional:
disposing and recreating the model during Save was the cause of editor content
disappearing.

The simulation consumes the saved source subscription, so the graph changes
only after Save.

### 3.3 Reset behavior

Reset removes the language-specific localStorage key. The next load falls back
to that language’s default source files. Reset is scoped to the selected
language.

## 4. Monaco model lifecycle

Monaco model paths use this stable format:

```text
wire-ingest/<language>/<file>
```

Examples:

```text
wire-ingest/odin/hello.odin
wire-ingest/python/server.py
```

The editor:

1. applies the language-specific Monaco language ID;
2. uses the file path as the model identity;
3. tracks mounted models;
4. disposes models when the language or an external saved-source change
   genuinely replaces the editing environment;
5. disposes all tracked models on unmount.

The current language IDs are:

| Application language | Monaco language ID |
|---|---|
| Elixir | `elixir` |
| Python | `python` |
| Node.js | `typescript` |
| Bun | `typescript` |
| Odin | `odin` |

Odin is registered at Monaco startup with a Monarch tokenizer covering
keywords, types, identifiers, procedures, strings, comments, numbers,
operators, delimiters, and brackets. The `wire-ingest-dark` theme assigns
readable colors to those token classes.

## 5. Deterministic simulation pipeline

The simulation path is:

```text
Saved SourceFiles
    ↓
parseSource(language, files)
    ↓
SourceConfig
    ↓
stepsForLanguage(language, payload, outcome, config)
    ↓
Step[]
    ↓
Observer graph and timeline
```

`SourceConfig` contains normalized educational values such as:

- acceptor, worker, listener, or thread count;
- protocol prefix;
- port;
- active socket mode;
- handler handoff behavior;
- whether a frame body is required.

Each language pipeline returns the same `Step[]` shape. This allows the graph
and timeline to remain shared while the runtime-specific explanations differ.

The parser is deliberately heuristic rather than a compiler. Its purpose is
to make selected source values visible in the educational simulation, not to
validate or execute complete programs.

## 6. Local runner API

### 6.1 Request

`POST http://127.0.0.1:7777/api/run`

```json
{
  "language": "odin",
  "files": {
    "hello.odin": "package main\nmain :: proc() {}"
  },
  "entry": "hello.odin",
  "timeoutMs": 10000
}
```

Required fields:

| Field | Type | Rules |
|---|---|---|
| `language` | string | `elixir`, `python`, `nodejs`, `bun`, or `odin` |
| `files` | object | Simple file names mapped to source strings |
| `entry` | string | Must be a submitted file and a simple file name |
| `timeoutMs` | number | Clamped to 100–30,000 ms; defaults to 10,000 |

Each file is limited to 256,000 bytes. Path separators, traversal segments,
absolute paths, and arbitrary command values are not accepted.

### 6.2 Response

```json
{
  "stdout": "odin-ok\n",
  "stderr": "",
  "exitCode": 0,
  "timedOut": false
}
```

Invalid requests return HTTP 400. A missing local runtime returns HTTP 503.
Execution failures are represented by the process exit code and captured
stderr. Timeout returns exit code `124` and `timedOut: true`.

The one-shot API returns captured output after process completion. Interactive
sessions use the WebSocket API below for incremental events.

### 6.3 Interactive REPL

`GET ws://127.0.0.1:7777/api/repl` upgrades to a loopback WebSocket. After the
connection opens, the browser sends:

```json
{ "type": "start", "language": "python" }
```

Elixir starts `iex`, Python starts `python3 -i`, Node.js starts `node -i`, and
Bun starts `bun repl`.
Odin is intentionally rejected because it has no traditional REPL. Input is
forwarded unchanged with `{ "type": "input", "data": "print(1 + 1)\r" }`;
stopping sends `{ "type": "stop" }`. A terminal resize can be sent as
`{ "type": "resize", "cols": 80, "rows": 24 }`. Server events have `type`
`started`, `stdout`, `stderr`, `error`, or `exit`. The process is killed when
the session is stopped or the socket closes. Local binaries are preferred,
while Docker mode uses the same network-disabled CPU, memory, and PID limits
as one-shot execution.

Interactive processes use Bun's built-in `Bun.Terminal` PTY with an initial
80x24 `xterm-256color` terminal. This is deliberately separate from the
pipe-based one-shot runner. PTY output is emitted once through the existing
`stdout` event, and WebSocket input is written directly to the PTY; the
frontend does not manually echo or rewrite carriage returns. Docker REPLs
use `-it` so the container remains attached to the outer PTY.

REPL output is presentation-only. It never enters `parseSource`, saved source
state, `SourceConfig`, or the deterministic Observer pipeline.

The browser-side runner client is split into focused modules:

```text
src/runner/
├── constants.ts  loopback URL and supported REPL languages
├── types.ts      run, output, and WebSocket message contracts
├── run.ts        one-shot /api/run client
├── websocket.ts  REPL WebSocket lifecycle and input transport
└── terminal.tsx  xterm instance, onData handler, and output rendering
```

`terminal.tsx` creates one xterm instance per mounted panel, registers
`terminal.onData`, focuses it after initialization, fits it with
`xterm-addon-fit`, preserves a 5,000-line scrollback buffer, and forwards raw
keystrokes and paste data without requiring a separate HTML input field. Output
autoscrolls only when the user is already at the bottom, so manual scrolling is
preserved. Selection is copyable with Ctrl/Cmd+C, and Ctrl+L clears the local
terminal view without sending that control character to the REPL.

### 6.4 Language command mapping

| Language | Local command | Docker image | Docker command |
|---|---|---|---|
| Elixir | `elixir <entry>` | `elixir:1.18-alpine` | `elixir <entry>` |
| Python | `python3 <entry>` | `python:3.12-alpine` | `python <entry>` |
| Node.js | `node <entry>` | `node:22-alpine` | `node <entry>` |
| Bun | `bun <entry>` | `oven/bun:1.4-alpine` | `bun <entry>` |
| Odin | `<odin> run <entry> -file` | `odin:dev` | `odin run <entry> -file` |

The Odin executable is selected in this order:

1. `EDITOR_RUNNER_ODIN_PATH`, if configured;
2. `/home/dida/Odin/odin`, when present;
3. `odin` from `PATH`.

The Odin `-file` flag is required for a standalone `.odin` entry file rather
than a package directory.

## 7. Runner processing sequence

For every valid request, `runner-server.ts`:

1. validates the request schema and allowed file names;
2. clamps the timeout;
3. creates a random temporary workspace;
4. writes all submitted files into that workspace;
5. selects local or Docker mode from `EDITOR_RUNNER_COMMAND`;
6. selects the command from a fixed language mapping;
7. starts the noninteractive child process with stdout and stderr pipes;
8. races process completion against the timeout;
9. returns output, exit code, and timeout state;
10. removes the temporary workspace.

Only the requested entry file is passed directly to the runtime. Other staged
files remain available for imports or language-specific references.

## 8. Security controls

The following constraints must remain true:

- runner binds only to `127.0.0.1`;
- browser does not spawn processes;
- browser does not collect SSH passwords or private keys;
- SSH remains disabled until a trusted server-side bridge exists;
- language and command selection use fixed allowlists;
- Docker images are fixed in source, not supplied by the browser;
- Docker uses `--network none`;
- Docker uses CPU, memory, and PID limits;
- temporary workspaces are random and removed after execution;
- file names reject traversal and path separators;
- file contents have a size limit;
- timeouts are clamped;
- CORS accepts only the local application origins;
- source edits affect the simulation only after Save.

## 9. Health endpoint and operations

`GET http://127.0.0.1:7777/health` returns availability per language:

```json
{
  "ok": true,
  "host": "127.0.0.1",
  "languages": {
    "odin": {
      "image": "odin:dev",
      "mode": "local",
      "available": true
    }
  }
}
```

Start the application and runner together:

```bash
bun install
bun run dev:all
```

Or start them separately:

```bash
bun run dev
bun run editor-server
```

Use Docker mode when local binaries are unavailable:

```bash
EDITOR_RUNNER_COMMAND=docker bun run editor-server
```

Docker images must already exist locally. Odin can be configured explicitly:

```bash
EDITOR_RUNNER_ODIN_PATH=/path/to/odin bun run editor-server
```

## 10. Validation checklist

Before shipping changes, run:

```bash
bun test
bun run lint
bunx tsc -p tsconfig.app.json --noEmit
bun run build
bun build --target=bun --outdir=/tmp/wire-ingest-runner-build runner-server.ts
```

Manual runner checks should include:

- `/health` reports expected language availability;
- valid requests for all installed runtimes;
- missing language returns 400;
- traversal names such as `../main.py` return 400;
- oversized files return 400;
- timeout returns `timedOut: true`;
- browser receives a clear 503 when a runtime is unavailable.

## 11. Known limitations and future work

- Runner output is collected until completion rather than streamed incrementally
  to xterm.js.
- Docker Odin requires a locally built or retagged `odin:dev` image.
- The parser is intentionally heuristic and should not be treated as a
  language compiler.
- A future SSH feature must be a trusted server-side bridge with host-key
  verification, target allowlisting, authentication policy, and audit/timeout
  controls. Credentials must never be placed in browser state.
