import { createFileRoute, Link } from "@tanstack/react-router";
import { ObserverGraph } from "@/components/observer/ObserverGraph";
import { LanguageSelect, PayloadOutcome, StepDetail, Timeline, Transport } from "@/components/lab/LabControls";
import { useSavedSource, useSimulation } from "@/lib/lab-store";
import { LANGUAGES } from "@/lib/pipeline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wire Ingest Lab — follow one TCP socket from NIC to runtime" },
      { name: "description", content: "Deterministic simulator tracing one TCP connection through the Linux kernel into Elixir, Python, Node.js and Odin runtimes." },
      { property: "og:title", content: "Wire Ingest Lab" },
      { property: "og:description", content: "Step through one socket's lifecycle: NIC, DMA, IRQ, sk_buff, epoll, and into BEAM, asyncio, libuv or native threads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lab,
});

function Lab() {
  const sim = useSimulation();
  const files = useSavedSource(sim.lab.language);
  const lang = LANGUAGES.find((l) => l.id === sim.lab.language)!;

  return (
    <main className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">One socket, end to end</h1>
              <p className="font-mono text-xs text-muted-foreground">{lang.runtime} · deterministic simulation, no live traffic</p>
            </div>
            <LanguageSelect value={sim.lab.language} />
          </div>
          <div className="mt-4"><PayloadOutcome payload={sim.lab.payload} outcome={sim.lab.outcome} /></div>
        </div>

        <div className="panel p-4">
          <Timeline sim={sim} />
          <div className="mt-3"><Transport sim={sim} /></div>
        </div>

        <div className="panel relative h-[420px] overflow-hidden">
          <ObserverGraph currentStep={sim.current} config={sim.config} interactive={false} />
          <Link to="/graph" className="btn-ghost absolute right-3 top-3">Open Observer ↗</Link>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="panel p-5"><StepDetail step={sim.current} /></div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Saved source</p>
            <Link to="/editor" className="link">Edit ↗</Link>
          </div>
          <ul className="mt-2 space-y-0.5 font-mono text-xs">
            {Object.keys(files).map((f) => <li key={f} className="text-foreground">{f}</li>)}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-1 font-mono text-[11px] text-muted-foreground">
            <dt>count</dt><dd className="text-foreground">{sim.config.acceptors}</dd>
            <dt>prefix</dt><dd className="text-foreground">{JSON.stringify(sim.config.prefix)}</dd>
            <dt>port</dt><dd className="text-foreground">{sim.config.port}</dd>
            {sim.lab.language === "elixir" && <><dt>active</dt><dd className="text-foreground">{sim.config.activeMode}</dd><dt>handoff</dt><dd className="text-foreground">{sim.config.handoff ? "yes" : "missing"}</dd></>}
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">Graph updates only after you Save in the editor.</p>
        </div>
      </aside>
    </main>
  );
}
