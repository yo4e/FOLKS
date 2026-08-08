import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FakeModelAdapter, defaultFakeOutput } from "@/src/adapters/model/fake";
import { CloudModelAdapter } from "@/src/adapters/model/cloud";
import type { ModelAdapter } from "@/src/adapters/model/types";
import {
  RESIDENT_IDS,
  TOTAL_CYCLES,
  residentForCycle,
} from "@/src/core/constants";
import { TurnEngine } from "@/src/core/engine";
import { buildTurnInput } from "@/src/core/input";
import { renderResidentPrompt } from "@/src/core/prompt";
import { projectionMatchesHistory } from "@/src/core/replay";
import { InMemoryExperimentStore } from "@/src/core/store";
import { createInitialState } from "@/src/core/state";
import { validateModelTurnOutput } from "@/src/core/validation";
import { SqliteExperimentStore } from "@/src/server/db/sqlite-store";

function validOutput(overrides: Record<string, unknown> = {}) {
  return {
    journalText: "今日は静かだった。見える範囲では、大きな変化はない。",
    privateNote: null,
    relationshipChange: null,
    worldAction: null,
    questionForNext: null,
    ...overrides,
  };
}

function createMemoryExperiment(kind: "baseline" | "technical" = "baseline") {
  const store = new InMemoryExperimentStore();
  const experiment = store.createExperiment({ kind });
  return { store, experiment };
}

describe("FOLKS v0 domain boundaries", () => {
  it("uses the fixed rota and expected duty counts", () => {
    expect(residentForCycle(1)).toBe("kai");
    expect(residentForCycle(2)).toBe("fia");
    expect(residentForCycle(3)).toBe("tekt");
    expect(residentForCycle(4)).toBe("meme");
    expect(residentForCycle(5)).toBe("kai");
    expect(residentForCycle(30)).toBe("fia");

    const counts = Object.fromEntries(RESIDENT_IDS.map((id) => [id, 0]));
    for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle += 1) {
      counts[residentForCycle(cycle)] += 1;
    }
    expect(counts).toEqual({ kai: 8, fia: 8, tekt: 7, meme: 7 });
  });

  it("builds resident-safe input with only permitted information", () => {
    const { store, experiment } = createMemoryExperiment();
    const built = buildTurnInput(
      experiment,
      store.getCurrentState(experiment.id),
      1,
    );
    const serialized = JSON.stringify(built.input);
    expect(serialized).not.toContain(experiment.id);
    expect(serialized).not.toContain("object_01");
    expect(serialized).not.toContain("place_03");
    expect(serialized).not.toContain("totalCycles");
    expect(serialized).not.toContain("modelIdentifier");
    expect(built.input.resident.privateNotes).toEqual([]);
    expect(built.input.recentJournal).toEqual([]);
    expect(built.input.world.objects[0].ref).toBe("object:a");
    expect(built.refMap.objects["object:a"]).toBe("object_01");

    const prompt = renderResidentPrompt(built.input);
    expect(prompt).toContain("日直番号: 1");
    expect(prompt).not.toContain("/ 30");
    expect(prompt).not.toContain(experiment.id);
    expect(prompt).not.toContain("provider");
  });

  it("keeps private memory resident-local and limits shared journal input to four", async () => {
    const { store, experiment } = createMemoryExperiment();
    const adapter = new FakeModelAdapter({
      onGenerate: (input) => ({
        ...defaultFakeOutput(input) as Record<string, unknown>,
        privateNote: input.resident.name + "だけのメモ。",
      }),
    });
    const engine = new TurnEngine(store, adapter);
    for (let cycle = 1; cycle <= 6; cycle += 1) {
      await engine.runNextTurn(experiment.id);
    }
    const state = store.getCurrentState(experiment.id);
    const cycleSeven = buildTurnInput(experiment, state, 7).input;
    expect(cycleSeven.recentJournal.map((entry) => entry.cycle)).toEqual([
      3, 4, 5, 6,
    ]);
    expect(cycleSeven.resident.name).toBe("Tekt");
    expect(cycleSeven.resident.privateNotes).toHaveLength(1);
    expect(cycleSeven.resident.privateNotes[0].text).toContain("Tekt");
    expect(cycleSeven.resident.privateNotes.some((note) => note.text.includes("Kai"))).toBe(
      false,
    );
    const cycleFive = buildTurnInput(experiment, state, 5).input;
    expect(cycleFive.resident.privateNotes).toHaveLength(2);
    expect(cycleFive.resident.privateNotes.every((note) => note.text.includes("Kai"))).toBe(
      true,
    );
  });

  it("builds the FOLKS view from a structurally public data shape", () => {
    const { store, experiment } = createMemoryExperiment();
    const view = store.getFolksView(experiment.id);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("privateNotes");
    expect(serialized).not.toContain("rawOutput");
    expect(serialized).not.toContain("TurnRefMap");
    expect(serialized).not.toContain("object_01");
  });
});

describe("FOLKS v0 validation", () => {
  it("accepts a structured output and resolves turn-local refs", () => {
    const { store, experiment } = createMemoryExperiment();
    const state = store.getCurrentState(experiment.id);
    const { input, refMap } = buildTurnInput(experiment, state, 1);
    const result = validateModelTurnOutput(
      validOutput({
        relationshipChange: {
          residentRef: "resident:b",
          delta: 1,
          reason: "前の日誌の頼みを覚えていたから。",
        },
        worldAction: {
          type: "move_object",
          objectRef: "object:a",
          destinationPlaceRef: "place:c",
        },
      }),
      input,
      refMap,
      state,
      "kai",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.relationshipChange?.residentId).toBe("fia");
      expect(result.output.worldAction?.objectId).toBe("object_01");
      expect(result.output.worldAction?.destinationPlaceId).toBe("place_03");
    }
  });

  it("rejects stale refs, self relationships, and no-op movement", () => {
    const { store, experiment } = createMemoryExperiment();
    const state = store.getCurrentState(experiment.id);
    const { input, refMap } = buildTurnInput(experiment, state, 1);
    const stale = validateModelTurnOutput(
      validOutput({
        worldAction: {
          type: "move_object",
          objectRef: "object:z",
          destinationPlaceRef: "place:c",
        },
      }),
      input,
      refMap,
      state,
      "kai",
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.issues.some((item) => item.code === "unknown_ref")).toBe(true);
    }

    const self = validateModelTurnOutput(
      validOutput({
        relationshipChange: {
          residentRef: "resident:a",
          delta: 1,
          reason: "少しそう感じた。",
        },
      }),
      input,
      refMap,
      state,
      "kai",
    );
    expect(self.ok).toBe(false);
    if (!self.ok) {
      expect(self.issues.some((item) => item.code === "self_reference")).toBe(true);
    }

    const noOp = validateModelTurnOutput(
      validOutput({
        worldAction: {
          type: "move_object",
          objectRef: "object:a",
          destinationPlaceRef: "place:a",
        },
      }),
      input,
      refMap,
      state,
      "kai",
    );
    expect(noOp.ok).toBe(false);
    if (!noOp.ok) {
      expect(noOp.issues.some((item) => item.code === "no_op")).toBe(true);
    }
  });

  it("preserves a raw attempt while accepting a JSON object surrounded by prose", () => {
    const { store, experiment } = createMemoryExperiment();
    const state = store.getCurrentState(experiment.id);
    const { input, refMap } = buildTurnInput(experiment, state, 1);
    const candidate = "Here is the requested object:\n" + JSON.stringify(validOutput());
    const result = validateModelTurnOutput(
      candidate,
      input,
      refMap,
      state,
      "kai",
    );
    expect(result.ok).toBe(true);
  });
});

describe("FOLKS v0 turn engine", () => {
  it("completes the deterministic 30-cycle vertical slice", async () => {
    const { store, experiment } = createMemoryExperiment();
    const adapter = new FakeModelAdapter();
    const engine = new TurnEngine(store, adapter);
    const results = await engine.runUntilStopped(experiment.id);
    const finalExperiment = store.getExperiment(experiment.id);
    expect(results).toHaveLength(30);
    expect(adapter.generateCalls).toHaveLength(30);
    expect(finalExperiment?.status).toBe("completed");
    expect(finalExperiment?.committedCycle).toBe(30);
    expect(store.getCurrentState(experiment.id).journal).toHaveLength(30);
    expect(store.getLabView(experiment.id).turns.every((turn) => turn.status === "COMMITTED")).toBe(
      true,
    );
    expect(projectionMatchesHistory(store.getCurrentState(experiment.id))).toBe(true);
  });

  it("allows one repair and makes both attempts auditable", async () => {
    const { store, experiment } = createMemoryExperiment();
    const adapter = new FakeModelAdapter({
      generationOutputs: [{ journalText: "壊れた出力" }],
      repairOutputs: [validOutput()],
    });
    const result = await new TurnEngine(store, adapter).runNextTurn(experiment.id);
    expect(result.committed).toBe(true);
    const turn = store.getTurn(result.turn.id);
    expect(turn?.modelRuns).toHaveLength(2);
    expect(turn?.modelRuns[0].validationErrors.length).toBeGreaterThan(0);
    expect(turn?.modelRuns[1].kind).toBe("repair");
    expect(store.getCurrentState(experiment.id).journal).toHaveLength(1);
  });

  it("commits journal, private memory, relationship, and world event together", async () => {
    const { store, experiment } = createMemoryExperiment();
    const adapter = new FakeModelAdapter({
      generationOutputs: [
        validOutput({
          privateNote: "次の自分へ、石の位置を覚えておく。",
          relationshipChange: {
            residentRef: "resident:b",
            delta: 1,
            reason: "日誌の頼みを気に留めた。",
          },
          worldAction: {
            type: "move_object",
            objectRef: "object:a",
            destinationPlaceRef: "place:c",
          },
          questionForNext: "石の位置を確認してください。",
        }),
      ],
    });
    const result = await new TurnEngine(store, adapter).runNextTurn(experiment.id);
    expect(result.committed).toBe(true);
    const state = store.getCurrentState(experiment.id);
    expect(state.journal).toHaveLength(1);
    expect(state.privateNotes).toHaveLength(1);
    expect(state.relationshipEvents).toHaveLength(1);
    expect(state.worldEvents).toHaveLength(1);
    expect(state.objects.object_01.locationId).toBe("place_03");
    expect(state.relationships.kai.fia).toBe(1);
    expect(projectionMatchesHistory(state)).toBe(true);
  });

  it("fails a baseline after an invalid repair without mutating committed state", async () => {
    const { store, experiment } = createMemoryExperiment();
    const adapter = new FakeModelAdapter({
      generationOutputs: [{ journalText: "不完全" }],
      repairOutputs: [{ journalText: "まだ不完全" }],
    });
    const result = await new TurnEngine(store, adapter).runNextTurn(experiment.id);
    const failedExperiment = store.getExperiment(experiment.id);
    expect(result.committed).toBe(false);
    expect(result.turn.status).toBe("FAILED");
    expect(failedExperiment?.status).toBe("failed");
    expect(failedExperiment?.committedCycle).toBe(0);
    expect(store.getCurrentState(experiment.id).journal).toHaveLength(0);
    expect(store.getCurrentState(experiment.id).privateNotes).toHaveLength(0);
  });

  it("prevents duplicate generation while a turn is claimed", async () => {
    const { store, experiment } = createMemoryExperiment();
    let release: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const adapter: ModelAdapter = {
      name: "delayed-test",
      modelIdentifier: "delayed-test",
      promptVersion: "test",
      async generateTurn(input) {
        calls += 1;
        await waiting;
        return defaultFakeOutput(input);
      },
      async repairTurn(input) {
        return defaultFakeOutput(input);
      },
    };
    const engine = new TurnEngine(store, adapter);
    const first = engine.runNextTurn(experiment.id);
    await Promise.resolve();
    const second = await engine.runNextTurn(experiment.id);
    expect(second.owner).toBe(false);
    expect(second.turn.status).toBe("GENERATING");
    expect(calls).toBe(1);
    release?.();
    const firstResult = await first;
    expect(firstResult.committed).toBe(true);
  });

  it("recovers a stale generating turn from its persisted raw response", async () => {
    const { store, experiment } = createMemoryExperiment();
    const claim = store.claimNextTurn(experiment.id, "2020-01-01T00:00:00.000Z");
    expect(claim.owner).toBe(true);
    if (!claim.owner) return;
    const built = buildTurnInput(
      experiment,
      store.getCurrentState(experiment.id),
      1,
    );
    store.saveTurnInput(
      claim.turn.id,
      claim.turn.executionToken as string,
      built.input,
      built.refMap,
      "2020-01-01T00:00:01.000Z",
    );
    store.appendModelRun(claim.turn.id, claim.turn.executionToken as string, {
      kind: "generation",
      adapter: "fake",
      modelIdentifier: "folks-fake-v0",
      promptVersion: "test",
      rawInput: built.input,
      rawOutput: validOutput(),
      validationErrors: [],
      startedAt: "2020-01-01T00:00:01.000Z",
      finishedAt: "2020-01-01T00:00:02.000Z",
      latencyMs: 1000,
      inputTokens: null,
      outputTokens: null,
      finishReason: null,
    });
    const adapter = new FakeModelAdapter({
      onGenerate: () => {
        throw new Error("must not regenerate");
      },
    });
    const result = await new TurnEngine(store, adapter).recoverStaleTurn(
      experiment.id,
      1,
      0,
    );
    expect(result.reusedPersistedResponse).toBe(true);
    expect(result.committed).toBe(true);
    expect(adapter.generateCalls).toHaveLength(0);
  });

  it("can retry a technical transport failure without advancing the cycle", async () => {
    const { store, experiment } = createMemoryExperiment("technical");
    const adapter = new FakeModelAdapter({
      onGenerate: (_input, callNumber) => {
        if (callNumber === 1) {
          throw new Error("temporary transport failure");
        }
        return validOutput();
      },
    });
    const engine = new TurnEngine(store, adapter);
    const first = await engine.runNextTurn(experiment.id);
    expect(first.turn.status).toBe("FAILED");
    expect(store.getExperiment(experiment.id)?.committedCycle).toBe(0);
    const second = await engine.runNextTurn(experiment.id);
    expect(second.committed).toBe(true);
    expect(store.getExperiment(experiment.id)?.committedCycle).toBe(1);
  });

  it("duplicates frozen configuration without rewriting the original history", async () => {
    const { store, experiment } = createMemoryExperiment();
    await new TurnEngine(store, new FakeModelAdapter()).runNextTurn(experiment.id);
    const duplicate = store.duplicateExperiment(experiment.id);
    expect(duplicate.id).not.toBe(experiment.id);
    expect(duplicate.committedCycle).toBe(0);
    expect(duplicate.promptVersion).toBe(experiment.promptVersion);
    expect(store.getCurrentState(experiment.id).journal).toHaveLength(1);
    expect(store.getCurrentState(duplicate.id).journal).toHaveLength(0);
  });

  it("pauses between committed turns", async () => {
    const { store, experiment } = createMemoryExperiment();
    await new TurnEngine(store, new FakeModelAdapter()).runNextTurn(experiment.id);
    expect(store.pauseExperiment(experiment.id).status).toBe("paused");
    expect(await new TurnEngine(store, new FakeModelAdapter()).runUntilStopped(experiment.id)).toEqual(
      [],
    );
    expect(store.getExperiment(experiment.id)?.committedCycle).toBe(1);
  });
});

describe("cloud model boundary", () => {
  it("sends the resident-safe prompt and preserves provider usage metadata", async () => {
    const { store, experiment } = createMemoryExperiment();
    const built = buildTurnInput(
      experiment,
      store.getCurrentState(experiment.id),
      1,
    );
    let requestBody = "";
    const adapter = new CloudModelAdapter({
      endpoint: "https://provider.invalid/chat",
      apiKey: "secret-that-must-not-enter-the-prompt",
      modelIdentifier: "cloud-test",
      fetchImpl: async (_input, init) => {
        requestBody = String(init?.body);
        return new Response(
          JSON.stringify({
            model: "cloud-test-returned",
            usage: { prompt_tokens: 42, completion_tokens: 17 },
            choices: [
              {
                finish_reason: "stop",
                message: { content: JSON.stringify(validOutput()) },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });
    await adapter.generateTurn(built.input);
    expect(requestBody).toContain("日直番号: 1");
    expect(requestBody).not.toContain(experiment.id);
    expect(requestBody).not.toContain("secret-that-must-not-enter-the-prompt");
    expect(adapter.getLastResponseMetadata?.()).toEqual({
      providerModel: "cloud-test-returned",
      inputTokens: 42,
      outputTokens: 17,
      finishReason: "stop",
    });
  });
});

describe("SQLite persistence", () => {
  it("uses the database claim invariant across store instances", () => {
    const directory = mkdtempSync(join(tmpdir(), "folks-claim-test-"));
    const path = join(directory, "folks.db");
    try {
      const firstStore = SqliteExperimentStore.fromPath(path);
      const experiment = firstStore.createExperiment({ kind: "technical" });
      const secondStore = SqliteExperimentStore.fromPath(path);
      const firstClaim = firstStore.claimNextTurn(
        experiment.id,
        "2020-01-01T00:00:00.000Z",
      );
      const duplicateClaim = secondStore.claimNextTurn(
        experiment.id,
        "2020-01-01T00:00:01.000Z",
      );
      expect(firstClaim.owner).toBe(true);
      expect(duplicateClaim.owner).toBe(false);
      expect(duplicateClaim.turn.id).toBe(firstClaim.turn.id);
      firstStore.close();
      secondStore.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("persists audit records and projections across store instances", async () => {
    const directory = mkdtempSync(join(tmpdir(), "folks-test-"));
    const path = join(directory, "folks.db");
    try {
      const firstStore = SqliteExperimentStore.fromPath(path);
      const experiment = firstStore.createExperiment({ kind: "technical" });
      await new TurnEngine(firstStore, new FakeModelAdapter()).runNextTurn(
        experiment.id,
      );
      await new TurnEngine(firstStore, new FakeModelAdapter()).runNextTurn(
        experiment.id,
      );
      firstStore.close();

      const secondStore = SqliteExperimentStore.fromPath(path);
      const restored = secondStore.getExperiment(experiment.id);
      expect(restored?.committedCycle).toBe(2);
      expect(secondStore.getCurrentState(experiment.id).journal).toHaveLength(2);
      expect(secondStore.getLabView(experiment.id).turns[0].modelRuns).toHaveLength(
        1,
      );
      expect(projectionMatchesHistory(secondStore.getCurrentState(experiment.id))).toBe(
        true,
      );
      secondStore.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
