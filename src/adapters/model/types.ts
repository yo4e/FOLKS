import type { TurnInput } from "@/src/core/types";

export type ModelResponseMetadata = {
  providerModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
};

export type ModelAdapter = {
  readonly name: string;
  readonly modelIdentifier: string;
  readonly promptVersion: string;
  generateTurn(input: TurnInput): Promise<unknown>;
  repairTurn?(
    input: TurnInput,
    invalidOutput: unknown,
    validationErrors: string[],
  ): Promise<unknown>;
  getLastResponseMetadata?(): ModelResponseMetadata | null;
};
