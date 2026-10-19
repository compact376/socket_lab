import { resolve } from "node:path";

const port = Number.parseInt(Bun.env.EDITOR_RUNNER_PORT ?? "7777", 10);
const maxTimeoutMs = 30_000;
const maxReplLifetimeMs = 30 * 60_000;
const maxFileBytes = 256_000;
const maxSessionsPerSocket = 8;
const shellEnabled = Bun.env.EDITOR_RUNNER_ALLOW_SHELL === "true";
const workspaceRoot = Bun.env.EDITOR_RUNNER_WORKSPACE ?? process.cwd();
const allowedFile = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const languages = ["elixir", "python", "nodejs", "bun", "odin"] as const;
type RunnerLanguage = (typeof languages)[number];
type RunRequest = {
  language?: unknown;
  files?: Record<string, unknown>;
  entry?: unknown;
  timeoutMs?: unknown;
};
type ReplLanguage = Exclude<RunnerLanguage, "odin">;

const imageFor: Record<RunnerLanguage, string> = {
  elixir: "elixir:1.18-alpine",
  python: "python:3.12-alpine",
  nodejs: "node:22-alpine",
  bun: "oven/bun:1.4-alpine",
  odin: "odin:dev",
};

const odinBinary =
  Bun.env.EDITOR_RUNNER_ODIN_PATH ??
  (Bun.file("/home/dida/Odin/odin").size > 0 ? "/home/dida/Odin/odin" : "odin");

const localCommandFor: Record<RunnerLanguage, (entry: string) => string[]> = {
  elixir: (entry) => ["elixir", entry],
  python: (entry) => ["python3", entry],
  nodejs: (entry) => ["node", entry],
  bun: (entry) => ["bun", entry],
  odin: (entry) => [odinBinary, "run", entry, "-file"],
};

const localReplCommandFor: Record<ReplLanguage, string[]> = {
  elixir: ["iex"],
  python: ["python3", "-i"],
  nodejs: ["node", "-i"],
  bun: ["bun", "repl"],
};

function originFor(origin: string | null): string {
  return origin === "http://127.0.0.1:8080" || origin === "http://localhost:8080"
    ? origin
    : "http://localhost:8080";
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return Response.json(data, {
    status,
    headers: {
      "access-control-allow-origin": originFor(origin),
      "access-control-allow-headers": "content-type",
    },
  });
}

function cors(origin: string | null): Response {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": originFor(origin),
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function isLanguage(value: unknown): value is RunnerLanguage {
  return typeof value === "string" && languages.includes(value as RunnerLanguage);
}

function isReplLanguage(value: unknown): value is ReplLanguage {
  return value === "elixir" || value === "python" || value === "nodejs" || value === "bun";
}

function validRequest(
  body: RunRequest,
): body is Required<Pick<RunRequest, "language" | "files" | "entry">> & RunRequest {
  if (!isLanguage(body.language) || !body.files || typeof body.files !== "object" || Array.isArray(body.files))
    return false;
  if (typeof body.entry !== "string" || !allowedFile.test(body.entry)) return false;
  for (const [name, contents] of Object.entries(body.files)) {
    if (
      !allowedFile.test(name) ||
      typeof contents !== "string" ||
      new TextEncoder().encode(contents).byteLength > maxFileBytes
    )
      return false;
  }
  return body.entry in body.files;
}

function timeoutFor(value: unknown): number {
  return Math.min(maxTimeoutMs, Math.max(100, typeof value === "number" ? Math.trunc(value) : 10_000));
}

async function available(command: string[], versionArg = "--version"): Promise<boolean> {
  try {
    return (await Bun.spawn([command[0], versionArg], { stdout: "ignore", stderr: "ignore" }).exited) === 0;
  } catch {
    return false;
  }
}

async function imageAvailable(image: string): Promise<boolean> {
  try {
    return (await Bun.spawn(["docker", "image", "inspect", image], { stdout: "ignore", stderr: "ignore" }).exited) === 0;
  } catch {
    return false;
  }
}

// ---------- Docker helpers (no nested -t) ----------

function dockerRunBase(extra: string[] = []): string[] {
  return [
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "--cpus",
    "1",
    "--memory",
    "256m",
    "--pids-limit",
    "64",
    ...extra,
  ];
}

function runCommand(language: RunnerLanguage, entry: string, useDocker: boolean, dir: string): string[] {
  const local = localCommandFor[language](entry);
  if (!useDocker) return local;

  return [
    ...dockerRunBase([
      "-v",
      `${dir}:/workspace:ro`,
      "-w",
      "/workspace",
      "--entrypoint",
      local[0],
    ]),
    imageFor[language],
    ...local.slice(1),
  ];
}

function replCommand(language: ReplLanguage, useDocker: boolean): string[] {
  const local = localReplCommandFor[language];
  if (!useDocker) return local;

  // Critical: only -i, never -t. Nested TTY with Bun.Terminal causes the hang.
  return [
    ...dockerRunBase([
      "-i",
      "-e",
      "TERM=xterm-256color",
      "--entrypoint",
      local[0],
    ]),
    imageFor[language],
    ...local.slice(1),
  ];
}

function shellCommand(useDocker: boolean): string[] {
  if (!useDocker) return [Bun.env.SHELL || "bash", "-i"];

  return [
    ...dockerRunBase([
      "-i",
      "-e",
      "TERM=xterm-256color",
      "-v",
      `${workspaceRoot}:/workspace:rw`,
      "-w",
      "/workspace",
      "--entrypoint",
      "/bin/sh",
    ]),
    "python:3.12-alpine",
    "-i",
  ];
}

// ---------- WebSocket / session helpers ----------

function sendRepl(ws: Bun.ServerWebSocket<ReplSocketData>, type: string, payload: Record<string, unknown> = {}) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

type ReplSocketData = {
  sessions: Map<string, ReplSession>;
  starting: Set<string>;
  closed?: boolean;
};

type ReplSession = {
  child?: ReturnType<typeof Bun.spawn>;
  terminal?: Bun.Terminal;
  language?: ReplLanguage;
  terminalType: "shell" | "repl";
  cwd: string;
  timer?: ReturnType<typeof setTimeout>;
  stopping?: boolean;
  exitReported?: boolean;
};

function sendSession(
  ws: Bun.ServerWebSocket<ReplSocketData>,
  type: string,
  sessionId: string,
  payload: Record<string, unknown> = {},
) {
  sendRepl(ws, type, { sessionId, ...payload });
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function sessionCwd(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return workspaceRoot;
  const resolved = resolve(workspaceRoot, value);
  return resolved === workspaceRoot || resolved.startsWith(`${workspaceRoot}/`) ? resolved : workspaceRoot;
}

async function stopSession(
  ws: Bun.ServerWebSocket<ReplSocketData>,
  sessionId: string,
  notify = true,
): Promise<void> {
  const session = ws.data.sessions.get(sessionId);
  if (!session || session.stopping) return;

  session.stopping = true;
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = undefined;
  }

  const child = session.child;
  if (child) child.kill();

  const exitCode = child ? await child.exited.catch(() => null) : null;

  try {
    session.terminal?.close();
  } catch {
    // ignore
  }

  ws.data.sessions.delete(sessionId);

  if (notify && !session.exitReported) {
    session.exitReported = true;
    sendSession(ws, "exit", sessionId, { exitCode });
  }
}

async function startSession(
  ws: Bun.ServerWebSocket<ReplSocketData>,
  request: {
    sessionId: string;
    terminalType: "shell" | "repl";
    language?: unknown;
    cwd?: unknown;
    name?: unknown;
  },
) {
  const { sessionId } = request;

  if (ws.data.sessions.has(sessionId) || ws.data.starting.has(sessionId)) return;

  if (ws.data.sessions.size + ws.data.starting.size >= maxSessionsPerSocket) {
    sendRepl(ws, "error", { error: `Maximum of ${maxSessionsPerSocket} terminals per connection` });
    return;
  }

  if (request.terminalType === "shell" && !shellEnabled) {
    sendSession(ws, "error", sessionId, {
      error: "Shell terminals are disabled. Set EDITOR_RUNNER_ALLOW_SHELL=true for a local trusted workspace.",
    });
    return;
  }

  const language = request.language;
  if (request.terminalType === "repl" && !isReplLanguage(language)) {
    sendSession(ws, "error", sessionId, {
      error: "REPL is available only for Elixir, Python, Node.js, and Bun",
    });
    return;
  }

  const useDocker = Bun.env.EDITOR_RUNNER_COMMAND === "docker";
  const command =
    request.terminalType === "shell"
      ? shellCommand(useDocker)
      : replCommand(language as ReplLanguage, useDocker);

  ws.data.starting.add(sessionId);

  if (!useDocker && !(await available(command, "--version"))) {
    ws.data.starting.delete(sessionId);
    sendSession(ws, "error", sessionId, {
      error: `${request.terminalType === "shell" ? "Shell" : language} runtime is unavailable`,
    });
    return;
  }

  if (ws.data.closed) {
    ws.data.starting.delete(sessionId);
    return;
  }

  const session: ReplSession = {
    language: request.terminalType === "repl" ? (language as ReplLanguage) : undefined,
    terminalType: request.terminalType,
    cwd: sessionCwd(request.cwd),
  };
  ws.data.sessions.set(sessionId, session);

  try {
    const decoder = new TextDecoder();
    session.terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      name: "xterm-256color",
      data: (_pty, bytes) => {
        if (ws.data.closed) return;
        const data = decoder.decode(bytes, { stream: true });
        if (data) sendSession(ws, "output", sessionId, { data });
      },
    });

    session.child = Bun.spawn(command, {
      terminal: session.terminal,
      cwd: useDocker ? undefined : session.cwd,
    });

    session.timer = setTimeout(() => {
      sendSession(ws, "error", sessionId, {
        error: `Terminal lifetime exceeded ${maxReplLifetimeMs}ms`,
      });
      void stopSession(ws, sessionId);
    }, maxReplLifetimeMs);

    sendSession(ws, "created", sessionId, {
      terminalType: request.terminalType,
      language: session.language,
      name:
        typeof request.name === "string" && request.name.trim()
          ? request.name.trim().slice(0, 80)
          : undefined,
    });
    sendSession(ws, "status", sessionId, {
      status: "running",
      data: `${command[0]} started`,
    });

    const exitCode = await session.child.exited.catch(() => null);

    // Only report exit if we still own this session (stopSession may have raced)
    if (ws.data.sessions.get(sessionId) === session && !session.exitReported) {
      if (session.timer) clearTimeout(session.timer);
      try {
        session.terminal.close();
      } catch {
        // ignore
      }
      ws.data.sessions.delete(sessionId);
      session.exitReported = true;
      sendSession(ws, "exit", sessionId, { exitCode });
    }
  } catch (error) {
    if (session.timer) clearTimeout(session.timer);
    try {
      session.terminal?.close();
    } catch {
      // ignore
    }
    ws.data.sessions.delete(sessionId);
    sendSession(ws, "error", sessionId, {
      error: error instanceof Error ? error.message : "failed to start terminal",
    });
  } finally {
    ws.data.starting.delete(sessionId);
  }
}

// ---------- One-shot /api/run ----------

async function run(request: RunRequest, origin: string | null): Promise<Response> {
  if (!validRequest(request)) {
    return json(
      { error: "language, files and entry are required; file names must be simple names" },
      400,
      origin,
    );
  }

  const language = request.language as RunnerLanguage;
  const timeoutMs = timeoutFor(request.timeoutMs);
  const dir = `/tmp/wire-ingest-run-${crypto.randomUUID()}`;
  await Bun.spawn(["mkdir", "-p", dir]).exited;

  try {
    await Promise.all(
      Object.entries(request.files).map(([name, contents]) =>
        Bun.write(`${dir}/${name}`, contents as string),
      ),
    );

    const useDocker = Bun.env.EDITOR_RUNNER_COMMAND === "docker";
    const command = runCommand(language, request.entry, useDocker, dir);

    if (!useDocker && !(await available(command, language === "odin" ? "version" : "--version"))) {
      const hint =
        language === "odin"
          ? "set EDITOR_RUNNER_ODIN_PATH to the Odin executable or use EDITOR_RUNNER_COMMAND=docker"
          : "use EDITOR_RUNNER_COMMAND=docker";
      return json({ error: `${language} runner is not installed locally; ${hint}` }, 503, origin);
    }

    const child = Bun.spawn(command, {
      cwd: useDocker ? undefined : dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]).then(([stdout, stderr, exitCode]) => ({
        stdout,
        stderr,
        exitCode,
        timedOut: false as const,
      })),
      new Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: true }>((resolve) => {
        timer = setTimeout(() => {
          child.kill();
          resolve({
            stdout: "",
            stderr: `runner timed out after ${timeoutMs}ms`,
            exitCode: 124,
            timedOut: true,
          });
        }, timeoutMs);
      }),
    ]);

    if (timer) clearTimeout(timer);
    return json(result, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "runner failed" }, 500, origin);
  } finally {
    await Bun.spawn(["rm", "-rf", dir]).exited;
  }
}

// ---------- Server ----------

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  websocket: {
    open: (ws) => {
      ws.data.sessions = new Map();
      ws.data.starting = new Set();
    },
    message: (ws, message) => {
      if (typeof message !== "string") return;
      try {
        if (message.length > 64 * 1024) {
          sendRepl(ws, "error", { error: "REPL message is too large" });
          return;
        }
        const data = JSON.parse(message) as {
          type?: unknown;
          data?: unknown;
          language?: unknown;
          cols?: unknown;
          rows?: unknown;
          sessionId?: unknown;
          terminalType?: unknown;
          cwd?: unknown;
          name?: unknown;
        };
        const sessionId = validSessionId(data.sessionId) ? data.sessionId : "default";
        const session = ws.data.sessions.get(sessionId);

        if ((data.type === "create" || data.type === "start") && !session) {
          void startSession(ws, {
            sessionId,
            terminalType: data.type === "start" ? "repl" : data.terminalType === "shell" ? "shell" : "repl",
            language: data.language,
            cwd: data.cwd,
            name: data.name,
          });
        } else if (data.type === "input" && typeof data.data === "string" && session?.terminal) {
          if (data.data.length <= 64 * 1024) session.terminal.write(data.data);
        } else if (
          data.type === "resize" &&
          session?.terminal &&
          typeof data.cols === "number" &&
          typeof data.rows === "number" &&
          Number.isInteger(data.cols) &&
          Number.isInteger(data.rows) &&
          data.cols >= 1 &&
          data.cols <= 300 &&
          data.rows >= 1 &&
          data.rows <= 200
        ) {
          session.terminal.resize(data.cols, data.rows);
        } else if (data.type === "stop" || data.type === "close") {
          void stopSession(ws, sessionId);
        } else if (data.type === "restart" && session) {
          void stopSession(ws, sessionId, false).then(() =>
            startSession(ws, {
              sessionId,
              terminalType: session.terminalType,
              language: session.language,
              cwd: session.cwd,
            }),
          );
        }
      } catch {
        sendRepl(ws, "error", { error: "REPL message must be valid JSON" });
      }
    },
    close: (ws) => {
      ws.data.closed = true;
      for (const sessionId of ws.data.sessions.keys()) void stopSession(ws, sessionId, false);
    },
  },
  fetch: async (request) => {
    if (request.method === "OPTIONS") return cors(request.headers.get("origin"));
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      const availableLanguages = Object.fromEntries(
        await Promise.all(
          languages.map(async (language) => [
            language,
            {
              image: imageFor[language],
              mode: Bun.env.EDITOR_RUNNER_COMMAND === "docker" ? "docker" : "local",
              available:
                Bun.env.EDITOR_RUNNER_COMMAND === "docker"
                  ? await imageAvailable(imageFor[language])
                  : await available(
                      localCommandFor[language]("x"),
                      language === "odin" ? "version" : "--version",
                    ),
            },
          ]),
        ),
      );
      return json({ ok: true, host: "127.0.0.1", languages: availableLanguages });
    }

    if (request.method === "GET" && url.pathname === "/api/repl") {
      if (server.upgrade(request, { data: { closed: false, sessions: new Map(), starting: new Set() } }))
        return undefined;
      return json({ error: "websocket upgrade required" }, 426, request.headers.get("origin"));
    }

    if (request.method !== "POST" || url.pathname !== "/api/run") return json({ error: "not found" }, 404);

    try {
      return await run((await request.json()) as RunRequest, request.headers.get("origin"));
    } catch {
      return json({ error: "request body must be valid JSON" }, 400);
    }
  },
});

console.log(`Editor runner listening on http://127.0.0.1:${server.port}`);
