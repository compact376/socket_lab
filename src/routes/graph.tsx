import { createFileRoute } from "@tanstack/react-router";
import { ObserverGraph } from "@/components/observer/ObserverGraph";
import { LanguageSelect, StepDetail, Timeline, Transport } from "@/components/lab/LabControls";
import { useSimulation } from "@/lib/lab-store";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Observer graph — Wire Ingest Lab" },
      { name: "description", content: "Zoomable Observer-style tree of kernel nodes and runtime supervision or event-loop structures for one TCP socket." },
      { property: "og:title", content: "Observer graph — Wire Ingest Lab" },
      { property: "og:description", content: "Inspect, minimize and simulate restarts across the kernel path and runtime tree." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GraphPage,
});

function GraphPage() {
  const sim = useSimulation();
  return (
    <main className="grid h-[calc(100dvh-3rem)] grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1">
      <section className="relative flex min-h-[60vh] flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <LanguageSelect value={sim.lab.language} />
          <div className="min-w-[200px] flex-1"><Transport sim={sim} /></div>
        </div>
        <div className="px-3 pt-3"><Timeline sim={sim} /></div>
        <div className="relative flex-1"><ObserverGraph currentStep={sim.current} config={sim.config} /></div>
      </section>
      <aside className="overflow-y-auto border-l border-border p-5"><StepDetail step={sim.current} /></aside>
    </main>
  );
}
