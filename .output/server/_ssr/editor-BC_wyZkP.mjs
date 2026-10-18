import { n as __toESM } from "../_runtime.mjs";
import { n as require_react, t as Ft } from "../_libs/monaco-editor__react+react.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as resetSource, d as useLab, f as useSavedSource, l as saveSource, n as LanguageSelect, s as parseSource, u as setLab } from "./LabControls-AesVRdjq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/editor-BC_wyZkP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RUNNER_URL = {
	"BASE_URL": "/",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": true,
	"TSS_DEV_SERVER": "false",
	"TSS_DEV_SSR_STYLES_BASEPATH": "/",
	"TSS_DEV_SSR_STYLES_ENABLED": "true",
	"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
	"TSS_INLINE_CSS_ENABLED": "false",
	"TSS_ROUTER_BASEPATH": "",
	"TSS_SERVER_FN_BASE": "/_serverFn/"
}["VITE_EDITOR_RUNNER_URL"] ?? "http://127.0.0.1:7777";
var REPL_LANGUAGES = /* @__PURE__ */ new Set([
	"elixir",
	"python",
	"nodejs"
]);
function replUrl() {
	return `${RUNNER_URL.replace(/^http/, "ws")}/api/repl`;
}
async function runSource(input) {
	const response = await fetch(`${RUNNER_URL}/api/run`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
		signal: AbortSignal.timeout(35e3)
	});
	return {
		response,
		output: await response.json().catch(() => ({}))
	};
}
function renderMessage(terminal, message, onWrite) {
	const write = (data) => terminal.write(data, onWrite);
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
		case "exit": terminal.writeln(`\r\nREPL exited with code ${message.exitCode}`, onWrite);
	}
}
async function copyText(text) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
	} catch {}
	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	textarea.style.top = "0";
	document.body.appendChild(textarea);
	try {
		textarea.select();
		if (!document.execCommand("copy")) throw new Error("Clipboard copy failed.");
	} finally {
		textarea.remove();
	}
}
function copySelection(terminal) {
	if (!terminal.hasSelection()) return;
	const selection = terminal.getSelection();
	if (!selection) return;
	copyText(selection).catch((error) => {
		console.error("Unable to copy terminal selection:", error);
	});
}
function TerminalPanel({ active, onInput, onResize, messages, streamKey }) {
	const hostRef = (0, import_react.useRef)(null);
	const terminalRef = (0, import_react.useRef)(null);
	const inputDisposableRef = (0, import_react.useRef)(null);
	const fitRef = (0, import_react.useRef)(null);
	const onInputRef = (0, import_react.useRef)(onInput);
	const onResizeRef = (0, import_react.useRef)(onResize);
	const activeRef = (0, import_react.useRef)(active);
	const messagesRef = (0, import_react.useRef)(messages);
	const streamKeyRef = (0, import_react.useRef)(streamKey);
	const renderedCountRef = (0, import_react.useRef)(0);
	const renderedStreamKeyRef = (0, import_react.useRef)(streamKey);
	onInputRef.current = onInput;
	onResizeRef.current = onResize;
	activeRef.current = active;
	messagesRef.current = messages;
	streamKeyRef.current = streamKey;
	(0, import_react.useEffect)(() => {
		let disposed = false;
		let instance = null;
		let fit = null;
		let resizeObserver = null;
		let resizeDisposable = null;
		let contextMenuHandler = null;
		async function initialize() {
			try {
				const [{ Terminal: Xterm }, { FitAddon: Fit }] = await Promise.all([import("../_libs/xterm.mjs").then((n) => /* @__PURE__ */ __toESM(n.t())), import("../_libs/xterm-addon-fit.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()))]);
				if (disposed || !hostRef.current) return;
				const terminal = new Xterm({
					convertEol: true,
					cursorBlink: true,
					scrollback: 5e3,
					scrollOnUserInput: true,
					disableStdin: false,
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 12,
					theme: {
						background: "#101318",
						foreground: "#d4d4d4",
						cursor: "#d4d4d4",
						selectionBackground: "#264f78"
					}
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
					if (modifierPressed && key === "c" && terminal.hasSelection()) {
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
				if (activeRef.current) onResizeRef.current?.(terminal.cols, terminal.rows);
				contextMenuHandler = (event) => {
					if (!terminal.hasSelection()) return;
					event.preventDefault();
					copySelection(terminal);
				};
				terminal.element?.addEventListener("contextmenu", contextMenuHandler);
				resizeObserver = new ResizeObserver(() => {
					try {
						fitRef.current?.fit();
					} catch {}
				});
				resizeObserver.observe(hostRef.current);
				const currentStreamKey = streamKeyRef.current;
				terminal.clear();
				for (const message of messagesRef.current) renderMessage(terminal, message);
				terminal.scrollToBottom();
				renderedCountRef.current = messagesRef.current.length;
				renderedStreamKeyRef.current = currentStreamKey;
				if (activeRef.current) terminal.focus();
			} catch (error) {
				if (!disposed) console.error("Failed to initialize terminal:", error);
			}
		}
		initialize();
		return () => {
			disposed = true;
			resizeObserver?.disconnect();
			if (contextMenuHandler) instance?.element?.removeEventListener("contextmenu", contextMenuHandler);
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
	(0, import_react.useEffect)(() => {
		const terminal = terminalRef.current;
		if (!terminal) return;
		if (renderedStreamKeyRef.current !== streamKey) {
			terminal.clear();
			renderedCountRef.current = 0;
			renderedStreamKeyRef.current = streamKey;
		}
		if (messages.length < renderedCountRef.current) {
			terminal.clear();
			renderedCountRef.current = 0;
		}
		const pending = messages.slice(renderedCountRef.current);
		for (const message of pending) {
			const buffer = terminal.buffer.active;
			const wasAtBottom = buffer.viewportY >= buffer.baseY - 1;
			renderMessage(terminal, message, () => {
				if (wasAtBottom) terminal.scrollToBottom();
			});
		}
		renderedCountRef.current = messages.length;
	}, [messages, streamKey]);
	(0, import_react.useEffect)(() => {
		const terminal = terminalRef.current;
		if (!active || !terminal) return;
		const timeoutId = window.setTimeout(() => {
			terminalRef.current?.focus();
		}, 50);
		return () => window.clearTimeout(timeoutId);
	}, [active]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: hostRef,
		className: "terminal min-h-0 min-w-0 flex-1 overflow-hidden px-3 pb-3",
		role: "log",
		"aria-live": "polite"
	});
}
var ReplClient = class {
	socket = null;
	handlers;
	pending = [];
	constructor(handlers) {
		this.handlers = handlers;
	}
	connect() {
		if (this.socket) return;
		const socket = new WebSocket(replUrl());
		this.socket = socket;
		socket.onopen = () => {
			this.handlers.onStatus?.("open");
			for (const message of this.pending.splice(0)) socket.send(message);
		};
		socket.onmessage = (event) => {
			try {
				this.handlers.onMessage(JSON.parse(event.data));
			} catch {
				this.handlers.onMessage({
					type: "error",
					error: "Terminal returned an invalid message"
				});
			}
		};
		socket.onerror = () => this.handlers.onStatus?.("error");
		socket.onclose = () => {
			if (this.socket === socket) this.socket = null;
			this.pending.length = 0;
			this.handlers.onStatus?.("closed");
		};
	}
	sendMessage(message) {
		const encoded = JSON.stringify(message);
		if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(encoded);
		else {
			this.pending.push(encoded);
			this.connect();
		}
	}
	create(options) {
		this.sendMessage({
			type: "create",
			...options
		});
	}
	/** Compatibility helper for the original single-REPL editor flow. */
	start(language, sessionId = "default") {
		this.create({
			sessionId,
			terminalType: "repl",
			language,
			name: `${language} REPL`
		});
	}
	send(data, sessionId = "default") {
		if (data.length > 65536) return;
		this.sendMessage({
			type: "input",
			sessionId,
			data
		});
	}
	resize(cols, rows, sessionId = "default") {
		this.sendMessage({
			type: "resize",
			sessionId,
			cols,
			rows
		});
	}
	stop(sessionId = "default") {
		this.sendMessage({
			type: "stop",
			sessionId
		});
	}
	close(sessionId = "default") {
		this.sendMessage({
			type: "close",
			sessionId
		});
	}
	restart(sessionId = "default") {
		this.sendMessage({
			type: "restart",
			sessionId
		});
	}
	dispose() {
		this.pending.length = 0;
		this.socket?.close();
		this.socket = null;
	}
};
var MONACO_LANGUAGES = {
	elixir: "elixir",
	python: "python",
	nodejs: "typescript",
	odin: "odin"
};
var fileNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
function configureMonaco(monaco) {
	if (!monaco.languages.getLanguages().some(({ id }) => id === "odin")) {
		monaco.languages.register({
			id: "odin",
			extensions: [".odin"]
		});
		monaco.languages.setMonarchTokensProvider("odin", {
			defaultToken: "",
			tokenPostfix: ".odin",
			keywords: [
				"package",
				"import",
				"foreign",
				"proc",
				"struct",
				"enum",
				"union",
				"map",
				"dynamic",
				"if",
				"else",
				"for",
				"switch",
				"case",
				"defer",
				"return",
				"break",
				"continue",
				"do",
				"where",
				"when",
				"in",
				"or_else",
				"or_return",
				"distinct",
				"using",
				"context",
				"in",
				"not_in"
			],
			typeKeywords: [
				"bool",
				"string",
				"cstring",
				"rune",
				"byte",
				"int",
				"uint",
				"i8",
				"i16",
				"i32",
				"i64",
				"i128",
				"u8",
				"u16",
				"u32",
				"u64",
				"u128",
				"f16",
				"f32",
				"f64",
				"complex32",
				"complex64",
				"quaternion64",
				"rawptr",
				"uintptr",
				"any"
			],
			tokenizer: {
				root: [
					[/[a-zA-Z_][\w]*/, { cases: {
						"@typeKeywords": "type",
						"@keywords": "keyword",
						"@default": "identifier"
					} }],
					[/[A-Z][\w]*/, "type.identifier"],
					[/[{}()[\]]/, "@brackets"],
					[/[;,.]/, "delimiter"],
					[/[-+*\u002f%=!<>:&|?~^]+/, "operator"],
					[/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
					[/\d+/, "number"],
					[/"([^"\\]|\\.)*"/, "string"],
					[/'([^'\\]|\\.)*'/, "string"],
					[/\u002f\u002f.*$/, "comment"],
					[
						/\u002f[*]/,
						"comment",
						"@comment"
					]
				],
				comment: [
					[/[^/*]+/, "comment"],
					[
						/[*]\u002f/,
						"comment",
						"@pop"
					],
					[/[/*]/, "comment"]
				]
			}
		});
	}
	monaco.editor.defineTheme("wire-ingest-dark", {
		base: "vs-dark",
		inherit: true,
		rules: [
			{
				token: "keyword.odin",
				foreground: "C586C0"
			},
			{
				token: "type.odin",
				foreground: "4EC9B0"
			},
			{
				token: "type.identifier.odin",
				foreground: "4FC1FF"
			},
			{
				token: "identifier.odin",
				foreground: "D4D4D4"
			},
			{
				token: "string.odin",
				foreground: "CE9178"
			},
			{
				token: "number.odin",
				foreground: "B5CEA8"
			},
			{
				token: "number.float.odin",
				foreground: "B5CEA8"
			},
			{
				token: "comment.odin",
				foreground: "6A9955"
			},
			{
				token: "operator.odin",
				foreground: "D4D4D4"
			}
		],
		colors: { "editor.background": "#101318" }
	});
}
function EditorPage() {
	const { language } = useLab();
	const saved = useSavedSource(language);
	const [draft, setDraft] = (0, import_react.useState)(saved);
	const [active, setActive] = (0, import_react.useState)(Object.keys(saved)[0] ?? "");
	const [runnerMessages, setRunnerMessages] = (0, import_react.useState)([]);
	const [replMessages, setReplMessages] = (0, import_react.useState)([]);
	const [running, setRunning] = (0, import_react.useState)(false);
	const [replOpen, setReplOpen] = (0, import_react.useState)(false);
	const replClient = (0, import_react.useRef)(null);
	const models = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const draftRef = (0, import_react.useRef)(draft);
	draftRef.current = draft;
	(0, import_react.useEffect)(() => {
		const currentDraft = draftRef.current;
		if (Object.keys(saved).length === Object.keys(currentDraft).length && Object.entries(saved).every(([name, contents]) => currentDraft[name] === contents)) return;
		for (const model of models.current.values()) model.dispose();
		models.current.clear();
		setDraft(saved);
		setActive((a) => a in saved ? a : Object.keys(saved)[0] ?? "");
	}, [saved, language]);
	(0, import_react.useEffect)(() => () => {
		for (const model of models.current.values()) model.dispose();
		models.current.clear();
	}, []);
	const files = draft;
	const value = files[active] ?? "";
	const dirty = Object.keys(draft).length !== Object.keys(saved).length || Object.keys(draft).some((k) => draft[k] !== saved[k]);
	const preview = (0, import_react.useMemo)(() => parseSource(language, draft), [language, draft]);
	const edit = (v) => setDraft((d) => ({
		...d,
		[active]: v
	}));
	const push = (0, import_react.useCallback)((kind, text) => {
		const data = kind === "out" ? {
			type: "stdout",
			data: `${text}\n`
		} : kind === "err" ? {
			type: "stderr",
			data: `${text}\n`
		} : {
			type: "status",
			data: text
		};
		setRunnerMessages((current) => [...current.slice(-300), data]);
	}, []);
	const save = () => {
		saveSource(language, draft);
		if (!replOpen) push("sys", `Saved ${language} source. Simulation updated.`);
	};
	const stopRepl = (0, import_react.useCallback)((force = false) => {
		if (!force) push("sys", "Stopping REPL…");
		if (force) replClient.current?.dispose();
		else replClient.current?.stop();
		if (force) replClient.current = null;
		if (force) setReplOpen(false);
	}, [push]);
	(0, import_react.useEffect)(() => () => stopRepl(true), [language, stopRepl]);
	(0, import_react.useEffect)(() => () => stopRepl(true), [stopRepl]);
	const startRepl = () => {
		if (!REPL_LANGUAGES.has(language) || replClient.current) return;
		setReplMessages([]);
		push("sys", `Opening ${language} REPL…`);
		const client = new ReplClient({
			onMessage: (message) => {
				setReplMessages((current) => [...current.slice(-300), message]);
				if (message.type === "started" || message.type === "created" || message.type === "status" && message.status === "running") setReplOpen(true);
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
			}
		});
		replClient.current = client;
		client.start(language);
	};
	const addFile = () => {
		const name = window.prompt("New file name (letters, numbers, ., _, -):", "untitled.txt")?.trim();
		if (!name || !fileNamePattern.test(name) || name in draft) return;
		setDraft((d) => ({
			...d,
			[name]: ""
		}));
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
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				save();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
	const run = async () => {
		setRunning(true);
		const entry = language === "elixir" ? "main.exs" : active;
		const runFiles = draft;
		push("sys", `POST ${RUNNER_URL}/api/run  language=${language} entry=${entry}`);
		try {
			const { response: res, output: data } = await runSource({
				language,
				files: runFiles,
				entry,
				timeoutMs: 1e4
			});
			if (!res.ok) push("err", `runner error ${res.status}: ${data.error ?? res.statusText}`);
			data.stdout?.split("\n").filter(Boolean).forEach((t) => push("out", t));
			data.stderr?.split("\n").filter(Boolean).forEach((t) => push("err", t));
			if (data.timedOut) push("err", "timed out");
			if (data.exitCode !== void 0) push("sys", `exit ${data.exitCode}`);
		} catch (e) {
			push("err", `Runner unreachable at ${RUNNER_URL}. Start it locally with \`bun run editor-server\` (${e instanceof Error ? e.message : "network error"}).`);
		} finally {
			setRunning(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "grid h-[calc(100dvh-3rem)] grid-rows-[auto_1fr_200px] lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr_200px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "col-span-full flex flex-wrap items-center gap-3 border-b border-border p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LanguageSelect, {
						value: language,
						onChange: (l) => {
							if (!dirty || confirm("Discard unsaved changes?")) {
								stopRepl();
								setLab({ language: l });
							}
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `font-mono text-xs ${dirty ? "text-primary" : "text-muted-foreground"}`,
						children: dirty ? "● unsaved" : "saved"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-ghost",
								onClick: addFile,
								children: "New file"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-ghost",
								onClick: renameFile,
								disabled: !active,
								children: "Rename"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-ghost",
								onClick: deleteFile,
								disabled: !active || Object.keys(draft).length <= 1,
								children: "Delete"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-ghost",
								onClick: () => confirm("Reset this language to the default sources?") && resetSource(language),
								children: "Reset"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-primary",
								onClick: save,
								disabled: !dirty,
								children: "Save"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-ghost",
								onClick: run,
								disabled: running,
								children: running ? "Running…" : "Run in runner"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn-ghost",
								onClick: () => replOpen ? stopRepl() : startRepl(),
								disabled: !REPL_LANGUAGES.has(language) || running,
								children: replOpen ? "Stop REPL" : "Start REPL"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "hidden overflow-y-auto border-r border-border p-2 lg:block",
				"aria-label": "Source files",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "eyebrow px-2 py-1",
					children: ["src/sources/", language]
				}), Object.keys(files).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setActive(f),
					className: `file-item ${f === active ? "is-active" : ""}`,
					children: [f, draft[f] !== void 0 && draft[f] !== saved[f] ? " ●" : ""]
				}, f))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex min-h-0 min-w-0 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex overflow-x-auto border-b border-border",
					role: "tablist",
					children: Object.keys(files).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						role: "tab",
						"aria-selected": f === active,
						onClick: () => setActive(f),
						className: "tab",
						children: f
					}, f))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "code-editor min-h-0 flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ft, {
						height: "100%",
						theme: "wire-ingest-dark",
						language: MONACO_LANGUAGES[language],
						path: `wire-ingest/${language}/${active}`,
						value,
						onChange: (next) => edit(next ?? ""),
						beforeMount: configureMonaco,
						onMount: ((editor) => {
							const model = editor.getModel();
							if (model) models.current.set(`${language}/${active}`, model);
						}),
						options: {
							minimap: { enabled: false },
							automaticLayout: true,
							fontSize: 13,
							tabSize: 2
						}
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "hidden space-y-4 overflow-y-auto border-l border-border p-4 lg:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "eyebrow",
					children: "Parsed (unsaved draft)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted-foreground",
							children: "count"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: preview.acceptors }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted-foreground",
							children: "prefix"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: JSON.stringify(preview.prefix) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted-foreground",
							children: "port"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: preview.port }),
						language === "elixir" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: "active"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: preview.activeMode }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: "handoff"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: preview.handoff ? "yes" : "missing" })
						] })
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SshPanel, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "col-span-full flex min-h-0 flex-col border-t border-border terminal-pane",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-3 py-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "output"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn-ghost py-0.5",
						onClick: () => replOpen ? setReplMessages([]) : setRunnerMessages([]),
						children: "Clear"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalPanel, {
					active: replOpen,
					onInput: (data) => replClient.current?.send(data),
					onResize: (cols, rows) => replClient.current?.resize(cols, rows),
					messages: replOpen ? replMessages : runnerMessages,
					streamKey: `${language}:${replOpen ? "repl" : "runner"}`
				})]
			})
		]
	});
}
function SshPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		"aria-describedby": "ssh-note",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "eyebrow",
			children: "SSH bridge unavailable"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			id: "ssh-note",
			className: "text-[11px] leading-relaxed text-muted-foreground",
			children: "SSH is intentionally disabled. A trusted server-side bridge with host-key verification and an allowlisted target must be added before remote execution is enabled. Credentials and private keys must never enter the browser."
		})]
	});
}
//#endregion
export { EditorPage as component };
