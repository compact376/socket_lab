import { createFileRoute } from "@tanstack/react-router";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LanguageSelect } from "@/components/lab/LabControls";
import { setLab, useLab, useSavedSource } from "@/lib/lab-store";
import { parseSource } from "@/lib/source/parse";
import { resetSource, saveSource } from "@/lib/source/persist";
import type { SourceFiles } from "@/lib/source/files";
import type { Language } from "@/lib/pipeline/types";
import {
  REPL_LANGUAGES,
  RUNNER_URL,
  ReplClient,
  runSource,
  TerminalPanel,
  type ReplMessage,
} from "@/runner";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Source editor — Wire Ingest Lab" },
      { name: "description", content: "Edit the educational Elixir, Python, Node.js and Odin sources that drive the socket simulation, and run them in the local Bun runner." },
      { property: "og:title", content: "Source editor — Wire Ingest Lab" },
      { property: "og:description", content: "Multi-file workspace with local Bun runner execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorPage,
});

const MONACO_LANGUAGES: Record<Language, string> = { elixir: "elixir", python: "python", nodejs: "typescript", odin: "odin" };
const fileNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function configureMonaco(monaco: typeof Monaco) {
  if (!monaco.languages.getLanguages().some(({ id }) => id === "odin")) {
    monaco.languages.register({ id: "odin", extensions: [".odin"] });
    monaco.languages.setMonarchTokensProvider("odin", {
      defaultToken: "",
      tokenPostfix: ".odin",
      keywords: ["package", "import", "foreign", "proc", "struct", "enum", "union", "map", "dynamic", "if", "else", "for", "switch", "case", "defer", "return", "break", "continue", "do", "where", "when", "in", "or_else", "or_return", "distinct", "using", "context", "in", "not_in"],
      typeKeywords: ["bool", "string", "cstring", "rune", "byte", "int", "uint", "i8", "i16", "i32", "i64", "i128", "u8", "u16", "u32", "u64", "u128", "f16", "f32", "f64", "complex32", "complex64", "quaternion64", "rawptr", "uintptr", "any"],
      tokenizer: {
        root: [
          [/[a-zA-Z_][\w]*/, { cases: { "@typeKeywords": "type", "@keywords": "keyword", "@default": "identifier" } }],
          [/[A-Z][\w]*/, "type.identifier"],
          [/[{}()[\]]/, "@brackets"],
          [/[;,.]/, "delimiter"],
          [/[-+*\u002f%=!<>:&|?~^]+/, "operator"],
          [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
          [/\d+/, "number"],
          [/"([^"\\]|\\.)*"/, "string"],
          [/'([^'\\]|\\.)*'/, "string"],
          [/\u002f\u002f.*$/, "comment"],
          [/\u002f[*]/, "comment", "@comment"],
        ],
        comment: [
          [/[^/*]+/, "comment"],
          [/[*]\u002f/, "comment", "@pop"],
          [/[/*]/, "comment"],
        ],
      },
    });
  }
  monaco.editor.defineTheme("wire-ingest-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword.odin", foreground: "C586C0" },
      { token: "type.odin", foreground: "4EC9B0" },
      { token: "type.identifier.odin", foreground: "4FC1FF" },
      { token: "identifier.odin", foreground: "D4D4D4" },
      { token: "string.odin", foreground: "CE9178" },
      { token: "number.odin", foreground: "B5CEA8" },
      { token: "number.float.odin", foreground: "B5CEA8" },
      { token: "comment.odin", foreground: "6A9955" },
      { token: "operator.odin", foreground: "D4D4D4" },
    ],
    colors: { "editor.background": "#101318" },
  });
}

type Line = { kind: "out" | "err" | "sys"; text: string };

function EditorPage() {
  const { language } = useLab();
  const saved = useSavedSource(language);
  const [draft, setDraft] = useState<SourceFiles>(saved);
  const [active, setActive] = useState<string>(Object.keys(saved)[0] ?? "");
  const [runnerMessages, setRunnerMessages] = useState<ReplMessage[]>([]);
  const [replMessages, setReplMessages] = useState<ReplMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [replOpen, setReplOpen] = useState(false);
  const replClient = useRef<ReplClient | null>(null);
  const models = useRef(new Map<string, Monaco.editor.ITextModel>());
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Only replace the editor environment for a real external change. The save event
  // also refreshes `saved`, but must not dispose the model being edited.
  useEffect(() => {
    const currentDraft = draftRef.current;
    const sameFiles = Object.keys(saved).length === Object.keys(currentDraft).length
      && Object.entries(saved).every(([name, contents]) => currentDraft[name] === contents);
    if (sameFiles) return;
    for (const model of models.current.values()) model.dispose();
    models.current.clear();
    setDraft(saved);
    setActive((a) => a in saved ? a : (Object.keys(saved)[0] ?? ""));
  }, [saved, language]);

  useEffect(() => () => {
    for (const model of models.current.values()) model.dispose();
    models.current.clear();
  }, []);

  const files = draft;
  const value = files[active] ?? "";
  const dirty = Object.keys(draft).length !== Object.keys(saved).length
    || Object.keys(draft).some((k) => draft[k] !== saved[k]);
  const preview = useMemo(() => parseSource(language, draft), [language, draft]);
  const edit = (v: string) => setDraft((d) => ({ ...d, [active]: v }));
  const push = useCallback((kind: Line["kind"], text: string) => {
    const data: ReplMessage = kind === "out"
      ? { type: "stdout", data: `${text}\n` }
      : kind === "err"
        ? { type: "stderr", data: `${text}\n` }
        : { type: "status", data: text };
    setRunnerMessages((current) => [...current.slice(-300), data]);
  }, []);
  const save = () => {
    saveSource(language, draft);
    if (!replOpen) push("sys", `Saved ${language} source. Simulation updated.`);
  };
  const stopRepl = useCallback((force = false) => {
    if (!force) push("sys", "Stopping REPL…");
    if (force) replClient.current?.dispose();
    else replClient.current?.stop();
    if (force) replClient.current = null;
    if (force) setReplOpen(false);
  }, [push]);
  useEffect(() => () => stopRepl(true), [language, stopRepl]);
  useEffect(() => () => stopRepl(true), [stopRepl]);
  const startRepl = () => {
    if (!REPL_LANGUAGES.has(language) || replClient.current) return;
    setReplMessages([]);
    push("sys", `Opening ${language} REPL…`);
    const client = new ReplClient({
      onMessage: (message) => {
        setReplMessages((current) => [...current.slice(-300), message]);
        if (
          message.type === "started"
          || message.type === "created"
          || (message.type === "status" && message.status === "running")
        ) {
          setReplOpen(true);
        }
        if (message.type === "exit" || message.type === "error") {
          setReplOpen(false);
          replClient.current = null;
        }
      },
      onStatus: (status) => {
        if (status === "error") push("err", `Unable to connect to REPL at ${RUNNER_URL}`);
        if (status === "closed" || status === "error") {
          setReplOpen(false);
          replClient.current = null;
        }
      },
    });
    replClient.current = client;
    client.start(language as "elixir" | "python" | "nodejs");
  };
  const addFile = () => {
    const name = window.prompt("New file name (letters, numbers, ., _, -):", "untitled.txt")?.trim();
    if (!name || !fileNamePattern.test(name) || name in draft) return;
    setDraft((d) => ({ ...d, [name]: "" }));
    setActive(name);
  };
  const renameFile = () => {
    if (!active) return;
    const name = window.prompt("Rename file:", active)?.trim();
    if (!name || name === active || !fileNamePattern.test(name) || name in draft) return;
    setDraft((d) => {
      const next = { ...d };
      next[name] = next[active] ?? "";
      delete next[active];
      return next;
    });
    setActive(name);
  };
  const deleteFile = () => {
    if (!active || Object.keys(draft).length <= 1 || !window.confirm(`Delete ${active}?`)) return;
    setDraft((d) => {
      const next = { ...d };
      delete next[active];
      return next;
    });
    setActive(Object.keys(draft).find((name) => name !== active) ?? "");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const run = async () => {
    setRunning(true);
    const entry = language === "elixir" ? "main.exs" : active;
    const runFiles = draft;
    push("sys", `POST ${RUNNER_URL}/api/run  language=${language} entry=${entry}`);
    try {
      const { response: res, output: data } = await runSource({ language, files: runFiles, entry, timeoutMs: 10000 });
      if (!res.ok) push("err", `runner error ${res.status}: ${data.error ?? res.statusText}`);
      data.stdout?.split("\n").filter(Boolean).forEach((t) => push("out", t));
      data.stderr?.split("\n").filter(Boolean).forEach((t) => push("err", t));
      if (data.timedOut) push("err", "timed out");
      if (data.exitCode !== undefined) push("sys", `exit ${data.exitCode}`);
    } catch (e) {
      push("err", `Runner unreachable at ${RUNNER_URL}. Start it locally with \`bun run editor-server\` (${e instanceof Error ? e.message : "network error"}).`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="grid h-[calc(100dvh-3rem)] grid-rows-[auto_1fr_200px] lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr_200px]">
      <div className="col-span-full flex flex-wrap items-center gap-3 border-b border-border p-3">
        <LanguageSelect value={language} onChange={(l) => { if (!dirty || confirm("Discard unsaved changes?")) { stopRepl(); setLab({ language: l }); } }} />
        <span className={`font-mono text-xs ${dirty ? "text-primary" : "text-muted-foreground"}`}>{dirty ? "● unsaved" : "saved"}</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={addFile}>New file</button>
          <button className="btn-ghost" onClick={renameFile} disabled={!active}>Rename</button>
          <button className="btn-ghost" onClick={deleteFile} disabled={!active || Object.keys(draft).length <= 1}>Delete</button>
          <button className="btn-ghost" onClick={() => confirm("Reset this language to the default sources?") && resetSource(language)}>Reset</button>
          <button className="btn-primary" onClick={save} disabled={!dirty}>Save</button>
          <button className="btn-ghost" onClick={run} disabled={running}>{running ? "Running…" : "Run in runner"}</button>
          <button className="btn-ghost" onClick={() => (replOpen ? stopRepl() : startRepl())} disabled={!REPL_LANGUAGES.has(language) || running}>
            {replOpen ? "Stop REPL" : "Start REPL"}
          </button>
        </div>
      </div>

      <nav className="hidden overflow-y-auto border-r border-border p-2 lg:block" aria-label="Source files">
        <p className="eyebrow px-2 py-1">src/sources/{language}</p>
        {Object.keys(files).map((f) => (
          <button key={f} onClick={() => setActive(f)} className={`file-item ${f === active ? "is-active" : ""}`}>
            {f}{draft[f] !== undefined && draft[f] !== saved[f] ? " ●" : ""}
          </button>
        ))}
      </nav>

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="flex overflow-x-auto border-b border-border" role="tablist">
          {Object.keys(files).map((f) => (
            <button key={f} role="tab" aria-selected={f === active} onClick={() => setActive(f)} className="tab">{f}</button>
          ))}
        </div>
        <div className="code-editor min-h-0 flex-1">
          <Editor
            height="100%"
            theme="wire-ingest-dark"
            language={MONACO_LANGUAGES[language]}
            path={`wire-ingest/${language}/${active}`}
            value={value}
            onChange={(next: string | undefined) => edit(next ?? "")}
            beforeMount={configureMonaco satisfies BeforeMount}
            onMount={((editor) => {
              const model = editor.getModel();
              if (model) models.current.set(`${language}/${active}`, model);
            }) satisfies OnMount}
            options={{ minimap: { enabled: false }, automaticLayout: true, fontSize: 13, tabSize: 2 }}
          />
        </div>
      </section>

      <aside className="hidden space-y-4 overflow-y-auto border-l border-border p-4 lg:block">
        <div>
          <p className="eyebrow">Parsed (unsaved draft)</p>
          <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]">
            <dt className="text-muted-foreground">count</dt><dd>{preview.acceptors}</dd>
            <dt className="text-muted-foreground">prefix</dt><dd>{JSON.stringify(preview.prefix)}</dd>
            <dt className="text-muted-foreground">port</dt><dd>{preview.port}</dd>
            {language === "elixir" && <><dt className="text-muted-foreground">active</dt><dd>{preview.activeMode}</dd><dt className="text-muted-foreground">handoff</dt><dd>{preview.handoff ? "yes" : "missing"}</dd></>}
          </dl>
        </div>
        <SshPanel />
      </aside>

      <section className="col-span-full flex min-h-0 flex-col border-t border-border terminal-pane">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="eyebrow">output</span>
          <button
            className="btn-ghost py-0.5"
            onClick={() => (replOpen ? setReplMessages([]) : setRunnerMessages([]))}
          >
            Clear
          </button>
        </div>
        <TerminalPanel
          active={replOpen}
          onInput={(data) => replClient.current?.send(data)}
          onResize={(cols, rows) => replClient.current?.resize(cols, rows)}
          messages={replOpen ? replMessages : runnerMessages}
          streamKey={`${language}:${replOpen ? "repl" : "runner"}`}
        />
      </section>
    </main>
  );
}

function SshPanel() {
  return (
    <div className="space-y-2" aria-describedby="ssh-note">
      <p className="eyebrow">SSH bridge unavailable</p>
      <p id="ssh-note" className="text-[11px] leading-relaxed text-muted-foreground">
        SSH is intentionally disabled. A trusted server-side bridge with host-key verification and an allowlisted target must be added before remote execution is enabled. Credentials and private keys must never enter the browser.
      </p>
    </div>
  );
}
