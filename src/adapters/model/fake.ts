import {
  DEFAULT_MODEL_PARAMETERS,
  PROMPT_VERSION,
} from "@/src/core/constants";
import type { ModelAdapter } from "./types";
import type { TurnInput } from "@/src/core/types";

export type FakeModelOptions = {
  generationOutputs?: unknown[];
  repairOutputs?: unknown[];
  onGenerate?: (input: TurnInput, callNumber: number) => unknown;
  onRepair?: (
    input: TurnInput,
    invalidOutput: unknown,
    validationErrors: string[],
    callNumber: number,
  ) => unknown;
};

export class FakeModelAdapter implements ModelAdapter {
  readonly name = "fake";
  readonly modelIdentifier = "folks-fake-v0";
  readonly promptVersion = PROMPT_VERSION;
  readonly modelParameters: Readonly<Record<string, unknown>> = {
    ...DEFAULT_MODEL_PARAMETERS,
  };
  readonly generateCalls: TurnInput[] = [];
  readonly repairCalls: Array<{
    input: TurnInput;
    invalidOutput: unknown;
    validationErrors: string[];
  }> = [];

  private readonly generationOutputs: unknown[];
  private readonly repairOutputs: unknown[];
  private readonly onGenerate?: FakeModelOptions["onGenerate"];
  private readonly onRepair?: FakeModelOptions["onRepair"];

  constructor(options: FakeModelOptions = {}) {
    this.generationOutputs = [...(options.generationOutputs ?? [])];
    this.repairOutputs = [...(options.repairOutputs ?? [])];
    this.onGenerate = options.onGenerate;
    this.onRepair = options.onRepair;
  }

  async generateTurn(input: TurnInput): Promise<unknown> {
    this.generateCalls.push(input);
    const callNumber = this.generateCalls.length;
    if (this.onGenerate) {
      return this.onGenerate(input, callNumber);
    }
    if (this.generationOutputs.length > 0) {
      return this.generationOutputs.shift();
    }
    return defaultFakeOutput(input);
  }

  async repairTurn(
    input: TurnInput,
    invalidOutput: unknown,
    validationErrors: string[],
  ): Promise<unknown> {
    this.repairCalls.push({ input, invalidOutput, validationErrors });
    const callNumber = this.repairCalls.length;
    if (this.onRepair) {
      return this.onRepair(input, invalidOutput, validationErrors, callNumber);
    }
    if (this.repairOutputs.length > 0) {
      return this.repairOutputs.shift();
    }
    return defaultFakeOutput(input);
  }
}

export function defaultFakeOutput(input: TurnInput): unknown {
  const privateNote =
    input.cycle % 4 === 1
      ? input.resident.name + "の私的なメモ。"
      : null;
  const questionForNext =
    input.cycle % 4 === 0 ? "次の日直でも、変わりがないか見てください。" : null;
  return {
    journalText:
      input.resident.name +
      "の日直。今日は" +
      input.world.weather +
      "だった。見える範囲では、特に大きな変化はなかった。",
    privateNote,
    relationshipChange: null,
    worldAction: null,
    questionForNext,
  };
}
