import { Fragment } from "react";
import { LANGUAGES, OUTCOMES, type Language, type Outcome, type Step } from "@/lib/pipeline";
import { setLab } from "@/lib/lab-store";
import type { useSimulation } from "@/lib/lab-store";

type Sim = ReturnType<typeof useSimulation>;

export function LanguageSelect({ value, onChange }: { value: Language; onChange?: (l: Language) => void }) {
  return (
    <div role="radiogroup" aria-label="Language" className="seg">
      {LANGUAGES.map((l) => (
        <button key={l.id} role="radio" aria-checked={value === l.id} className="seg-item" onClick={() => (onChange ?? ((x) => setLab({ language: x })))(l.id)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function PayloadOutcome({ payload, outcome }: { payload: string; outcome: Outcome }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="eyebrow">Payload</span>
        <input className="field font-mono" value={payload} maxLength={256} onChange={(e) => setLab({ payload: e.target.value })} spellCheck={false} />
      </label>
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Outcome</span>
        <div role="radiogroup" aria-label="Outcome" className="seg">
          {OUTCOMES.map((o) => (
            <button key={o} role="radio" aria-checked={outcome === o} className="seg-item" onClick={() => setLab({ outcome: o })}>{o}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Transport({ sim }: { sim: Sim }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-ghost" onClick={() => sim.step(-1)} disabled={sim.index === 0} aria-label="Back">◂ Back</button>
      <button className="btn-primary" onClick={sim.toggle}>{sim.playing ? "Pause" : "Run"}</button>
      <button className="btn-ghost" onClick={() => sim.step(1)} disabled={sim.index >= sim.steps.length - 1} aria-label="Step">Step ▸</button>
      <button className="btn-ghost" onClick={sim.reset}>Reset</button>
      <label className="ml-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        speed
        <select className="field py-1" value={sim.speed} onChange={(e) => sim.setSpeed(Number(e.target.value))}>
          {[0.5, 1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </label>
      <span className="ml-auto font-mono text-xs text-muted-foreground">{sim.index + 1}/{sim.steps.length}</span>
    </div>
  );
}

export function Timeline({ sim }: { sim: Sim }) {
  return (
    <ol className="timeline" aria-label="Lifecycle timeline">
      {sim.steps.map((s, i) => (
        <li key={s.id} className="flex-1">
          <button
            className={`tl-dot zone-${s.zone} ${i === sim.index ? "is-current" : ""} ${i < sim.index ? "is-done" : ""}`}
            onClick={() => sim.setIndex(i)}
            aria-label={`Step ${i + 1}: ${s.title}`}
            aria-current={i === sim.index ? "step" : undefined}
            title={s.title}
          />
        </li>
      ))}
    </ol>
  );
}

export function StepDetail({ step }: { step: Step }) {
  const rows: [string, string][] = [
    ["owner", step.owner],
    ["socket", step.socketState],
    ["handler", step.handlerState],
    [step.language === "elixir" ? "acceptors" : step.language === "odin" ? "threads" : step.language === "python" ? "backlog" : "max conns", String(step.acceptors)],
  ];
  return (
    <article className="space-y-4" aria-live="polite">
      <header>
        <p className={`eyebrow zone-text-${step.zone}`}>{step.zone}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.explanation}</p>
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs">
        {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="text-foreground">{v}</dd></Fragment>))}
        <dt className="text-muted-foreground">{step.language === "elixir" ? "mailbox" : "queue"}</dt>
        <dd className="text-foreground">{step.queue.length ? step.queue.join(" · ") : "—"}</dd>
      </dl>
      <figure className="code-block">
        <figcaption>{step.code.file}</figcaption>
        <pre><code>{step.code.snippet || "—"}</code></pre>
      </figure>
    </article>
  );
}
