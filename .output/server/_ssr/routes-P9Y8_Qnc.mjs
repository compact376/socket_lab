import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as Timeline, f as useSavedSource, i as StepDetail, n as LanguageSelect, o as Transport, p as useSimulation, r as PayloadOutcome, t as LANGUAGES } from "./LabControls-Cz2w7x1g.mjs";
import { t as ObserverGraph } from "./ObserverGraph-C4bzbfEl.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-P9Y8_Qnc.js
var import_jsx_runtime = require_jsx_runtime();
function Lab() {
	const sim = useSimulation();
	const files = useSavedSource(sim.lab.language);
	const lang = LANGUAGES.find((l) => l.id === sim.lab.language);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_420px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex min-w-0 flex-col gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "panel p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-semibold tracking-tight text-foreground",
							children: "One socket, end to end"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-muted-foreground",
							children: [lang.runtime, " · deterministic simulation, no live traffic"]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LanguageSelect, { value: sim.lab.language })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PayloadOutcome, {
							payload: sim.lab.payload,
							outcome: sim.lab.outcome
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "panel p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, { sim }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transport, { sim })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "panel relative h-[420px] overflow-hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ObserverGraph, {
						currentStep: sim.current,
						config: sim.config,
						interactive: false
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/graph",
						className: "btn-ghost absolute right-3 top-3",
						children: "Open Observer ↗"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "flex flex-col gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "panel p-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepDetail, { step: sim.current })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "panel p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: "Saved source"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/editor",
							className: "link",
							children: "Edit ↗"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-0.5 font-mono text-xs",
						children: Object.keys(files).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "text-foreground",
							children: f
						}, f))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-3 grid grid-cols-2 gap-1 font-mono text-[11px] text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "count" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "text-foreground",
								children: sim.config.acceptors
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "prefix" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "text-foreground",
								children: JSON.stringify(sim.config.prefix)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "port" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "text-foreground",
								children: sim.config.port
							}),
							sim.lab.language === "elixir" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "active" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "text-foreground",
									children: sim.config.activeMode
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "handoff" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "text-foreground",
									children: sim.config.handoff ? "yes" : "missing"
								})
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-[11px] text-muted-foreground",
						children: "Graph updates only after you Save in the editor."
					})
				]
			})]
		})]
	});
}
//#endregion
export { Lab as component };
