import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as Timeline, i as StepDetail, n as LanguageSelect, o as Transport, p as useSimulation } from "./LabControls-Cz2w7x1g.mjs";
import { t as ObserverGraph } from "./ObserverGraph-C4bzbfEl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/graph-C_kNvniN.js
var import_jsx_runtime = require_jsx_runtime();
function GraphPage() {
	const sim = useSimulation();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "grid h-[calc(100dvh-3rem)] grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative flex min-h-[60vh] flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3 border-b border-border p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LanguageSelect, { value: sim.lab.language }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-[200px] flex-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transport, { sim })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-3 pt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, { sim })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ObserverGraph, {
						currentStep: sim.current,
						config: sim.config
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
			className: "overflow-y-auto border-l border-border p-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepDetail, { step: sim.current })
		})]
	});
}
//#endregion
export { GraphPage as component };
