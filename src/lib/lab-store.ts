import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { stepsForLanguage, type Language, type Outcome } from "@/lib/pipeline";
import { parseSource } from "@/lib/source/parse";
import { loadSaved, SOURCE_UPDATED_EVENT, storageKey } from "@/lib/source/persist";
import { DEFAULT_SOURCES, type SourceFiles } from "@/lib/source/files";

interface LabState { language: Language; payload: string; outcome: Outcome }
const DEFAULT: LabState = { language: "elixir", payload: "ECHO ping", outcome: "frame" };
const KEY = "wire-ingest-lab:session";

let state: LabState = DEFAULT;
let loaded = false;
const subs = new Set<() => void>();

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && typeof s === "object") {
      const saved = s as Partial<LabState>;
      const language = saved.language;
      const outcome = saved.outcome;
      state = {
        ...DEFAULT,
        payload: typeof saved.payload === "string" ? saved.payload : DEFAULT.payload,
        language:
          language === "elixir" || language === "python" || language === "nodejs" || language === "odin"
            ? language
            : DEFAULT.language,
        outcome: outcome === "frame" || outcome === "close" || outcome === "error" ? outcome : DEFAULT.outcome,
      };
    }
  } catch { /* ignore */ }
}

export function setLab(patch: Partial<LabState>) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export function useLab(): LabState {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => { ensure(); return state; },
    () => DEFAULT,
  );
}

/** Saved source for a language, synced across this tab and other tabs. */
export function useSavedSource(language: Language): SourceFiles {
  const [files, setFiles] = useState<SourceFiles>(DEFAULT_SOURCES[language]);
  useEffect(() => {
    const refresh = () => setFiles(loadSaved(language));
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === storageKey(language)) refresh(); };
    window.addEventListener(SOURCE_UPDATED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(SOURCE_UPDATED_EVENT, refresh); window.removeEventListener("storage", onStorage); };
  }, [language]);
  return files;
}

export function useSimulation() {
  const lab = useLab();
  const files = useSavedSource(lab.language);
  const config = useMemo(() => parseSource(lab.language, files), [lab.language, files]);
  const steps = useMemo(() => stepsForLanguage(lab.language, lab.payload, lab.outcome, config), [lab, config]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => { setIndex(0); setPlaying(false); }, [steps]);
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 1400 / speed);
    return () => window.clearTimeout(timer.current);
  }, [playing, index, speed, steps.length]);

  const step = useCallback((d: number) => { setPlaying(false); setIndex((i) => Math.max(0, Math.min(steps.length - 1, i + d))); }, [steps.length]);
  const toggle = useCallback(() => {
    setPlaying((p) => { if (!p && index >= steps.length - 1) setIndex(0); return !p; });
  }, [index, steps.length]);
  const reset = useCallback(() => { setPlaying(false); setIndex(0); }, []);

  return { lab, config, steps, index, current: steps[Math.min(index, steps.length - 1)]!, setIndex, playing, toggle, step, reset, speed, setSpeed };
}
