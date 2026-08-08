import {
  DEFAULT_MODEL_PARAMETERS,
  DRIFT_BASELINE_VERSION,
  INITIAL_STATE_VERSION,
  JOURNAL_WINDOW,
  PROMPT_VERSION,
  RESIDENTS,
  TOTAL_CYCLES,
  WEATHER_FIXTURE_VERSION,
  isExperimentTerminal,
  residentForCycle,
} from "./constants";
import { DRIFT_NEUTRAL_JA, PLACES, weatherForCycle, driftForCycle } from "./fixtures";
import { buildTurnInput } from "./input";
import {
  cloneState,
  createInitialState,
  getRelationship,
  residentName,
  setRelationship,
} from "./state";
import type {
  ClaimResult,
  CurrentState,
  Experiment,
  ExperimentKind,
  ExperimentStatus,
  FolksViewModel,
  JournalEntry,
  LabViewModel,
  ModelRun,
  RelationshipEvent,
  TurnInput,
  TurnOutput,
  TurnRecord,
  TurnRefMap,
  ValidationIssue,
  WorldEvent,
} from "./types";

export type CreateExperimentInput = {
  id?: string;
  name?: string;
  kind?: ExperimentKind;
  modelAdapter?: string;
  modelIdentifier?: string;
  modelParameters?: Record<string, unknown>;
  randomSeed?: string | null;
  promptVersion?: string;
  driftFixtureVersion?: string;
  weatherFixtureVersion?: string;
  initialStateVersion?: string;
  createdAt?: string;
};

export type AppendModelRunInput = Omit<
  ModelRun,
  "id" | "turnId" | "attempt"
> & {
  id?: string;
};

export type ExperimentSnapshot = {
  experiment: Experiment;
  state: CurrentState;
  turns: TurnRecord[];
};

export interface ExperimentStore {
  createExperiment(input?: CreateExperimentInput): Experiment;
  duplicateExperiment(experimentId: string, name?: string): Experiment;
  pauseExperiment(experimentId: string): Experiment;
  getExperiment(experimentId: string): Experiment | null;
  listExperiments(): Experiment[];
  getCurrentState(experimentId: string): CurrentState;
  getTurn(turnId: string): TurnRecord | null;
  getTurnByCycle(experimentId: string, cycle: number): TurnRecord | null;
  claimNextTurn(experimentId: string, now?: string): ClaimResult;
  recoverStaleTurn(
    experimentId: string,
    cycle: number,
    staleAfterMs: number,
    now?: string,
  ): ClaimResult;
  saveTurnInput(
    turnId: string,
    executionToken: string,
    input: TurnInput,
    refMap: TurnRefMap,
    now?: string,
  ): TurnRecord;
  appendModelRun(
    turnId: string,
    executionToken: string,
    run: AppendModelRunInput,
  ): TurnRecord;
  markOutputReceived(
    turnId: string,
    executionToken: string,
    now?: string,
  ): TurnRecord;
  markValidated(
    turnId: string,
    executionToken: string,
    output: TurnOutput,
    now?: string,
  ): TurnRecord;
  commitTurn(
    turnId: string,
    executionToken: string,
    output: TurnOutput,
    now?: string,
  ): TurnRecord;
  failTurn(
    turnId: string,
    executionToken: string,
    issues: ValidationIssue[],
    failureKind: "transport" | "validation",
    terminalExperimentFailure: boolean,
    now?: string,
  ): TurnRecord;
  getFolksView(experimentId: string): FolksViewModel;
  getLabView(experimentId: string): LabViewModel;
  getAuditExport(experimentId: string): Record<string, unknown>;
}

function makeId(prefix: string): string {
  return prefix + "_" + crypto.randomUUID();
}

function nowIso(value?: string): string {
  return value ?? new Date().toISOString();
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function assertToken(turn: TurnRecord, executionToken: string): void {
  if (turn.executionToken !== executionToken) {
    throw new Error("This turn execution no longer owns the claim.");
  }
}

function initialTurn(experimentId: string, cycle: number, now: string): TurnRecord {
  return {
    id: makeId("turn"),
    experimentId,
    cycle,
    residentId: residentForCycle(cycle),
    status: "GENERATING",
    executionToken: crypto.randomUUID(),
    claimedAt: now,
    updatedAt: now,
    inputSnapshot: null,
    refMapSnapshot: null,
    validatedOutputSnapshot: null,
    validationErrors: [],
    failureKind: null,
    committedAt: null,
    modelRuns: [],
  };
}

function createExperimentRecord(input: CreateExperimentInput): Experiment {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? makeId("experiment"),
    name:
      input.name ??
      (input.kind === "technical" ? "FOLKS technical shakeout" : "FOLKS v0 baseline"),
    kind: input.kind ?? "baseline",
    status: "draft",
    committedCycle: 0,
    totalCycles: TOTAL_CYCLES,
    journalWindow: JOURNAL_WINDOW,
    language: "ja",
    promptVersion: input.promptVersion ?? PROMPT_VERSION,
    driftFixtureVersion: input.driftFixtureVersion ?? DRIFT_BASELINE_VERSION,
    weatherFixtureVersion: input.weatherFixtureVersion ?? WEATHER_FIXTURE_VERSION,
    initialStateVersion: input.initialStateVersion ?? INITIAL_STATE_VERSION,
    modelAdapter: input.modelAdapter ?? "fake",
    modelIdentifier: input.modelIdentifier ?? "folks-fake-v0",
    modelParameters: input.modelParameters ?? { ...DEFAULT_MODEL_PARAMETERS },
    randomSeed: input.randomSeed ?? null,
    createdAt,
    completedAt: null,
  };
}

function applyOutputToState(
  state: CurrentState,
  experimentId: string,
  turn: TurnRecord,
  output: TurnOutput,
  now: string,
): {
  state: CurrentState;
  journalEntry: JournalEntry;
  privateNote: CurrentState["privateNotes"][number] | null;
  relationshipEvent: RelationshipEvent | null;
  worldEvent: WorldEvent | null;
} {
  const nextState = cloneState(state);
  const journalEntry: JournalEntry = {
    id: makeId("journal"),
    experimentId,
    cycle: turn.cycle,
    authorId: turn.residentId,
    publicText: output.journalText,
    questionForNext: output.questionForNext,
    createdAt: now,
  };
  nextState.journal.push(journalEntry);

  const privateNote = output.privateNote
    ? {
        id: makeId("private"),
        experimentId,
        residentId: turn.residentId,
        cycle: turn.cycle,
        text: output.privateNote,
        createdAt: now,
      }
    : null;
  if (privateNote) {
    nextState.privateNotes.push(privateNote);
  }

  let relationshipEvent: RelationshipEvent | null = null;
  if (output.relationshipChange) {
    const targetId = output.relationshipChange.residentId;
    const before = getRelationship(nextState, turn.residentId, targetId);
    const after = before + output.relationshipChange.delta;
    if (after < -3 || after > 3) {
      throw new Error("Relationship change would leave configured bounds.");
    }
    relationshipEvent = {
      id: makeId("relationship"),
      experimentId,
      cycle: turn.cycle,
      actorId: turn.residentId,
      targetId,
      delta: output.relationshipChange.delta,
      reason: output.relationshipChange.reason,
      before,
      after: after as -3 | -2 | -1 | 0 | 1 | 2 | 3,
      createdAt: now,
    };
    setRelationship(nextState, turn.residentId, targetId, relationshipEvent.after);
    nextState.relationshipEvents.push(relationshipEvent);
  }

  let worldEvent: WorldEvent | null = null;
  if (output.worldAction) {
    const object = nextState.objects[output.worldAction.objectId];
    if (!object) {
      throw new Error("The selected object no longer exists.");
    }
    if (object.locationId === output.worldAction.destinationPlaceId) {
      throw new Error("The selected world action is a no-op.");
    }
    worldEvent = {
      id: makeId("world"),
      experimentId,
      cycle: turn.cycle,
      actorId: turn.residentId,
      type: "object_moved",
      payload: {
        objectId: object.id,
        fromPlaceId: object.locationId,
        toPlaceId: output.worldAction.destinationPlaceId,
      },
      createdAt: now,
    };
    object.locationId = output.worldAction.destinationPlaceId;
    nextState.worldEvents.push(worldEvent);
  }

  return {
    state: nextState,
    journalEntry,
    privateNote,
    relationshipEvent,
    worldEvent,
  };
}

export class InMemoryExperimentStore implements ExperimentStore {
  private readonly experiments = new Map<string, Experiment>();
  private readonly states = new Map<string, CurrentState>();
  private readonly turns = new Map<string, TurnRecord>();

  exportExperimentSnapshot(experimentId: string): ExperimentSnapshot {
    const experiment = this.experiments.get(experimentId);
    const state = this.states.get(experimentId);
    if (!experiment || !state) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    return {
      experiment: copy(experiment),
      state: copy(state),
      turns: [...this.turns.values()]
        .filter((turn) => turn.experimentId === experimentId)
        .map(copy),
    };
  }

  importExperimentSnapshot(snapshot: ExperimentSnapshot): void {
    this.experiments.set(snapshot.experiment.id, copy(snapshot.experiment));
    this.states.set(snapshot.experiment.id, copy(snapshot.state));
    for (const [turnId, turn] of this.turns) {
      if (turn.experimentId === snapshot.experiment.id) {
        this.turns.delete(turnId);
      }
    }
    for (const turn of snapshot.turns) {
      this.turns.set(turn.id, copy(turn));
    }
  }

  importExperimentSnapshots(snapshots: ExperimentSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.importExperimentSnapshot(snapshot);
    }
  }

  createExperiment(input: CreateExperimentInput = {}): Experiment {
    const experiment = createExperimentRecord(input);
    if (this.experiments.has(experiment.id)) {
      throw new Error("Experiment already exists: " + experiment.id);
    }
    this.experiments.set(experiment.id, experiment);
    this.states.set(experiment.id, createInitialState());
    return copy(experiment);
  }

  duplicateExperiment(experimentId: string, name?: string): Experiment {
    const source = this.experiments.get(experimentId);
    if (!source) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    return this.createExperiment({
      name: name ?? source.name + " (new run)",
      kind: source.kind,
      modelAdapter: source.modelAdapter,
      modelIdentifier: source.modelIdentifier,
      modelParameters: copy(source.modelParameters),
      randomSeed: source.randomSeed,
      promptVersion: source.promptVersion,
      driftFixtureVersion: source.driftFixtureVersion,
      weatherFixtureVersion: source.weatherFixtureVersion,
      initialStateVersion: source.initialStateVersion,
    });
  }

  pauseExperiment(experimentId: string): Experiment {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    if (!isExperimentTerminal(experiment.status)) {
      experiment.status = "paused";
    }
    return copy(experiment);
  }

  getExperiment(experimentId: string): Experiment | null {
    const experiment = this.experiments.get(experimentId);
    return experiment ? copy(experiment) : null;
  }

  listExperiments(): Experiment[] {
    return [...this.experiments.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(copy);
  }

  getCurrentState(experimentId: string): CurrentState {
    const state = this.states.get(experimentId);
    if (!state) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    return copy(state);
  }

  getTurn(turnId: string): TurnRecord | null {
    const turn = this.turns.get(turnId);
    return turn ? copy(turn) : null;
  }

  getTurnByCycle(experimentId: string, cycle: number): TurnRecord | null {
    const turn = [...this.turns.values()].find(
      (candidate) =>
        candidate.experimentId === experimentId && candidate.cycle === cycle,
    );
    return turn ? copy(turn) : null;
  }

  claimNextTurn(experimentId: string, nowValue?: string): ClaimResult {
    const now = nowIso(nowValue);
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    const cycle = experiment.committedCycle + 1;
    if (cycle > experiment.totalCycles || experiment.status === "completed") {
      const existing = this.getTurnByCycle(experimentId, experiment.totalCycles);
      if (!existing) {
        throw new Error("The experiment has no remaining logical turns.");
      }
      return { owner: false, turn: existing };
    }
    const existing = this.getTurnByCycle(experimentId, cycle);
    if (existing) {
      if (
        existing.status === "COMMITTED" ||
        existing.status === "GENERATING" ||
        existing.status === "OUTPUT_RECEIVED" ||
        existing.status === "VALIDATED"
      ) {
        return { owner: false, turn: existing };
      }
      if (existing.status === "FAILED" && experiment.kind === "baseline") {
        return { owner: false, turn: existing };
      }
      const mutable = this.turns.get(existing.id);
      if (!mutable) {
        throw new Error("Turn disappeared during claim.");
      }
      mutable.status = "GENERATING";
      mutable.executionToken = crypto.randomUUID();
      mutable.claimedAt = now;
      mutable.updatedAt = now;
      mutable.failureKind = null;
      mutable.validationErrors = [];
      if (experiment.status === "paused") {
        experiment.status = "running";
      }
      return { owner: true, turn: copy(mutable) };
    }

    const turn = initialTurn(experimentId, cycle, now);
    this.turns.set(turn.id, turn);
    if (experiment.status === "draft" || experiment.status === "paused") {
      experiment.status = "running";
    }
    return { owner: true, turn: copy(turn) };
  }

  recoverStaleTurn(
    experimentId: string,
    cycle: number,
    staleAfterMs: number,
    nowValue?: string,
  ): ClaimResult {
    const now = nowIso(nowValue);
    const turn = this.getTurnByCycle(experimentId, cycle);
    if (!turn) {
      throw new Error("No turn exists for recovery.");
    }
    if (
      !["GENERATING", "OUTPUT_RECEIVED", "VALIDATED"].includes(turn.status) ||
      !turn.claimedAt
    ) {
      return { owner: false, turn };
    }
    const age = Date.parse(now) - Date.parse(turn.claimedAt);
    if (age <= staleAfterMs) {
      return { owner: false, turn };
    }
    const mutable = this.turns.get(turn.id);
    if (!mutable) {
      throw new Error("Turn disappeared during recovery.");
    }
    mutable.executionToken = crypto.randomUUID();
    mutable.claimedAt = now;
    mutable.updatedAt = now;
    return { owner: true, turn: copy(mutable) };
  }

  saveTurnInput(
    turnId: string,
    executionToken: string,
    input: TurnInput,
    refMap: TurnRefMap,
    nowValue?: string,
  ): TurnRecord {
    const turn = this.turns.get(turnId);
    if (!turn) {
      throw new Error("Unknown turn: " + turnId);
    }
    assertToken(turn, executionToken);
    turn.inputSnapshot = copy(input);
    turn.refMapSnapshot = copy(refMap);
    turn.status = "INPUT_CREATED";
    turn.updatedAt = nowIso(nowValue);
    turn.status = "GENERATING";
    return copy(turn);
  }

  appendModelRun(
    turnId: string,
    executionToken: string,
    run: AppendModelRunInput,
  ): TurnRecord {
    const turn = this.turns.get(turnId);
    if (!turn) {
      throw new Error("Unknown turn: " + turnId);
    }
    assertToken(turn, executionToken);
    const nextRun: ModelRun = {
      ...copy(run),
      id: run.id ?? makeId("model"),
      turnId,
      attempt: turn.modelRuns.length + 1,
    };
    turn.modelRuns.push(nextRun);
    turn.updatedAt = nowIso(run.finishedAt ?? run.startedAt);
    return copy(turn);
  }

  markOutputReceived(
    turnId: string,
    executionToken: string,
    nowValue?: string,
  ): TurnRecord {
    const turn = this.turns.get(turnId);
    if (!turn) {
      throw new Error("Unknown turn: " + turnId);
    }
    assertToken(turn, executionToken);
    turn.status = "OUTPUT_RECEIVED";
    turn.updatedAt = nowIso(nowValue);
    return copy(turn);
  }

  markValidated(
    turnId: string,
    executionToken: string,
    output: TurnOutput,
    nowValue?: string,
  ): TurnRecord {
    const turn = this.turns.get(turnId);
    if (!turn) {
      throw new Error("Unknown turn: " + turnId);
    }
    assertToken(turn, executionToken);
    turn.status = "VALIDATED";
    turn.validatedOutputSnapshot = copy(output);
    turn.updatedAt = nowIso(nowValue);
    return copy(turn);
  }

  commitTurn(
    turnId: string,
    executionToken: string,
    output: TurnOutput,
    nowValue?: string,
  ): TurnRecord {
    const turn = this.turns.get(turnId);
    if (!turn) {
      throw new Error("Unknown turn: " + turnId);
    }
    if (turn.status === "COMMITTED") {
      return copy(turn);
    }
    assertToken(turn, executionToken);
    const experiment = this.experiments.get(turn.experimentId);
    const state = this.states.get(turn.experimentId);
    if (!experiment || !state) {
      throw new Error("Experiment state is missing.");
    }
    if (experiment.committedCycle + 1 !== turn.cycle) {
      throw new Error("Turn is not the next uncommitted logical cycle.");
    }
    const now = nowIso(nowValue);
    const applied = applyOutputToState(state, turn.experimentId, turn, output, now);

    const nextTurn = copy(turn);
    nextTurn.status = "COMMITTED";
    nextTurn.validatedOutputSnapshot = copy(output);
    nextTurn.committedAt = now;
    nextTurn.updatedAt = now;
    nextTurn.executionToken = null;
    nextTurn.claimedAt = turn.claimedAt;

    const nextExperiment = copy(experiment);
    nextExperiment.committedCycle = turn.cycle;
    nextExperiment.status =
      turn.cycle === nextExperiment.totalCycles ? "completed" : "running";
    nextExperiment.completedAt =
      nextExperiment.status === "completed" ? now : null;

    this.states.set(turn.experimentId, applied.state);
    this.experiments.set(turn.experimentId, nextExperiment);
    this.turns.set(turn.id, nextTurn);
    return copy(nextTurn);
  }

  failTurn(
    turnId: string,
    executionToken: string,
    issues: ValidationIssue[],
    failureKind: "transport" | "validation",
    terminalExperimentFailure: boolean,
    nowValue?: string,
  ): TurnRecord {
    const turn = this.turns.get(turnId);
    if (!turn) {
      throw new Error("Unknown turn: " + turnId);
    }
    if (turn.status === "FAILED") {
      return copy(turn);
    }
    assertToken(turn, executionToken);
    const now = nowIso(nowValue);
    turn.status = "FAILED";
    turn.validationErrors = copy(issues);
    turn.failureKind = failureKind;
    turn.updatedAt = now;
    turn.executionToken = null;
    const experiment = this.experiments.get(turn.experimentId);
    if (experiment) {
      experiment.status = terminalExperimentFailure ? "failed" : "paused";
      experiment.completedAt = null;
    }
    return copy(turn);
  }

  getFolksView(experimentId: string): FolksViewModel {
    const experiment = this.experiments.get(experimentId);
    const state = this.states.get(experimentId);
    if (!experiment || !state) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    const nextCycle = Math.min(experiment.committedCycle + 1, experiment.totalCycles);
    const recentEntry = state.journal[state.journal.length - 1];
    const nextResident = residentForCycle(
      experiment.committedCycle >= experiment.totalCycles
        ? experiment.totalCycles + 1
        : nextCycle,
    );
    return {
      experiment: {
        name: experiment.name,
        kind: experiment.kind,
        status: experiment.status,
        committedCycle: experiment.committedCycle,
        totalCycles: experiment.totalCycles,
      },
      duty: {
        recentResidentName: recentEntry
          ? residentName(recentEntry.authorId)
          : null,
        nextResidentName: residentName(nextResident),
      },
      world: {
        weather: weatherForCycle(nextCycle),
        places: PLACES.map((place) => ({
          description: place.descriptionJa,
          objects: Object.values(state.objects)
            .filter((object) => object.locationId === place.id)
            .map((object) => object.descriptionJa),
        })),
      },
      journal: state.journal.map((entry) => ({
        cycle: entry.cycle,
        authorName: residentName(entry.authorId),
        publicText: entry.publicText,
        questionForNext: entry.questionForNext,
      })),
      drift:
        experiment.committedCycle < experiment.totalCycles
          ? driftForCycle(nextCycle, "neutral")
          : null,
    };
  }

  getLabView(experimentId: string): LabViewModel {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error("Unknown experiment: " + experimentId);
    }
    return {
      experiment: copy(experiment),
      turns: [...this.turns.values()]
        .filter((turn) => turn.experimentId === experimentId)
        .sort((a, b) => a.cycle - b.cycle)
        .map(copy),
      state: this.getCurrentState(experimentId),
      residents: copy([...RESIDENTS]),
      places: copy([...PLACES]),
      driftFixture: copy(
        DRIFT_NEUTRAL_JA.map((item) => ({ cycle: item.cycle, text: item.text })),
      ),
    };
  }

  getAuditExport(experimentId: string): Record<string, unknown> {
    const lab = this.getLabView(experimentId);
    return redactSecrets({
      experiment: lab.experiment,
      residents: lab.residents,
      places: lab.places,
      turns: lab.turns,
      state: lab.state,
      driftFixture: lab.driftFixture,
    }) as Record<string, unknown>;
  }
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (/key|secret|token|authorization|password/i.test(key)) {
        output[key] = "[redacted]";
      } else {
        output[key] = redactSecrets(nested);
      }
    }
    return output;
  }
  return value;
}
