import { CloudModelAdapter } from "@/src/adapters/model/cloud";
import { FakeModelAdapter } from "@/src/adapters/model/fake";
import type { ModelAdapter } from "@/src/adapters/model/types";
import {
  DEFAULT_MODEL_PARAMETERS,
  PROMPT_VERSION,
} from "@/src/core/constants";
import { TurnEngine } from "@/src/core/engine";
import { SqliteExperimentStore } from "./db/sqlite-store";

export type FolksRuntime = {
  store: SqliteExperimentStore;
  adapter: ModelAdapter;
  engine: TurnEngine;
};

declare global {
  var __folksRuntime: FolksRuntime | undefined;
}

export function createAdapter(): ModelAdapter {
  const configured = process.env.FOLKS_MODEL_ADAPTER ?? "fake";
  const apiKey = process.env.OPENAI_API_KEY;
  if (configured === "cloud") {
    if (!apiKey) {
      throw new Error(
        "FOLKS_MODEL_ADAPTER=cloud requires OPENAI_API_KEY in the local environment.",
      );
    }
    const modelIdentifier = process.env.FOLKS_MODEL_ID?.trim();
    if (!modelIdentifier) {
      throw new Error(
        "FOLKS_MODEL_ADAPTER=cloud requires FOLKS_MODEL_ID in the local environment.",
      );
    }
    return new CloudModelAdapter({
      endpoint:
        process.env.FOLKS_MODEL_API_URL ??
        "https://api.openai.com/v1/chat/completions",
      apiKey,
      modelIdentifier,
      temperature: DEFAULT_MODEL_PARAMETERS.temperature,
      maxOutputTokens: DEFAULT_MODEL_PARAMETERS.maxOutputTokens,
    });
  }
  if (configured === "fake") {
    return new FakeModelAdapter();
  }
  throw new Error(
    "Unsupported FOLKS_MODEL_ADAPTER: " + configured + ". Use fake or cloud.",
  );
}

export function baselineCreationAllowed(): boolean {
  return process.env.FOLKS_ALLOW_BASELINE === "1";
}

export function getRuntime(): FolksRuntime {
  if (!globalThis.__folksRuntime) {
    const adapter = createAdapter();
    const store = SqliteExperimentStore.fromPath(
      process.env.FOLKS_DATABASE_PATH ?? "./data/folks.db",
    );
    globalThis.__folksRuntime = {
      store,
      adapter,
      engine: new TurnEngine(store, adapter),
    };
  }
  return globalThis.__folksRuntime;
}

export function ensureDefaultExperiment(): string {
  const runtime = getRuntime();
  const existing = runtime.store.listExperiments()[0];
  if (existing) {
    return existing.id;
  }
  return runtime.store.createExperiment({
    name: "FOLKS technical shakeout",
    kind: "technical",
    modelAdapter: runtime.adapter.name,
    modelIdentifier: runtime.adapter.modelIdentifier,
    promptVersion: runtime.adapter.promptVersion || PROMPT_VERSION,
  }).id;
}
