import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const experiments = sqliteTable("experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  committedCycle: integer("committed_cycle").notNull(),
  totalCycles: integer("total_cycles").notNull(),
  journalWindow: integer("journal_window").notNull(),
  language: text("language").notNull(),
  promptVersion: text("prompt_version").notNull(),
  driftFixtureVersion: text("drift_fixture_version").notNull(),
  weatherFixtureVersion: text("weather_fixture_version").notNull(),
  initialStateVersion: text("initial_state_version").notNull(),
  modelAdapter: text("model_adapter").notNull(),
  modelIdentifier: text("model_identifier").notNull(),
  modelParameters: text("model_parameters").notNull(),
  randomSeed: text("random_seed"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const residentDefinitions = sqliteTable("resident_definitions", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  residentId: text("resident_id").notNull(),
  name: text("name").notNull(),
  attentionBiases: text("attention_biases").notNull(),
});

export const turns = sqliteTable("turns", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  cycle: integer("cycle").notNull(),
  residentId: text("resident_id").notNull(),
  status: text("status").notNull(),
  executionToken: text("execution_token"),
  claimedAt: text("claimed_at"),
  updatedAt: text("updated_at").notNull(),
  inputSnapshot: text("input_snapshot"),
  refMapSnapshot: text("ref_map_snapshot"),
  validatedOutputSnapshot: text("validated_output_snapshot"),
  validationErrors: text("validation_errors").notNull(),
  failureKind: text("failure_kind"),
  committedAt: text("committed_at"),
});

export const modelRuns = sqliteTable("model_runs", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  turnId: text("turn_id").notNull(),
  attempt: integer("attempt").notNull(),
  kind: text("kind").notNull(),
  adapter: text("adapter").notNull(),
  modelIdentifier: text("model_identifier").notNull(),
  promptVersion: text("prompt_version").notNull(),
  rawInput: text("raw_input").notNull(),
  rawOutput: text("raw_output").notNull(),
  validationErrors: text("validation_errors").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  latencyMs: integer("latency_ms"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  finishReason: text("finish_reason"),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  cycle: integer("cycle").notNull(),
  authorId: text("author_id").notNull(),
  publicText: text("public_text").notNull(),
  questionForNext: text("question_for_next"),
  createdAt: text("created_at").notNull(),
});

export const privateNotes = sqliteTable("private_notes", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  residentId: text("resident_id").notNull(),
  cycle: integer("cycle").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const relationshipEvents = sqliteTable("relationship_events", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  cycle: integer("cycle").notNull(),
  actorId: text("actor_id").notNull(),
  targetId: text("target_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  beforeValue: integer("before_value").notNull(),
  afterValue: integer("after_value").notNull(),
  createdAt: text("created_at").notNull(),
});

export const relationshipCurrent = sqliteTable("relationship_current", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  actorId: text("actor_id").notNull(),
  targetId: text("target_id").notNull(),
  value: integer("value").notNull(),
});

export const worldEvents = sqliteTable("world_events", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  cycle: integer("cycle").notNull(),
  actorId: text("actor_id").notNull(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});

export const worldObjectsCurrent = sqliteTable("world_objects_current", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  objectId: text("object_id").notNull(),
  descriptionJa: text("description_ja").notNull(),
  locationId: text("location_id").notNull(),
});

export const driftItems = sqliteTable("drift_items", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  cycle: integer("cycle").notNull(),
  fixtureVersion: text("fixture_version").notNull(),
  textJa: text("text_ja").notNull(),
});
