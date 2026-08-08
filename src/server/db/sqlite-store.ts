import { eq } from "drizzle-orm";
import { createDatabase, type FolksDatabase } from "./client";
import * as dbSchema from "./schema";
import {
  DRIFT_BASELINE_VERSION,
  RESIDENTS,
} from "@/src/core/constants";
import { DRIFT_NEUTRAL_JA, INITIAL_OBJECTS, PLACES } from "@/src/core/fixtures";
import {
  InMemoryExperimentStore,
  type AppendModelRunInput,
  type CreateExperimentInput,
  type ExperimentSnapshot,
  type ExperimentStore,
} from "@/src/core/store";
import { createInitialState, setRelationship } from "@/src/core/state";
import type {
  CurrentState,
  Experiment,
  ExperimentKind,
  ExperimentStatus,
  JournalEntry,
  ModelRun,
  RelationshipEvent,
  ResidentId,
  TurnInput,
  TurnOutput,
  TurnRecord,
  TurnRefMap,
  TurnStatus,
  ValidationIssue,
  WorldEvent,
} from "@/src/core/types";
import type Database from "better-sqlite3";

type FolksWriter = Pick<FolksDatabase, "delete" | "insert">;

function toJson(value: unknown): string {
  return JSON.stringify(value === undefined ? null : value);
}

function fromJson<T>(value: string | null, fallback: T): T {
  if (value === null) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function residentId(value: string): ResidentId {
  if (RESIDENTS.some((resident) => resident.id === value)) {
    return value as ResidentId;
  }
  throw new Error("Unknown resident in database: " + value);
}

function snapshotFromRows(
  experimentRow: typeof dbSchema.experiments.$inferSelect,
  turnRows: Array<typeof dbSchema.turns.$inferSelect>,
  modelRunRows: Array<typeof dbSchema.modelRuns.$inferSelect>,
  journalRows: Array<typeof dbSchema.journalEntries.$inferSelect>,
  privateRows: Array<typeof dbSchema.privateNotes.$inferSelect>,
  relationshipEventRows: Array<typeof dbSchema.relationshipEvents.$inferSelect>,
  relationshipCurrentRows: Array<
    typeof dbSchema.relationshipCurrent.$inferSelect
  >,
  worldEventRows: Array<typeof dbSchema.worldEvents.$inferSelect>,
  worldObjectRows: Array<typeof dbSchema.worldObjectsCurrent.$inferSelect>,
): ExperimentSnapshot {
  const state = createInitialState();
  for (const row of worldObjectRows) {
    const object = state.objects[row.objectId as keyof CurrentState["objects"]];
    if (object) {
      object.locationId = row.locationId as typeof object.locationId;
      object.descriptionJa = row.descriptionJa;
    }
  }
  for (const row of relationshipCurrentRows) {
    const actor = residentId(row.actorId);
    const target = residentId(row.targetId);
    if (actor !== target) {
      setRelationship(state, actor, target, row.value as -3 | -2 | -1 | 0 | 1 | 2 | 3);
    }
  }
  state.journal = journalRows
    .sort((a, b) => a.cycle - b.cycle)
    .map((row): JournalEntry => ({
      id: row.id,
      experimentId: row.experimentId,
      cycle: row.cycle,
      authorId: residentId(row.authorId),
      publicText: row.publicText,
      questionForNext: row.questionForNext,
      createdAt: row.createdAt,
    }));
  state.privateNotes = privateRows
    .sort((a, b) => a.cycle - b.cycle)
    .map((row) => ({
      id: row.id,
      experimentId: row.experimentId,
      residentId: residentId(row.residentId),
      cycle: row.cycle,
      text: row.text,
      createdAt: row.createdAt,
    }));
  state.relationshipEvents = relationshipEventRows
    .sort((a, b) => a.cycle - b.cycle)
    .map((row): RelationshipEvent => ({
      id: row.id,
      experimentId: row.experimentId,
      cycle: row.cycle,
      actorId: residentId(row.actorId),
      targetId: residentId(row.targetId),
      delta: row.delta as -1 | 0 | 1,
      reason: row.reason,
      before: row.beforeValue as -3 | -2 | -1 | 0 | 1 | 2 | 3,
      after: row.afterValue as -3 | -2 | -1 | 0 | 1 | 2 | 3,
      createdAt: row.createdAt,
    }));
  state.worldEvents = worldEventRows
    .sort((a, b) => a.cycle - b.cycle)
    .map((row): WorldEvent => ({
      id: row.id,
      experimentId: row.experimentId,
      cycle: row.cycle,
      actorId: residentId(row.actorId),
      type: "object_moved",
      payload: fromJson(row.payload, {
        objectId: "object_01",
        fromPlaceId: "place_01",
        toPlaceId: "place_02",
      }),
      createdAt: row.createdAt,
    }));

  const runsByTurn = new Map<string, ModelRun[]>();
  for (const row of modelRunRows.sort((a, b) => a.attempt - b.attempt)) {
    const runs = runsByTurn.get(row.turnId) ?? [];
    runs.push({
      id: row.id,
      turnId: row.turnId,
      attempt: row.attempt,
      kind: row.kind as ModelRun["kind"],
      adapter: row.adapter,
      modelIdentifier: row.modelIdentifier,
      promptVersion: row.promptVersion,
      rawInput: fromJson(row.rawInput, null),
      rawOutput: fromJson(row.rawOutput, null),
      validationErrors: fromJson<ValidationIssue[]>(row.validationErrors, []),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      latencyMs: row.latencyMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      finishReason: row.finishReason,
    });
    runsByTurn.set(row.turnId, runs);
  }

  const turns = turnRows.map(
    (row): TurnRecord => ({
      id: row.id,
      experimentId: row.experimentId,
      cycle: row.cycle,
      residentId: residentId(row.residentId),
      status: row.status as TurnStatus,
      executionToken: row.executionToken,
      claimedAt: row.claimedAt,
      updatedAt: row.updatedAt,
      inputSnapshot: fromJson<TurnInput | null>(row.inputSnapshot, null),
      refMapSnapshot: fromJson<TurnRefMap | null>(row.refMapSnapshot, null),
      validatedOutputSnapshot: fromJson<TurnOutput | null>(
        row.validatedOutputSnapshot,
        null,
      ),
      validationErrors: fromJson<ValidationIssue[]>(row.validationErrors, []),
      failureKind:
        row.failureKind === "transport" || row.failureKind === "validation"
          ? row.failureKind
          : null,
      committedAt: row.committedAt,
      modelRuns: runsByTurn.get(row.id) ?? [],
    }),
  );

  const experiment: Experiment = {
    id: experimentRow.id,
    name: experimentRow.name,
    kind: experimentRow.kind as ExperimentKind,
    status: experimentRow.status as ExperimentStatus,
    committedCycle: experimentRow.committedCycle,
    totalCycles: 30 as 30,
    journalWindow: 4 as 4,
    language: "ja",
    promptVersion: experimentRow.promptVersion,
    driftFixtureVersion: experimentRow.driftFixtureVersion,
    weatherFixtureVersion: experimentRow.weatherFixtureVersion,
    initialStateVersion: experimentRow.initialStateVersion,
    modelAdapter: experimentRow.modelAdapter,
    modelIdentifier: experimentRow.modelIdentifier,
    modelParameters: fromJson<Record<string, unknown>>(
      experimentRow.modelParameters,
      {},
    ),
    randomSeed: experimentRow.randomSeed,
    createdAt: experimentRow.createdAt,
    completedAt: experimentRow.completedAt,
  };
  return { experiment, state, turns };
}

export class SqliteExperimentStore implements ExperimentStore {
  private readonly memory: InMemoryExperimentStore;

  constructor(
    private readonly db: FolksDatabase,
    private readonly sqlite: Database.Database,
  ) {
    this.memory = new InMemoryExperimentStore();
    this.loadFromDatabase();
  }

  static fromPath(path?: string): SqliteExperimentStore {
    const database = createDatabase(path);
    return new SqliteExperimentStore(database.db, database.sqlite);
  }

  private loadFromDatabase(): void {
    const experimentRows = this.db.select().from(dbSchema.experiments).all();
    for (const experimentRow of experimentRows) {
      const id = experimentRow.id;
      const turnRows = this.db
        .select()
        .from(dbSchema.turns)
        .where(eq(dbSchema.turns.experimentId, id))
        .all();
      const snapshot = snapshotFromRows(
        experimentRow,
        turnRows,
        this.db
          .select()
          .from(dbSchema.modelRuns)
          .where(eq(dbSchema.modelRuns.experimentId, id))
          .all(),
        this.db
          .select()
          .from(dbSchema.journalEntries)
          .where(eq(dbSchema.journalEntries.experimentId, id))
          .all(),
        this.db
          .select()
          .from(dbSchema.privateNotes)
          .where(eq(dbSchema.privateNotes.experimentId, id))
          .all(),
        this.db
          .select()
          .from(dbSchema.relationshipEvents)
          .where(eq(dbSchema.relationshipEvents.experimentId, id))
          .all(),
        this.db
          .select()
          .from(dbSchema.relationshipCurrent)
          .where(eq(dbSchema.relationshipCurrent.experimentId, id))
          .all(),
        this.db
          .select()
          .from(dbSchema.worldEvents)
          .where(eq(dbSchema.worldEvents.experimentId, id))
          .all(),
        this.db
          .select()
          .from(dbSchema.worldObjectsCurrent)
          .where(eq(dbSchema.worldObjectsCurrent.experimentId, id))
          .all(),
      );
      this.memory.importExperimentSnapshot(snapshot);
    }
  }

  private writeSnapshot(
    database: FolksWriter,
    experimentId: string,
    snapshot: ExperimentSnapshot,
  ): void {
    const experiment = snapshot.experiment;
      database.delete(dbSchema.modelRuns)
        .where(eq(dbSchema.modelRuns.experimentId, experimentId))
        .run();
      database.delete(dbSchema.turns)
        .where(eq(dbSchema.turns.experimentId, experimentId))
        .run();
      database.delete(dbSchema.journalEntries)
        .where(eq(dbSchema.journalEntries.experimentId, experimentId))
        .run();
      database.delete(dbSchema.privateNotes)
        .where(eq(dbSchema.privateNotes.experimentId, experimentId))
        .run();
      database.delete(dbSchema.relationshipEvents)
        .where(eq(dbSchema.relationshipEvents.experimentId, experimentId))
        .run();
      database.delete(dbSchema.relationshipCurrent)
        .where(eq(dbSchema.relationshipCurrent.experimentId, experimentId))
        .run();
      database.delete(dbSchema.worldEvents)
        .where(eq(dbSchema.worldEvents.experimentId, experimentId))
        .run();
      database.delete(dbSchema.worldObjectsCurrent)
        .where(eq(dbSchema.worldObjectsCurrent.experimentId, experimentId))
        .run();
      database.delete(dbSchema.driftItems)
        .where(eq(dbSchema.driftItems.experimentId, experimentId))
        .run();
      database.delete(dbSchema.residentDefinitions)
        .where(eq(dbSchema.residentDefinitions.experimentId, experimentId))
        .run();
      database.delete(dbSchema.experiments)
        .where(eq(dbSchema.experiments.id, experimentId))
        .run();

      database.insert(dbSchema.experiments)
        .values({
          id: experiment.id,
          name: experiment.name,
          kind: experiment.kind,
          status: experiment.status,
          committedCycle: experiment.committedCycle,
          totalCycles: experiment.totalCycles,
          journalWindow: experiment.journalWindow,
          language: experiment.language,
          promptVersion: experiment.promptVersion,
          driftFixtureVersion: experiment.driftFixtureVersion,
          weatherFixtureVersion: experiment.weatherFixtureVersion,
          initialStateVersion: experiment.initialStateVersion,
          modelAdapter: experiment.modelAdapter,
          modelIdentifier: experiment.modelIdentifier,
          modelParameters: toJson(experiment.modelParameters),
          randomSeed: experiment.randomSeed,
          createdAt: experiment.createdAt,
          completedAt: experiment.completedAt,
        })
        .run();

      database.insert(dbSchema.residentDefinitions)
        .values(
          RESIDENTS.map((resident) => ({
            id: experiment.id + ":" + resident.id,
            experimentId: experiment.id,
            residentId: resident.id,
            name: resident.name,
            attentionBiases: toJson(resident.attentionBiasesJa),
          })),
        )
        .run();

      if (snapshot.turns.length > 0) {
        database.insert(dbSchema.turns)
          .values(
            snapshot.turns.map((turn) => ({
              id: turn.id,
              experimentId: turn.experimentId,
              cycle: turn.cycle,
              residentId: turn.residentId,
              status: turn.status,
              executionToken: turn.executionToken,
              claimedAt: turn.claimedAt,
              updatedAt: turn.updatedAt,
              inputSnapshot: turn.inputSnapshot
                ? toJson(turn.inputSnapshot)
                : null,
              refMapSnapshot: turn.refMapSnapshot
                ? toJson(turn.refMapSnapshot)
                : null,
              validatedOutputSnapshot: turn.validatedOutputSnapshot
                ? toJson(turn.validatedOutputSnapshot)
                : null,
              validationErrors: toJson(turn.validationErrors),
              failureKind: turn.failureKind,
              committedAt: turn.committedAt,
            })),
          )
          .run();
      }

      const runs = snapshot.turns.flatMap((turn) => turn.modelRuns);
      if (runs.length > 0) {
        database.insert(dbSchema.modelRuns)
          .values(
            runs.map((run) => ({
              id: run.id,
              experimentId,
              turnId: run.turnId,
              attempt: run.attempt,
              kind: run.kind,
              adapter: run.adapter,
              modelIdentifier: run.modelIdentifier,
              promptVersion: run.promptVersion,
              rawInput: toJson(run.rawInput),
              rawOutput: toJson(run.rawOutput),
              validationErrors: toJson(run.validationErrors),
              startedAt: run.startedAt,
              finishedAt: run.finishedAt,
              latencyMs: run.latencyMs,
              inputTokens: run.inputTokens,
              outputTokens: run.outputTokens,
              finishReason: run.finishReason,
            })),
          )
          .run();
      }

      if (snapshot.state.journal.length > 0) {
        database.insert(dbSchema.journalEntries)
          .values(
            snapshot.state.journal.map((entry) => ({
              id: entry.id,
              experimentId,
              cycle: entry.cycle,
              authorId: entry.authorId,
              publicText: entry.publicText,
              questionForNext: entry.questionForNext,
              createdAt: entry.createdAt,
            })),
          )
          .run();
      }
      if (snapshot.state.privateNotes.length > 0) {
        database.insert(dbSchema.privateNotes)
          .values(
            snapshot.state.privateNotes.map((note) => ({
              id: note.id,
              experimentId,
              residentId: note.residentId,
              cycle: note.cycle,
              text: note.text,
              createdAt: note.createdAt,
            })),
          )
          .run();
      }
      if (snapshot.state.relationshipEvents.length > 0) {
        database.insert(dbSchema.relationshipEvents)
          .values(
            snapshot.state.relationshipEvents.map((event) => ({
              id: event.id,
              experimentId,
              cycle: event.cycle,
              actorId: event.actorId,
              targetId: event.targetId,
              delta: event.delta,
              reason: event.reason,
              beforeValue: event.before,
              afterValue: event.after,
              createdAt: event.createdAt,
            })),
          )
          .run();
      }
      const relationshipRows = Object.entries(snapshot.state.relationships).flatMap(
        ([actorId, targets]) =>
          Object.entries(targets).map(([targetId, value]) => ({
            id: experiment.id + ":" + actorId + ":" + targetId,
            experimentId,
            actorId,
            targetId,
            value: value as number,
          })),
      );
      if (relationshipRows.length > 0) {
        database.insert(dbSchema.relationshipCurrent).values(relationshipRows).run();
      }
      if (snapshot.state.worldEvents.length > 0) {
        database.insert(dbSchema.worldEvents)
          .values(
            snapshot.state.worldEvents.map((event) => ({
              id: event.id,
              experimentId,
              cycle: event.cycle,
              actorId: event.actorId,
              type: event.type,
              payload: toJson(event.payload),
              createdAt: event.createdAt,
            })),
          )
          .run();
      }
      database.insert(dbSchema.worldObjectsCurrent)
        .values(
          Object.values(snapshot.state.objects).map((object) => ({
            id: experiment.id + ":" + object.id,
            experimentId,
            objectId: object.id,
            descriptionJa: object.descriptionJa,
            locationId: object.locationId,
          })),
        )
        .run();
      database.insert(dbSchema.driftItems)
        .values(
          DRIFT_NEUTRAL_JA.map((item) => ({
            id: experiment.id + ":" + item.cycle,
            experimentId,
            cycle: item.cycle,
            fixtureVersion: DRIFT_BASELINE_VERSION,
            textJa: item.text,
          })),
        )
        .run();
  }

  private persistExperiment(experimentId: string): void {
    const snapshot = this.memory.exportExperimentSnapshot(experimentId);
    this.runImmediate(() =>
      this.writeSnapshot(this.db, experimentId, snapshot),
    );
  }

  private runImmediate<T>(operation: () => T): T {
    const transaction = this.sqlite.transaction(operation);
    try {
      return transaction.immediate();
    } catch (error) {
      this.loadFromDatabase();
      throw error;
    }
  }

  private mutate<T>(experimentId: string, mutation: () => T): T {
    return this.runImmediate(() => {
      this.loadFromDatabase();
      const before = this.memory.exportExperimentSnapshot(experimentId);
      try {
        const result = mutation();
        this.writeSnapshot(
          this.db,
          experimentId,
          this.memory.exportExperimentSnapshot(experimentId),
        );
        return result;
      } catch (error) {
        this.memory.importExperimentSnapshot(before);
        throw error;
      }
    });
  }

  createExperiment(input: CreateExperimentInput = {}): Experiment {
    const experiment = this.memory.createExperiment(input);
    try {
      this.persistExperiment(experiment.id);
    } catch (error) {
      this.memory.importExperimentSnapshot({
        experiment,
        state: createInitialState(),
        turns: [],
      });
      throw error;
    }
    return experiment;
  }

  duplicateExperiment(experimentId: string, name?: string): Experiment {
    return this.runImmediate(() => {
      this.loadFromDatabase();
      const experiment = this.memory.duplicateExperiment(experimentId, name);
      this.writeSnapshot(
        this.db,
        experiment.id,
        this.memory.exportExperimentSnapshot(experiment.id),
      );
      return experiment;
    });
  }

  pauseExperiment(experimentId: string): Experiment {
    return this.mutate(experimentId, () =>
      this.memory.pauseExperiment(experimentId),
    );
  }

  getExperiment(experimentId: string): Experiment | null {
    return this.memory.getExperiment(experimentId);
  }

  listExperiments(): Experiment[] {
    return this.memory.listExperiments();
  }

  getCurrentState(experimentId: string): CurrentState {
    return this.memory.getCurrentState(experimentId);
  }

  getTurn(turnId: string): TurnRecord | null {
    return this.memory.getTurn(turnId);
  }

  getTurnByCycle(experimentId: string, cycle: number): TurnRecord | null {
    return this.memory.getTurnByCycle(experimentId, cycle);
  }

  claimNextTurn(experimentId: string, now?: string) {
    return this.runImmediate(() => {
      this.loadFromDatabase();
      const result = this.memory.claimNextTurn(experimentId, now);
      if (result.owner) {
        this.writeSnapshot(
          this.db,
          experimentId,
          this.memory.exportExperimentSnapshot(experimentId),
        );
      }
      return result;
    });
  }

  recoverStaleTurn(experimentId: string, cycle: number, staleAfterMs: number, now?: string) {
    return this.runImmediate(() => {
      this.loadFromDatabase();
      const result = this.memory.recoverStaleTurn(
        experimentId,
        cycle,
        staleAfterMs,
        now,
      );
      if (result.owner) {
        this.writeSnapshot(
          this.db,
          experimentId,
          this.memory.exportExperimentSnapshot(experimentId),
        );
      }
      return result;
    });
  }

  saveTurnInput(turnId: string, executionToken: string, input: TurnInput, refMap: TurnRefMap, now?: string) {
    const turn = this.memory.getTurn(turnId);
    if (!turn) throw new Error("Unknown turn: " + turnId);
    return this.mutate(turn.experimentId, () =>
      this.memory.saveTurnInput(turnId, executionToken, input, refMap, now),
    );
  }

  appendModelRun(turnId: string, executionToken: string, run: AppendModelRunInput) {
    const turn = this.memory.getTurn(turnId);
    if (!turn) throw new Error("Unknown turn: " + turnId);
    return this.mutate(turn.experimentId, () =>
      this.memory.appendModelRun(turnId, executionToken, run),
    );
  }

  markOutputReceived(turnId: string, executionToken: string, now?: string) {
    const turn = this.memory.getTurn(turnId);
    if (!turn) throw new Error("Unknown turn: " + turnId);
    return this.mutate(turn.experimentId, () =>
      this.memory.markOutputReceived(turnId, executionToken, now),
    );
  }

  markValidated(turnId: string, executionToken: string, output: TurnOutput, now?: string) {
    const turn = this.memory.getTurn(turnId);
    if (!turn) throw new Error("Unknown turn: " + turnId);
    return this.mutate(turn.experimentId, () =>
      this.memory.markValidated(turnId, executionToken, output, now),
    );
  }

  commitTurn(turnId: string, executionToken: string, output: TurnOutput, now?: string) {
    const turn = this.memory.getTurn(turnId);
    if (!turn) throw new Error("Unknown turn: " + turnId);
    return this.mutate(turn.experimentId, () =>
      this.memory.commitTurn(turnId, executionToken, output, now),
    );
  }

  failTurn(
    turnId: string,
    executionToken: string,
    issues: ValidationIssue[],
    failureKind: "transport" | "validation",
    terminalExperimentFailure: boolean,
    now?: string,
  ) {
    const turn = this.memory.getTurn(turnId);
    if (!turn) throw new Error("Unknown turn: " + turnId);
    return this.mutate(turn.experimentId, () =>
      this.memory.failTurn(
        turnId,
        executionToken,
        issues,
        failureKind,
        terminalExperimentFailure,
        now,
      ),
    );
  }

  getFolksView(experimentId: string) {
    return this.memory.getFolksView(experimentId);
  }

  getLabView(experimentId: string) {
    return this.memory.getLabView(experimentId);
  }

  getAuditExport(experimentId: string) {
    return this.memory.getAuditExport(experimentId);
  }

  close(): void {
    this.sqlite.close();
  }
}
