import type { Language } from "@/lib/pipeline/types";
import { DEFAULT_SOURCES, type SourceFiles } from "./files";

export const LEGACY_KEY = "thousand-island-source-config";
export const SOURCE_UPDATED_EVENT = "thousand-island-source-updated";
export const storageKey = (l: Language) => `${LEGACY_KEY}:${l}`;
const validFileName = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function migrate() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      if (localStorage.getItem(storageKey("elixir")) === null) localStorage.setItem(storageKey("elixir"), legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export function loadSaved(language: Language): SourceFiles {
  const defaults = DEFAULT_SOURCES[language];
  if (typeof window === "undefined") return defaults;
  migrate();
  try {
    const raw = localStorage.getItem(storageKey(language));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaults;
    const out: SourceFiles = { ...defaults };
    for (const [k, v] of Object.entries(parsed)) {
      if (validFileName.test(k) && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return defaults;
  }
}

export function saveSource(language: Language, files: SourceFiles) {
  localStorage.setItem(storageKey(language), JSON.stringify(files));
  window.dispatchEvent(new CustomEvent(SOURCE_UPDATED_EVENT, { detail: { language } }));
}

export function resetSource(language: Language) {
  localStorage.removeItem(storageKey(language));
  window.dispatchEvent(new CustomEvent(SOURCE_UPDATED_EVENT, { detail: { language } }));
}
