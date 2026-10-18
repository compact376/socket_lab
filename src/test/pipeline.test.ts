import { describe, expect, it } from "vitest";
import { stepsFor, stepsForLanguage, LANGUAGES, OUTCOMES } from "@/lib/pipeline";
import { parseSource } from "@/lib/source/parse";
import { buildGraph } from "@/components/observer/layouts";

describe("pipeline", () => {
  for (const { id } of LANGUAGES)
    for (const o of OUTCOMES)
      it(`${id} produces a ${o} trace starting at the NIC`, () => {
        const s = stepsForLanguage(id, "ECHO ping", o);
        expect(s[0]!.node).toBe("nic");
        expect(s.at(-1)!.zone).toBe("outcome");
      });

  it("stepsFor defaults to elixir", () => expect(stepsFor("x", "close")[0]!.language).toBe("elixir"));

  it.each([["1", 1], ["7", 7], ["100", 100], ["500", 100]])("num_acceptors %s → %i", (raw, n) => {
    expect(parseSource("elixir", { "a.ex": `num_acceptors: ${raw}` }).acceptors).toBe(n);
  });
  it("missing or malformed source falls back safely", () => {
    expect(parseSource("elixir", {}).acceptors).toBe(10);
    expect(parseSource("elixir", null).acceptors).toBe(10);
  });
  it("elixir graph has one acceptor branch per configured acceptor (no minimum of 2)", () => {
    const g = JSON.stringify(buildGraph("elixir", parseSource("elixir", { a: "num_acceptors: 1" })));
    expect(g.match(/"id":"acceptor_\d+"/g)).toHaveLength(1);
  });
});
