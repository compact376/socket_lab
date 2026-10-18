import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SourceConfig, Step } from "@/lib/pipeline/types";
import { buildGraph, type GraphNode } from "./layouts";

const NODE_W = 132;
const NODE_H = 30;

interface Props { currentStep: Step; config: SourceConfig; interactive?: boolean }

function prune(node: GraphNode, collapsed: Set<string>): GraphNode {
  if (collapsed.has(node.id)) return { ...node, children: undefined };
  return { ...node, children: node.children?.map((c) => prune(c, collapsed)) };
}

export function ObserverGraph({ currentStep, config, interactive = true }: Props) {
  const full = useMemo(() => buildGraph(currentStep.language, config), [currentStep.language, config]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [restarting, setRestarting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { setCollapsed(new Set()); setSelected(null); }, [currentStep.language]);

  const rowGap = config.acceptors > 30 ? 34 : 44;
  const layout = useMemo(() => {
    const root = hierarchy(prune(full, collapsed));
    const pts = tree<GraphNode>().nodeSize([rowGap, NODE_W + 34])(root);
    const nodes = pts.descendants();
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    for (const p of nodes) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    return { nodes, links: pts.links(), minX, maxX, width: maxY + NODE_W, height: maxX - minX + NODE_H };
  }, [full, collapsed, rowGap]);

  const fit = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const { clientWidth: w, clientHeight: h } = el;
    const k = Math.min(1.2, (w - 32) / layout.width, (h - 32) / layout.height);
    setT({ k, x: (w - layout.width * k) / 2, y: (h - layout.height * k) / 2 - layout.minX * k + (NODE_H / 2) * k });
  }, [layout]);

  useEffect(() => {
    fit();
    const el = wrap.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Keep the active node visible when it changes (interactive mode only fits once).
  const path = useMemo(() => new Set(currentStep.path), [currentStep.path]);
  const findById = (id: string | null) => (id ? layout.nodes.find((p) => p.data.id === id) : undefined);
  const sel = findById(selected);

  const onWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
    const rect = wrap.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setT((p) => {
      const k = Math.min(4, Math.max(0.15, p.k * (e.deltaY < 0 ? 1.12 : 0.9)));
      return { k, x: mx - ((mx - p.x) * k) / p.k, y: my - ((my - p.y) * k) / p.k };
    });
  };

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const restart = (id: string) => {
    const ids = new Set<string>();
    const walk = (g: GraphNode) => { ids.add(g.id); g.children?.forEach(walk); };
    const find = (g: GraphNode): GraphNode | undefined => (g.id === id ? g : g.children?.map(find).find(Boolean));
    const target = find(full);
    if (target) walk(target);
    setRestarting(ids);
    window.setTimeout(() => setRestarting(new Set()), 1600);
  };

  const cls = (p: HierarchyPointNode<GraphNode>) => {
    const id = p.data.id;
    return [
      "obs-node",
      `obs-${p.data.kind}`,
      path.has(id) && "is-path",
      currentStep.ownerNode === id && "is-owner",
      currentStep.node === id && "is-active",
      selected === id && "is-selected",
      restarting.has(id) && "is-restarting",
    ].filter(Boolean).join(" ");
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={wrap}
        className={`h-full w-full touch-none ${interactive ? "cursor-grab active:cursor-grabbing" : ""}`}
        onWheel={onWheel}
        onPointerDown={(e) => { if (interactive && (e.target as Element).tagName === "svg") { drag.current = { x: e.clientX - t.x, y: e.clientY - t.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } }}
        onPointerMove={(e) => {
          const offset = drag.current;
          if (offset) setT((p) => ({ ...p, x: e.clientX - offset.x, y: e.clientY - offset.y }));
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        <svg className="h-full w-full" role="img" aria-label={`Observer graph for ${currentStep.language}. Active: ${currentStep.title}`}>
          <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
            {layout.links.map((l) => (
              <path
                key={`${l.source.data.id}-${l.target.data.id}`}
                className={`obs-link ${path.has(l.source.data.id) && path.has(l.target.data.id) ? "is-path" : ""}`}
                d={`M${l.source.y + NODE_W},${l.source.x}C${(l.source.y + NODE_W + l.target.y) / 2},${l.source.x} ${(l.source.y + NODE_W + l.target.y) / 2},${l.target.x} ${l.target.y},${l.target.x}`}
              />
            ))}
            {layout.nodes.map((p) => (
              <g
                key={p.data.id}
                className={cls(p)}
                transform={`translate(${p.y},${p.x - NODE_H / 2})`}
                tabIndex={interactive ? 0 : -1}
                role={interactive ? "button" : undefined}
                aria-label={`${p.data.label}${currentStep.ownerNode === p.data.id ? ", socket owner" : ""}`}
                aria-pressed={interactive ? selected === p.data.id : undefined}
                onClick={() => interactive && setSelected(p.data.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(p.data.id); } }}
              >
                <rect width={NODE_W} height={NODE_H} rx={4} />
                <text x={10} y={NODE_H / 2} dominantBaseline="central">{p.data.label}{collapsed.has(p.data.id) ? " ▸" : ""}</text>
                {currentStep.ownerNode === p.data.id && <circle className="obs-owner-dot" cx={NODE_W - 10} cy={NODE_H / 2} r={4} />}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {interactive && (
        <>
          <div className="absolute left-3 top-3 flex gap-1">
            <button className="btn-ghost" onClick={() => setT((p) => ({ ...p, k: Math.min(4, p.k * 1.2) }))} aria-label="Zoom in">+</button>
            <button className="btn-ghost" onClick={() => setT((p) => ({ ...p, k: Math.max(0.15, p.k / 1.2) }))} aria-label="Zoom out">−</button>
            <button className="btn-ghost" onClick={fit}>Fit</button>
            {collapsed.size > 0 && <button className="btn-ghost" onClick={() => setCollapsed(new Set())}>Expand all</button>}
          </div>
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="legend legend-active">active</span>
            <span className="legend legend-owner">socket owner</span>
            <span className="legend legend-path">packet path</span>
          </div>
          {sel && (
            <aside className="panel absolute right-3 top-3 w-72 p-4" aria-label="Node inspector">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="eyebrow">{sel.data.kind}</p>
                  <h3 className="font-mono text-sm text-foreground">{sel.data.label}</h3>
                </div>
                <button className="btn-ghost" onClick={() => setSelected(null)} aria-label="Close inspector">×</button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{sel.data.detail}</p>
              <dl className="mt-3 grid grid-cols-2 gap-1 font-mono text-[11px]">
                <dt className="text-muted-foreground">on path</dt><dd>{path.has(sel.data.id) ? "yes" : "no"}</dd>
                <dt className="text-muted-foreground">owns socket</dt><dd>{currentStep.ownerNode === sel.data.id ? "yes" : "no"}</dd>
                <dt className="text-muted-foreground">children</dt><dd>{findChildren(full, sel.data.id)}</dd>
              </dl>
              <div className="mt-3 flex gap-2">
                {findChildren(full, sel.data.id) > 0 && (
                  <button className="btn-ghost" onClick={() => toggleCollapse(sel.data.id)}>{collapsed.has(sel.data.id) ? "Expand" : "Minimize"}</button>
                )}
                {(sel.data.kind === "sup" || sel.data.kind === "worker" || sel.data.kind === "handler") && (
                  <button className="btn-ghost" onClick={() => restart(sel.data.id)}>Simulate restart</button>
                )}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Restart is visual only — no real process is touched.</p>
            </aside>
          )}
        </>
      )}
    </div>
  );
}

function findChildren(g: GraphNode, id: string): number {
  if (g.id === id) return g.children?.length ?? 0;
  for (const c of g.children ?? []) { const r = findChildren(c, id); if (r >= 0) return r; }
  return -1;
}
