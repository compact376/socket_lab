import { n as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/monaco-editor__react+react.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as hierarchy, t as tree_default } from "../_libs/d3-hierarchy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ObserverGraph-8WsDs-a5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var n = (id, label, kind, detail, children) => ({
	id,
	label,
	kind,
	detail,
	children
});
/** Kernel chain as a nested path so d3.tree lays it out left→right. */
function kernelBranch(runtime) {
	const chain = [
		[
			"nic",
			"NIC",
			"hw",
			"Network interface card: receives frames, verifies FCS."
		],
		[
			"dma",
			"DMA ring",
			"hw",
			"Descriptor ring in RAM filled by the NIC without CPU copies."
		],
		[
			"irq",
			"IRQ",
			"kernel",
			"MSI-X interrupt; top half schedules NAPI."
		],
		[
			"napi",
			"SoftIRQ/NAPI",
			"kernel",
			"Batched polling of the RX ring in NET_RX_SOFTIRQ."
		],
		[
			"skb",
			"sk_buff",
			"kernel",
			"Kernel packet buffer; IP/TCP processing and socket lookup."
		],
		[
			"sock",
			"struct sock",
			"kernel",
			"Per-connection kernel socket with receive queue."
		],
		[
			"fdt",
			"FD table",
			"kernel",
			"Process file-descriptor table; user space sees an int."
		],
		[
			"accept_q",
			"accept queue",
			"queue",
			"Completed connections waiting for accept()."
		],
		[
			"poll",
			"epoll/kqueue",
			"kernel",
			"Readiness notification that wakes the runtime."
		]
	];
	let node = runtime;
	for (let i = chain.length - 1; i >= 0; i--) {
		const [id, label, kind, detail] = chain[i];
		node = n(id, label, kind, detail, [node]);
	}
	return node;
}
function elixir(cfg) {
	const accs = Array.from({ length: cfg.acceptors }, (_, i) => n(`acc_sup_${i}`, `AcceptorSup ${i}`, "sup", "Supervises one acceptor and its DynamicSupervisor (rest_for_one).", [n(`acceptor_${i}`, `Acceptor ${i}`, "worker", "Loops on :gen_tcp.accept/1 against the shared listen socket."), n(`dyn_sup_${i}`, `DynSup ${i}`, "sup", "DynamicSupervisor that starts :temporary connection handlers.", [n(`handler_${i}`, `Handler ${i}`, "handler", "GenServer that owns the socket after controlling_process/2.")])]));
	return n("app", "WireIngest.App", "sup", "OTP application root supervisor (one_for_one).", [n("server", "TI.Server", "sup", "ThousandIsland.Server supervisor.", [n("listener", "Listener", "worker", `Owns the listen socket on port ${cfg.port}.`), n("pool_sup", "AcceptorPoolSup", "sup", `Starts ${cfg.acceptors} acceptor supervisors.`, accs)])]);
}
function python(cfg) {
	return n("loop", "asyncio loop", "loop", "Single-threaded event loop; _run_once drives selector + ready queue.", [
		n("selector", "selector", "kernel", "selectors.EpollSelector wrapping epoll."),
		n("server", "asyncio.Server", "worker", `Listening socket, backlog ${cfg.acceptors}.`, [n("transport", "Transport", "worker", "_SelectorSocketTransport owning the client FD.", [n("task", "Task(handle)", "handler", "Coroutine awaiting StreamReader.readline().")])]),
		n("ready", "ready queue", "queue", "Callbacks scheduled with call_soon.")
	]);
}
function nodejs(cfg) {
	return n("uv_loop", "libuv loop", "loop", "Main-thread event loop (timers → poll → check → close).", [
		n("uv_poll", "poll phase", "kernel", "epoll_wait on the loop thread — TCP readiness lives here."),
		n("server", "net.Server", "worker", `uv_tcp_t listener, maxConnections ${cfg.acceptors}.`, [n("callbacks", "V8 callback", "loop", "JS listener invoked via C++ binding; microtasks drain after.", [n("socket", "net.Socket", "handler", "Duplex stream emitting data / end / error.")])]),
		n("threadpool", "threadpool", "queue", "fs/dns/crypto only — not used for TCP reads.")
	]);
}
function odin(cfg) {
	const threads = Array.from({ length: cfg.acceptors }, (_, i) => n(`thread_${i}`, `OS thread ${i}`, "worker", "Pool worker thread blocking in recv.", [n(`handler_${i}`, `handle_client`, "handler", "Owns the raw fd; defer net.close.")]));
	return n("process", "process", "sup", "Native process; no runtime scheduler.", [n("listener", "listener fd", "worker", `TCP_Socket listening on ${cfg.port}.`, [n("accept_loop", "accept loop", "loop", "Main thread blocking in accept_tcp.")]), n("pool", "thread.Pool", "sup", `${cfg.acceptors} OS threads.`, threads)]);
}
var LAYOUTS = {
	elixir,
	python,
	nodejs,
	odin
};
function buildGraph(language, cfg) {
	return kernelBranch(LAYOUTS[language](cfg));
}
var NODE_W = 132;
var NODE_H = 30;
function prune(node, collapsed) {
	if (collapsed.has(node.id)) return {
		...node,
		children: void 0
	};
	return {
		...node,
		children: node.children?.map((c) => prune(c, collapsed))
	};
}
function ObserverGraph({ currentStep, config, interactive = true }) {
	const full = (0, import_react.useMemo)(() => buildGraph(currentStep.language, config), [currentStep.language, config]);
	const [collapsed, setCollapsed] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [restarting, setRestarting] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [t, setT] = (0, import_react.useState)({
		x: 0,
		y: 0,
		k: 1
	});
	const wrap = (0, import_react.useRef)(null);
	const drag = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		setCollapsed(/* @__PURE__ */ new Set());
		setSelected(null);
	}, [currentStep.language]);
	const rowGap = config.acceptors > 30 ? 34 : 44;
	const layout = (0, import_react.useMemo)(() => {
		const root = hierarchy(prune(full, collapsed));
		const pts = tree_default().nodeSize([rowGap, 166])(root);
		const nodes = pts.descendants();
		let minX = Infinity, maxX = -Infinity, maxY = 0;
		for (const p of nodes) {
			minX = Math.min(minX, p.x);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
		return {
			nodes,
			links: pts.links(),
			minX,
			maxX,
			width: maxY + NODE_W,
			height: maxX - minX + NODE_H
		};
	}, [
		full,
		collapsed,
		rowGap
	]);
	const fit = (0, import_react.useCallback)(() => {
		const el = wrap.current;
		if (!el) return;
		const { clientWidth: w, clientHeight: h } = el;
		const k = Math.min(1.2, (w - 32) / layout.width, (h - 32) / layout.height);
		setT({
			k,
			x: (w - layout.width * k) / 2,
			y: (h - layout.height * k) / 2 - layout.minX * k + NODE_H / 2 * k
		});
	}, [layout]);
	(0, import_react.useEffect)(() => {
		fit();
		const el = wrap.current;
		if (!el) return;
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(fit);
		ro.observe(el);
		return () => ro.disconnect();
	}, [fit]);
	const path = (0, import_react.useMemo)(() => new Set(currentStep.path), [currentStep.path]);
	const findById = (id) => id ? layout.nodes.find((p) => p.data.id === id) : void 0;
	const sel = findById(selected);
	const onWheel = (e) => {
		if (!interactive) return;
		const rect = wrap.current.getBoundingClientRect();
		const mx = e.clientX - rect.left, my = e.clientY - rect.top;
		setT((p) => {
			const k = Math.min(4, Math.max(.15, p.k * (e.deltaY < 0 ? 1.12 : .9)));
			return {
				k,
				x: mx - (mx - p.x) * k / p.k,
				y: my - (my - p.y) * k / p.k
			};
		});
	};
	const toggleCollapse = (id) => setCollapsed((s) => {
		const n = new Set(s);
		if (n.has(id)) n.delete(id);
		else n.add(id);
		return n;
	});
	const restart = (id) => {
		const ids = /* @__PURE__ */ new Set();
		const walk = (g) => {
			ids.add(g.id);
			g.children?.forEach(walk);
		};
		const find = (g) => g.id === id ? g : g.children?.map(find).find(Boolean);
		const target = find(full);
		if (target) walk(target);
		setRestarting(ids);
		window.setTimeout(() => setRestarting(/* @__PURE__ */ new Set()), 1600);
	};
	const cls = (p) => {
		const id = p.data.id;
		return [
			"obs-node",
			`obs-${p.data.kind}`,
			path.has(id) && "is-path",
			currentStep.ownerNode === id && "is-owner",
			currentStep.node === id && "is-active",
			selected === id && "is-selected",
			restarting.has(id) && "is-restarting"
		].filter(Boolean).join(" ");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full w-full overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: wrap,
			className: `h-full w-full touch-none ${interactive ? "cursor-grab active:cursor-grabbing" : ""}`,
			onWheel,
			onPointerDown: (e) => {
				if (interactive && e.target.tagName === "svg") {
					drag.current = {
						x: e.clientX - t.x,
						y: e.clientY - t.y
					};
					e.currentTarget.setPointerCapture(e.pointerId);
				}
			},
			onPointerMove: (e) => {
				const offset = drag.current;
				if (offset) setT((p) => ({
					...p,
					x: e.clientX - offset.x,
					y: e.clientY - offset.y
				}));
			},
			onPointerUp: () => {
				drag.current = null;
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
				className: "h-full w-full",
				role: "img",
				"aria-label": `Observer graph for ${currentStep.language}. Active: ${currentStep.title}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					transform: `translate(${t.x},${t.y}) scale(${t.k})`,
					children: [layout.links.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						className: `obs-link ${path.has(l.source.data.id) && path.has(l.target.data.id) ? "is-path" : ""}`,
						d: `M${l.source.y + NODE_W},${l.source.x}C${(l.source.y + NODE_W + l.target.y) / 2},${l.source.x} ${(l.source.y + NODE_W + l.target.y) / 2},${l.target.x} ${l.target.y},${l.target.x}`
					}, `${l.source.data.id}-${l.target.data.id}`)), layout.nodes.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
						className: cls(p),
						transform: `translate(${p.y},${p.x - NODE_H / 2})`,
						tabIndex: interactive ? 0 : -1,
						role: interactive ? "button" : void 0,
						"aria-label": `${p.data.label}${currentStep.ownerNode === p.data.id ? ", socket owner" : ""}`,
						"aria-pressed": interactive ? selected === p.data.id : void 0,
						onClick: () => interactive && setSelected(p.data.id),
						onKeyDown: (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								setSelected(p.data.id);
							}
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								width: NODE_W,
								height: NODE_H,
								rx: 4
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
								x: 10,
								y: NODE_H / 2,
								dominantBaseline: "central",
								children: [p.data.label, collapsed.has(p.data.id) ? " ▸" : ""]
							}),
							currentStep.ownerNode === p.data.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								className: "obs-owner-dot",
								cx: 122,
								cy: NODE_H / 2,
								r: 4
							})
						]
					}, p.data.id))]
				})
			})
		}), interactive && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute left-3 top-3 flex gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn-ghost",
						onClick: () => setT((p) => ({
							...p,
							k: Math.min(4, p.k * 1.2)
						})),
						"aria-label": "Zoom in",
						children: "+"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn-ghost",
						onClick: () => setT((p) => ({
							...p,
							k: Math.max(.15, p.k / 1.2)
						})),
						"aria-label": "Zoom out",
						children: "−"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn-ghost",
						onClick: fit,
						children: "Fit"
					}),
					collapsed.size > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn-ghost",
						onClick: () => setCollapsed(/* @__PURE__ */ new Set()),
						children: "Expand all"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute bottom-3 left-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "legend legend-active",
						children: "active"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "legend legend-owner",
						children: "socket owner"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "legend legend-path",
						children: "packet path"
					})
				]
			}),
			sel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "panel absolute right-3 top-3 w-72 p-4",
				"aria-label": "Node inspector",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: sel.data.kind
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-mono text-sm text-foreground",
							children: sel.data.label
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn-ghost",
							onClick: () => setSelected(null),
							"aria-label": "Close inspector",
							children: "×"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: sel.data.detail
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-3 grid grid-cols-2 gap-1 font-mono text-[11px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: "on path"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: path.has(sel.data.id) ? "yes" : "no" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: "owns socket"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: currentStep.ownerNode === sel.data.id ? "yes" : "no" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: "children"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: findChildren(full, sel.data.id) })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex gap-2",
						children: [findChildren(full, sel.data.id) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn-ghost",
							onClick: () => toggleCollapse(sel.data.id),
							children: collapsed.has(sel.data.id) ? "Expand" : "Minimize"
						}), (sel.data.kind === "sup" || sel.data.kind === "worker" || sel.data.kind === "handler") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn-ghost",
							onClick: () => restart(sel.data.id),
							children: "Simulate restart"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-[11px] text-muted-foreground",
						children: "Restart is visual only — no real process is touched."
					})
				]
			})
		] })]
	});
}
function findChildren(g, id) {
	if (g.id === id) return g.children?.length ?? 0;
	for (const c of g.children ?? []) {
		const r = findChildren(c, id);
		if (r >= 0) return r;
	}
	return -1;
}
//#endregion
export { ObserverGraph as t };
