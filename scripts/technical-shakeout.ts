import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TechnicalFaultInjectionAdapter } from "../src/adapters/model/technical-fault";
import { CloudModelAdapter } from "../src/adapters/model/cloud";
import type { ModelAdapter } from "../src/adapters/model/types";
import {
  DEFAULT_MODEL_PARAMETERS,
  DRIFT_BASELINE_VERSION,
  INITIAL_STATE_VERSION,
  JOURNAL_WINDOW,
  PROMPT_VERSION,
  STALE_GENERATION_MS,
  WEATHER_FIXTURE_VERSION,
} from "../src/core/constants";
import { TurnEngine, type RunTurnResult } from "../src/core/engine";
import { buildWorstCaseTurnInput } from "../src/core/context";
import { buildTurnInput } from "../src/core/input";
import {
  measurePromptContext,
  renderResidentPrompt,
} from "../src/core/prompt";
import { SqliteExperimentStore } from "../src/server/db/sqlite-store";
import type { Experiment, ModelRun, TurnInput, TurnRecord } from "../src/core/types";

const DEFAULT_NORMAL_TURNS = 3;
const CONTEXT_SAFETY_MARGIN_TOKENS = 512;

type ShakeoutOptions = {
  mode: "preflight" | "run";
  normalTurns: number;
  exerciseRepair: boolean;
  exerciseTransportRetry: boolean;
  contextProbe: boolean;
};

type CloudConfiguration = {
  apiKey: string;
  endpoint: string;
  modelIdentifier: string;
  contextWindow: number | null;
};

type ReportedRun = {
  attempt: number;
  kind: ModelRun["kind"];
  adapter: string;
  modelIdentifier: string;
  promptVersion: string;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  jsonOnly: boolean | null;
  validationErrorCodes: string[];
};

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + stableJson(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value) ?? String(value);
}

function isJsonOnly(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptions(argv: string[]): ShakeoutOptions {
  let mode: ShakeoutOptions["mode"] = "preflight";
  let normalTurns = DEFAULT_NORMAL_TURNS;
  let exerciseRepair = true;
  let exerciseTransportRetry = true;
  let contextProbe = true;

  for (const argument of argv) {
    if (argument === "--run") {
      mode = "run";
    } else if (argument === "--preflight") {
      mode = "preflight";
    } else if (argument === "--no-repair") {
      exerciseRepair = false;
    } else if (argument === "--no-transport-retry") {
      exerciseTransportRetry = false;
    } else if (argument === "--no-context-probe") {
      contextProbe = false;
    } else if (argument.startsWith("--turns=")) {
      const parsed = parsePositiveInteger(argument.slice("--turns=".length));
      if (!parsed || parsed > 5) {
        throw new Error("--turns must be an integer between 1 and 5.");
      }
      normalTurns = parsed;
    } else {
      throw new Error("Unknown shakeout option: " + argument);
    }
  }

  return {
    mode,
    normalTurns,
    exerciseRepair,
    exerciseTransportRetry,
    contextProbe,
  };
}

function preflightReport(): Record<string, unknown> {
  const configuredAdapter = process.env.FOLKS_MODEL_ADAPTER ?? "unset (defaults to fake)";
  const cloudConfigured = configuredAdapter === "cloud";
  const credentialPresent = hasEnv("OPENAI_API_KEY");
  const modelPresent = hasEnv("FOLKS_MODEL_ID");
  const contextWindowPresent = parsePositiveInteger(
    process.env.FOLKS_MODEL_CONTEXT_WINDOW,
  ) !== null;
  const ready =
    cloudConfigured && credentialPresent && modelPresent && contextWindowPresent;

  return {
    issue: 5,
    mode: "preflight",
    status: ready ? "ready-to-run" : "blocked",
    configuredAdapter,
    requiredEnvironment: {
      FOLKS_MODEL_ADAPTER: cloudConfigured ? "cloud" : "missing-or-not-cloud",
      OPENAI_API_KEY: credentialPresent ? "set" : "missing",
      FOLKS_MODEL_ID: modelPresent ? "set" : "missing",
      FOLKS_MODEL_CONTEXT_WINDOW: contextWindowPresent ? "set" : "missing",
    },
    database: {
      default: "fresh disposable temporary SQLite database",
      override: "FOLKS_SHAKEOUT_DATABASE_PATH",
    },
    meaningfulBaseline: {
      created: false,
      run: false,
      policy: "never created by this runner",
    },
  };
}

function readCloudConfiguration(): CloudConfiguration {
  const configuredAdapter = process.env.FOLKS_MODEL_ADAPTER ?? "fake";
  if (configuredAdapter !== "cloud") {
    throw new Error(
      "Real-provider shakeout requires FOLKS_MODEL_ADAPTER=cloud; no provider request was made.",
    );
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Real-provider shakeout requires OPENAI_API_KEY in the local environment; no provider request was made.",
    );
  }
  const modelIdentifier = process.env.FOLKS_MODEL_ID?.trim();
  if (!modelIdentifier) {
    throw new Error(
      "Real-provider shakeout requires an explicit FOLKS_MODEL_ID; no provider request was made.",
    );
  }
  return {
    apiKey,
    endpoint:
      process.env.FOLKS_MODEL_API_URL ??
      "https://api.openai.com/v1/chat/completions",
    modelIdentifier,
    contextWindow: parsePositiveInteger(process.env.FOLKS_MODEL_CONTEXT_WINDOW),
  };
}

function createShakeoutAdapter(configuration: CloudConfiguration): {
  cloud: CloudModelAdapter;
  adapter: TechnicalFaultInjectionAdapter;
} {
  const cloud = new CloudModelAdapter({
    endpoint: configuration.endpoint,
    apiKey: configuration.apiKey,
    modelIdentifier: configuration.modelIdentifier,
    temperature: DEFAULT_MODEL_PARAMETERS.temperature,
    maxOutputTokens: DEFAULT_MODEL_PARAMETERS.maxOutputTokens,
  });
  return { cloud, adapter: new TechnicalFaultInjectionAdapter(cloud) };
}

function createTechnicalExperiment(
  store: SqliteExperimentStore,
  adapter: ModelAdapter,
): Experiment {
  return store.createExperiment({
    name: "Issue #5 real-provider technical shakeout",
    kind: "technical",
    modelAdapter: adapter.name,
    modelIdentifier: adapter.modelIdentifier,
    modelParameters: { ...adapter.modelParameters },
    promptVersion: adapter.promptVersion,
    driftFixtureVersion: DRIFT_BASELINE_VERSION,
    weatherFixtureVersion: WEATHER_FIXTURE_VERSION,
    initialStateVersion: INITIAL_STATE_VERSION,
  });
}

async function runWithTransportRetry(
  engine: TurnEngine,
  experimentId: string,
): Promise<RunTurnResult> {
  let result = await engine.runNextTurn(experimentId);
  if (result.turn.status === "FAILED" && result.turn.failureKind === "transport") {
    result = await engine.runNextTurn(experimentId);
  }
  return result;
}

function reportedRun(run: ModelRun): ReportedRun {
  return {
    attempt: run.attempt,
    kind: run.kind,
    adapter: run.adapter,
    modelIdentifier: run.modelIdentifier,
    promptVersion: run.promptVersion,
    latencyMs: run.latencyMs,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    finishReason: run.finishReason,
    jsonOnly:
      run.rawOutput === null || run.rawOutput === undefined
        ? null
        : isJsonOnly(run.rawOutput),
    validationErrorCodes: run.validationErrors.map((issue) => issue.code),
  };
}

function reportedTurn(turn: TurnRecord | null): Record<string, unknown> {
  if (!turn) {
    return { status: "missing" };
  }
  return {
    cycle: turn.cycle,
    residentId: turn.residentId,
    status: turn.status,
    failureKind: turn.failureKind,
    modelRuns: turn.modelRuns.map(reportedRun),
  };
}

function buildWorstCaseInput(
  experiment: Experiment,
  store: SqliteExperimentStore,
): TurnInput {
  return buildWorstCaseTurnInput(
    experiment,
    store.getCurrentState(experiment.id),
  );
}

function residentBoundaryCheck(
  experiment: Experiment,
  store: SqliteExperimentStore,
): { passed: boolean; leakedFields: string[] } {
  const state = store.getCurrentState(experiment.id);
  state.privateNotes.push({
    id: "private-other-resident-sentinel",
    experimentId: experiment.id,
    residentId: "fia",
    cycle: 1,
    text: "other-resident-private-sentinel",
    createdAt: new Date().toISOString(),
  });
  const built = buildTurnInput(experiment, state, 1);
  const serialized = JSON.stringify(built.input) + "\n" + renderResidentPrompt(built.input);
  const checks: Array<[string, string]> = [
    ["experiment id", experiment.id],
    ["other private note", "other-resident-private-sentinel"],
    ["private note database id", "private-other-resident-sentinel"],
    ["internal object id", "object_01"],
    ["internal place id", "place_01"],
    ["total cycle field", "totalCycles"],
    ["provider metadata field", "modelIdentifier"],
    ["provider metadata label", "provider"],
  ];
  return {
    passed: checks.every(([, value]) => !serialized.includes(value)),
    leakedFields: checks
      .filter(([, value]) => serialized.includes(value))
      .map(([label]) => label),
  };
}

function gitIdentity(): { commit: string | null; dirty: boolean | null } {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const dirty =
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim().length > 0;
    return { commit, dirty };
  } catch {
    return { commit: null, dirty: null };
  }
}

function redactedError(error: unknown, configuration: CloudConfiguration): string {
  let message = error instanceof Error ? error.message : String(error);
  message = message.split(configuration.apiKey).join("[REDACTED]");
  message = message.split(configuration.endpoint).join("[REDACTED_ENDPOINT]");
  return message;
}

async function runShakeout(
  options: ShakeoutOptions,
  configuration: CloudConfiguration,
): Promise<Record<string, unknown>> {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "folks-issue-5-"));
  const databasePath =
    process.env.FOLKS_SHAKEOUT_DATABASE_PATH ?? join(temporaryDirectory, "shakeout.db");
  const store = SqliteExperimentStore.fromPath(databasePath);
  const { cloud, adapter } = createShakeoutAdapter(configuration);
  const experiment = createTechnicalExperiment(store, adapter);
  const engine = new TurnEngine(store, adapter);
  const normalTurns: Array<Record<string, unknown>> = [];
  let repairFirst: RunTurnResult | null = null;
  let repairRetry: RunTurnResult | null = null;
  let contextProbe: Record<string, unknown>;

  try {
    for (let index = 0; index < options.normalTurns; index += 1) {
      const result = await runWithTransportRetry(engine, experiment.id);
      normalTurns.push(reportedTurn(store.getTurn(result.turn.id)));
      if (!result.committed) {
        break;
      }
    }

    let repairTurn: Record<string, unknown> = { status: "not-requested" };
    const generationCallsBeforeRepair = adapter.generationCalls;
    if (
      options.exerciseRepair &&
      normalTurns.length === options.normalTurns &&
      normalTurns.every((turn) => turn.status === "COMMITTED")
    ) {
      adapter.forceInvalidNextGeneration();
      if (options.exerciseTransportRetry) {
        adapter.forceNextRepairTransportFailure();
      }
      repairFirst = await engine.runNextTurn(experiment.id);
      if (
        repairFirst.turn.status === "FAILED" &&
        repairFirst.turn.failureKind === "transport"
      ) {
        repairRetry = await engine.runNextTurn(experiment.id);
      }
      repairTurn = reportedTurn(
        store.getTurn((repairRetry ?? repairFirst).turn.id),
      );
    }

    const worstCaseInput = buildWorstCaseInput(experiment, store);
    const contextMeasurement = measurePromptContext(worstCaseInput);
    if (options.contextProbe) {
      const startedAt = Date.now();
      try {
        const rawOutput = await cloud.generateTurn(worstCaseInput);
        const metadata = cloud.getLastResponseMetadata?.() ?? null;
        contextProbe = {
          requested: true,
          succeeded: true,
          latencyMs: Date.now() - startedAt,
          inputTokens: metadata?.inputTokens ?? null,
          outputTokens: metadata?.outputTokens ?? null,
          providerModel: metadata?.providerModel ?? null,
          finishReason: metadata?.finishReason ?? null,
          jsonOnly: isJsonOnly(rawOutput),
        };
      } catch (error) {
        contextProbe = {
          requested: true,
          succeeded: false,
          error: redactedError(error, configuration),
        };
      }
    } else {
      contextProbe = { requested: false };
    }

    const boundary = residentBoundaryCheck(experiment, store);
    const lab = store.getLabView(experiment.id);
    const observedProviderModels = [
      ...new Set(
        lab.turns
          .flatMap((turn) => turn.modelRuns)
          .filter(
            (run) =>
              (run.kind === "generation" || run.kind === "repair") &&
              run.rawOutput !== null &&
              run.rawOutput !== undefined,
          )
          .map((run) => run.modelIdentifier),
      ),
    ];
    const frozenConfigMatches =
      experiment.modelAdapter === adapter.name &&
      experiment.modelIdentifier === adapter.modelIdentifier &&
      experiment.promptVersion === adapter.promptVersion &&
      stableJson(experiment.modelParameters) === stableJson(adapter.modelParameters);
    const auditJson = JSON.stringify(store.getAuditExport(experiment.id));
    const credentialAbsentFromAudit = !auditJson.includes(configuration.apiKey);
    const normalStructuredOutput =
      normalTurns.length === options.normalTurns &&
      normalTurns.every(
        (turn) =>
          turn.status === "COMMITTED" &&
          Array.isArray(turn.modelRuns) &&
          (turn.modelRuns as Array<ReportedRun>)
            .filter((run) => run.kind === "generation" || run.kind === "repair")
            .some((run) => run.jsonOnly === true) &&
          (turn.modelRuns as Array<ReportedRun>)
            .filter((run) => run.kind === "generation" || run.kind === "repair")
            .every((run) => run.jsonOnly === true),
      );
    const repairRuns = repairFirst
      ? store.getTurn(repairFirst.turn.id)?.modelRuns ?? []
      : [];
    const repairGenerationRuns = repairRuns.filter(
      (run) => run.kind === "generation" && run.rawOutput !== null,
    );
    const repairAttempts = repairRuns.filter(
      (run) => run.kind === "repair" && run.rawOutput !== null,
    );
    const repairVerified =
      options.exerciseRepair &&
      repairGenerationRuns.length === 1 &&
      repairAttempts.length === 1 &&
      repairGenerationRuns.every((run) => reportedRun(run).jsonOnly === true) &&
      repairAttempts.every((run) => reportedRun(run).jsonOnly === true) &&
      (repairRetry ?? repairFirst)?.committed === true;
    const transportRetryVerified = options.exerciseTransportRetry
      ? repairRuns.filter((run) => run.kind === "transport").length === 1 &&
        repairGenerationRuns.length === 1 &&
        repairRetry?.reusedPersistedResponse === true &&
        adapter.generationCalls === generationCallsBeforeRepair + 1
      : true;
    const contextInputTokens =
      typeof contextProbe.inputTokens === "number"
        ? contextProbe.inputTokens
        : null;
    const effectiveContextInputTokens = Math.max(
      contextMeasurement.estimatedTokens,
      contextInputTokens ?? 0,
    );
    const contextHeadroom =
      configuration.contextWindow === null
        ? null
        : configuration.contextWindow -
          effectiveContextInputTokens -
          DEFAULT_MODEL_PARAMETERS.maxOutputTokens;
    const contextVerified =
      options.contextProbe &&
      contextProbe.succeeded === true &&
      configuration.contextWindow !== null &&
      contextHeadroom !== null &&
      contextHeadroom >= CONTEXT_SAFETY_MARGIN_TOKENS;
    const restoredStore = SqliteExperimentStore.fromPath(databasePath);
    const restoredExperiment = restoredStore.getExperiment(experiment.id);
    const resumeConfigMatches =
      restoredExperiment !== null &&
      restoredExperiment.modelAdapter === adapter.name &&
      restoredExperiment.modelIdentifier === adapter.modelIdentifier &&
      restoredExperiment.promptVersion === adapter.promptVersion &&
      stableJson(restoredExperiment.modelParameters) ===
        stableJson(adapter.modelParameters) &&
      restoredExperiment.driftFixtureVersion === DRIFT_BASELINE_VERSION &&
      restoredExperiment.weatherFixtureVersion === WEATHER_FIXTURE_VERSION &&
      restoredExperiment.initialStateVersion === INITIAL_STATE_VERSION &&
      restoredExperiment.journalWindow === JOURNAL_WINDOW;
    restoredStore.close();

    const gates = {
      normalStructuredOutput,
      repairPathAuditable: repairVerified,
      repairTransportRetryWithoutCreativeResampling: transportRetryVerified,
      contextMargin: contextVerified,
      residentBoundary: boundary.passed,
      frozenConfigOnResume: frozenConfigMatches && resumeConfigMatches,
      credentialHygiene: credentialAbsentFromAudit,
    };
    const allGatesPassed = Object.values(gates).every(Boolean);
    const baselineModelIdentifier =
      observedProviderModels.length === 1
        ? observedProviderModels[0]
        : "not-frozen-until-provider-model-is-unambiguous";

    const report = {
      issue: 5,
      mode: "real-provider-technical-shakeout",
      status: allGatesPassed ? "passed" : "blocked",
      generatedAt: new Date().toISOString(),
      codeIdentity: gitIdentity(),
      database: {
        path: databasePath,
        disposable: true,
      },
      meaningfulBaseline: {
        created: false,
        run: false,
        policy: "never created by this runner",
      },
      experiment: {
        kind: experiment.kind,
        promptVersion: experiment.promptVersion,
        driftFixtureVersion: experiment.driftFixtureVersion,
        weatherFixtureVersion: experiment.weatherFixtureVersion,
        initialStateVersion: experiment.initialStateVersion,
        journalWindow: experiment.journalWindow,
        totalCycles: experiment.totalCycles,
      },
      provider: {
        provider: "OpenAI-compatible",
        adapter: adapter.name,
        configuredModelIdentifier: adapter.modelIdentifier,
        observedModelIdentifiers: observedProviderModels,
        modelParameters: adapter.modelParameters,
        responseFormat: DEFAULT_MODEL_PARAMETERS.responseFormat,
      },
      normalTurns,
      repairPath: {
        requested: options.exerciseRepair,
        firstAttempt: repairFirst ? reportedTurn(repairFirst.turn) : null,
        retryAttempt: repairRetry ? reportedTurn(repairRetry.turn) : null,
        final: repairTurn,
        generationCalls: adapter.generationCalls,
        repairCalls: adapter.repairCalls,
      },
      context: {
        estimatedCharacters: contextMeasurement.characters,
        estimatedInputTokens: contextMeasurement.estimatedTokens,
        providerInputTokens: contextInputTokens,
        providerOutputTokens:
          typeof contextProbe.outputTokens === "number"
            ? contextProbe.outputTokens
            : null,
        providerContextWindow: configuration.contextWindow,
        reservedMaxOutputTokens: DEFAULT_MODEL_PARAMETERS.maxOutputTokens,
        safetyMarginTokens: CONTEXT_SAFETY_MARGIN_TOKENS,
        headroomTokens: contextHeadroom,
        probe: contextProbe,
      },
      residentBoundary: boundary,
      frozenConfiguration: {
        matchesDuringExecution: frozenConfigMatches,
        matchesAfterReload: resumeConfigMatches,
      },
      gates,
      proposedBaselineConfiguration: {
        status: allGatesPassed ? "ready-for-review" : "not-frozen",
        provider: "OpenAI-compatible",
        adapter: adapter.name,
        providerModelIdentifier: baselineModelIdentifier,
        promptVersion: PROMPT_VERSION,
        temperature: DEFAULT_MODEL_PARAMETERS.temperature,
        maxOutputTokens: DEFAULT_MODEL_PARAMETERS.maxOutputTokens,
        responseFormat: DEFAULT_MODEL_PARAMETERS.responseFormat,
        driftFixtureVersion: DRIFT_BASELINE_VERSION,
        weatherFixtureVersion: WEATHER_FIXTURE_VERSION,
        initialStateVersion: INITIAL_STATE_VERSION,
        journalWindow: JOURNAL_WINDOW,
        transportRetryPolicy:
          "technical runs may retry transport; baseline never creatively resamples after a response and allows at most one structural repair",
        codeIdentity: gitIdentity(),
      },
      staleRecoveryPolicyMs: STALE_GENERATION_MS,
    };
    const reportJson = JSON.stringify(report);
    if (reportJson.includes(configuration.apiKey)) {
      throw new Error("Credential hygiene check failed before report output.");
    }
    console.log(JSON.stringify(report, null, 2));
    if (!allGatesPassed) {
      process.exitCode = 2;
    }
    return report;
  } finally {
    store.close();
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.mode === "preflight") {
    console.log(JSON.stringify(preflightReport(), null, 2));
    return;
  }
  const configuration = readCloudConfiguration();
  await runShakeout(options, configuration);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Technical shakeout could not run.",
  );
  process.exitCode = 2;
});
