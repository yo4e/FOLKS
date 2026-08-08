import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type FolksDatabase = ReturnType<typeof drizzle>;

const CREATE_TABLES_SQL = [
  "CREATE TABLE IF NOT EXISTS experiments (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, committed_cycle INTEGER NOT NULL, total_cycles INTEGER NOT NULL, journal_window INTEGER NOT NULL, language TEXT NOT NULL, prompt_version TEXT NOT NULL, drift_fixture_version TEXT NOT NULL, weather_fixture_version TEXT NOT NULL, initial_state_version TEXT NOT NULL, model_adapter TEXT NOT NULL, model_identifier TEXT NOT NULL, model_parameters TEXT NOT NULL, random_seed TEXT, created_at TEXT NOT NULL, completed_at TEXT)",
  "CREATE TABLE IF NOT EXISTS resident_definitions (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, resident_id TEXT NOT NULL, name TEXT NOT NULL, attention_biases TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS turns (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, cycle INTEGER NOT NULL, resident_id TEXT NOT NULL, status TEXT NOT NULL, execution_token TEXT, claimed_at TEXT, updated_at TEXT NOT NULL, input_snapshot TEXT, ref_map_snapshot TEXT, validated_output_snapshot TEXT, validation_errors TEXT NOT NULL, failure_kind TEXT, committed_at TEXT, UNIQUE(experiment_id, cycle))",
  "CREATE TABLE IF NOT EXISTS model_runs (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, turn_id TEXT NOT NULL, attempt INTEGER NOT NULL, kind TEXT NOT NULL, adapter TEXT NOT NULL, model_identifier TEXT NOT NULL, prompt_version TEXT NOT NULL, raw_input TEXT NOT NULL, raw_output TEXT NOT NULL, validation_errors TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, latency_ms INTEGER, input_tokens INTEGER, output_tokens INTEGER, finish_reason TEXT)",
  "CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, cycle INTEGER NOT NULL, author_id TEXT NOT NULL, public_text TEXT NOT NULL, question_for_next TEXT, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS private_notes (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, resident_id TEXT NOT NULL, cycle INTEGER NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS relationship_events (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, cycle INTEGER NOT NULL, actor_id TEXT NOT NULL, target_id TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL, before_value INTEGER NOT NULL, after_value INTEGER NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS relationship_current (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, actor_id TEXT NOT NULL, target_id TEXT NOT NULL, value INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS world_events (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, cycle INTEGER NOT NULL, actor_id TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS world_objects_current (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, object_id TEXT NOT NULL, description_ja TEXT NOT NULL, location_id TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS drift_items (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, cycle INTEGER NOT NULL, fixture_version TEXT NOT NULL, text_ja TEXT NOT NULL)",
];

export function initializeSchema(sqlite: Database.Database): void {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  for (const statement of CREATE_TABLES_SQL) {
    sqlite.exec(statement);
  }
}

export function createDatabase(
  path = process.env.FOLKS_DATABASE_PATH ?? "./data/folks.db",
): { sqlite: Database.Database; db: FolksDatabase } {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new Database(path);
  initializeSchema(sqlite);
  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}
