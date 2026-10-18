import { RUNNER_URL } from "./constants";
import type { RunInput, RunnerOutput } from "./types";

export async function runSource(input: RunInput): Promise<{ response: Response; output: RunnerOutput }> {
  const response = await fetch(`${RUNNER_URL}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(35_000),
  });
  const output = (await response.json().catch(() => ({}))) as RunnerOutput;
  return { response, output };
}
