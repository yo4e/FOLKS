import { PROMPT_VERSION, MAX_OUTPUT_REPAIR_ATTEMPTS } from "./constants";
import { buildTurnInput } from "./input";
import {
  renderRepairPrompt,
} from "./prompt";
import { validationErrorStrings, validateModelTurnOutput } from "./validation";
import type {
  ModelAdapter,
  ModelResponseMetadata,
} from "@/src/adapters/model/types";
import type {
  ExperimentStore,
  AppendModelRunInput,
} from "./store";
import type { TurnRecord, ValidationIssue } from "./types";

export type RunTurnResult = {
  owner: boolean;
  turn: TurnRecord;
  committed: boolean;
  reusedPersistedResponse: boolean;
};

function errorIssue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

function metadata(
  adapter: ModelAdapter,
  kind: AppendModelRunInput["kind"],
  rawInput: unknown,
  rawOutput: unknown,
  validationErrors: ValidationIssue[],
  startedAt: string,
  finishedAt: string,
  responseMetadata?: ModelResponseMetadata | null,
): AppendModelRunInput {
  return {
    kind,
    adapter: adapter.name,
    modelIdentifier:
      responseMetadata?.providerModel ?? adapter.modelIdentifier,
    promptVersion: adapter.promptVersion || PROMPT_VERSION,
    rawInput,
    rawOutput,
    validationErrors,
    startedAt,
    finishedAt,
    latencyMs: Date.parse(finishedAt) - Date.parse(startedAt),
    inputTokens: responseMetadata?.inputTokens ?? null,
    outputTokens: responseMetadata?.outputTokens ?? null,
    finishReason: responseMetadata?.finishReason ?? null,
  };
}

function latestPersistedResponse(turn: TurnRecord): unknown | undefined {
  const runs = [...turn.modelRuns]
    .reverse()
    .filter(
      (run) =>
        (run.kind === "generation" || run.kind === "repair") &&
        run.rawOutput !== null &&
        run.rawOutput !== undefined,
    );
  return runs[0]?.rawOutput;
}

export class TurnEngine {
  constructor(
    private readonly store: ExperimentStore,
    private readonly adapter: ModelAdapter,
  ) {}

  async runNextTurn(experimentId: string): Promise<RunTurnResult> {
    const claim = this.store.claimNextTurn(experimentId);
    if (!claim.owner) {
      return {
        owner: false,
        turn: claim.turn,
        committed: claim.turn.status === "COMMITTED",
        reusedPersistedResponse: false,
      };
    }
    return this.executeClaimedTurn(claim.turn, false);
  }

  async recoverStaleTurn(
    experimentId: string,
    cycle: number,
    staleAfterMs: number,
  ): Promise<RunTurnResult> {
    const claim = this.store.recoverStaleTurn(
      experimentId,
      cycle,
      staleAfterMs,
    );
    if (!claim.owner) {
      return {
        owner: false,
        turn: claim.turn,
        committed: claim.turn.status === "COMMITTED",
        reusedPersistedResponse: false,
      };
    }
    return this.executeClaimedTurn(claim.turn, true);
  }

  async runUntilStopped(experimentId: string): Promise<RunTurnResult[]> {
    const results: RunTurnResult[] = [];
    while (true) {
      const experiment = this.store.getExperiment(experimentId);
      if (
        !experiment ||
        experiment.committedCycle >= experiment.totalCycles ||
        experiment.status === "paused"
      ) {
        break;
      }
      const result = await this.runNextTurn(experimentId);
      results.push(result);
      if (
        !result.owner ||
        result.turn.status !== "COMMITTED"
      ) {
        break;
      }
    }
    return results;
  }

  private async executeClaimedTurn(
    claimedTurn: TurnRecord,
    recoverExistingResponse: boolean,
  ): Promise<RunTurnResult> {
    const experiment = this.store.getExperiment(claimedTurn.experimentId);
    if (!experiment) {
      throw new Error("Experiment disappeared before turn execution.");
    }
    const state = this.store.getCurrentState(claimedTurn.experimentId);
    let input = claimedTurn.inputSnapshot;
    let refMap = claimedTurn.refMapSnapshot;
    if (!input || !refMap) {
      const built = buildTurnInput(experiment, state, claimedTurn.cycle);
      input = built.input;
      refMap = built.refMap;
      this.store.saveTurnInput(
        claimedTurn.id,
        claimedTurn.executionToken as string,
        input,
        refMap,
      );
    }

    const executionToken = claimedTurn.executionToken as string;
    let rawOutput: unknown;
    let reusedPersistedResponse = false;
    if (recoverExistingResponse) {
      rawOutput = latestPersistedResponse(claimedTurn);
      reusedPersistedResponse = rawOutput !== undefined;
    }

    if (rawOutput === undefined) {
      const startedAt = new Date().toISOString();
      try {
        rawOutput = await this.adapter.generateTurn(input);
      } catch (error) {
        const finishedAt = new Date().toISOString();
        const issues = [
          errorIssue(
            "$model",
            "transport",
            error instanceof Error ? error.message : "Model request failed.",
          ),
        ];
        this.store.appendModelRun(
          claimedTurn.id,
          executionToken,
          metadata(
            this.adapter,
            "transport",
            input,
            null,
            issues,
            startedAt,
            finishedAt,
          ),
        );
        const failed = this.store.failTurn(
          claimedTurn.id,
          executionToken,
          issues,
          "transport",
          false,
        );
        return {
          owner: true,
          turn: failed,
          committed: false,
          reusedPersistedResponse,
        };
      }
      const firstValidation = validateModelTurnOutput(
        rawOutput,
        input,
        refMap,
        state,
        claimedTurn.residentId,
      );
      const finishedAt = new Date().toISOString();
      this.store.appendModelRun(
        claimedTurn.id,
        executionToken,
        metadata(
          this.adapter,
          "generation",
          input,
          rawOutput,
          firstValidation.ok ? [] : firstValidation.issues,
          startedAt,
          finishedAt,
          this.adapter.getLastResponseMetadata?.(),
        ),
      );
    }

    if (rawOutput !== undefined) {
      this.store.markOutputReceived(claimedTurn.id, executionToken);
    }

    let validation = validateModelTurnOutput(
      rawOutput,
      input,
      refMap,
      state,
      claimedTurn.residentId,
    );

    if (!validation.ok) {
      const errors = validationErrorStrings(validation.issues);
      if (!this.adapter.repairTurn || MAX_OUTPUT_REPAIR_ATTEMPTS < 1) {
        const failed = this.store.failTurn(
          claimedTurn.id,
          executionToken,
          validation.issues,
          "validation",
          experiment.kind === "baseline",
        );
        return {
          owner: true,
          turn: failed,
          committed: false,
          reusedPersistedResponse,
        };
      }
      const startedAt = new Date().toISOString();
      let repairedOutput: unknown;
      try {
        repairedOutput = await this.adapter.repairTurn(
          input,
          rawOutput,
          errors,
        );
      } catch (error) {
        const finishedAt = new Date().toISOString();
        const repairIssues = [
          errorIssue(
            "$repair",
            "transport",
            error instanceof Error
              ? error.message
              : "Repair request failed.",
          ),
        ];
        this.store.appendModelRun(
          claimedTurn.id,
          executionToken,
          metadata(
            this.adapter,
            "transport",
            {
              input,
              repairPrompt: renderRepairPrompt(input, rawOutput, errors),
            },
            null,
            repairIssues,
            startedAt,
            finishedAt,
            this.adapter.getLastResponseMetadata?.(),
          ),
        );
        const failed = this.store.failTurn(
          claimedTurn.id,
          executionToken,
          repairIssues,
          "transport",
          false,
        );
        return {
          owner: true,
          turn: failed,
          committed: false,
          reusedPersistedResponse,
        };
      }
      validation = validateModelTurnOutput(
        repairedOutput,
        input,
        refMap,
        state,
        claimedTurn.residentId,
      );
      const finishedAt = new Date().toISOString();
      this.store.appendModelRun(
        claimedTurn.id,
        executionToken,
        metadata(
          this.adapter,
          "repair",
          {
            input,
            repairPrompt: renderRepairPrompt(input, rawOutput, errors),
          },
          repairedOutput,
          validation.ok ? [] : validation.issues,
          startedAt,
          finishedAt,
          this.adapter.getLastResponseMetadata?.(),
        ),
      );
      this.store.markOutputReceived(claimedTurn.id, executionToken);
      rawOutput = repairedOutput;
    }

    if (!validation.ok) {
      const failed = this.store.failTurn(
        claimedTurn.id,
        executionToken,
        validation.issues,
        "validation",
        experiment.kind === "baseline",
      );
      return {
        owner: true,
        turn: failed,
        committed: false,
        reusedPersistedResponse,
      };
    }

    const validated = this.store.markValidated(
      claimedTurn.id,
      executionToken,
      validation.output,
    );
    try {
      const committed = this.store.commitTurn(
        validated.id,
        executionToken,
        validation.output,
      );
      return {
        owner: true,
        turn: committed,
        committed: true,
        reusedPersistedResponse,
      };
    } catch (error) {
      const issues = [
        errorIssue(
          "$commit",
          "commit",
          error instanceof Error ? error.message : "Atomic commit failed.",
        ),
      ];
      const failed = this.store.failTurn(
        claimedTurn.id,
        executionToken,
        issues,
        "transport",
        false,
      );
      return {
        owner: true,
        turn: failed,
        committed: false,
        reusedPersistedResponse,
      };
    }
  }
}
