import { FakeModelAdapter } from "../src/adapters/model/fake";
import { buildTurnInput } from "../src/core/input";
import { measurePromptContext } from "../src/core/prompt";
import { InMemoryExperimentStore } from "../src/core/store";

const store = new InMemoryExperimentStore();
const experiment = store.createExperiment({
  name: "context-budget-diagnostic",
  kind: "technical",
});
const state = store.getCurrentState(experiment.id);
const built = buildTurnInput(experiment, state, 1);
const maximumJournal = "これは最大長の日誌です。".repeat(42);
const maximumPrivate = "これは最大長の私的メモです。".repeat(18);
built.input.recentJournal = [1, 2, 3, 4].map((cycle) => ({
  cycle,
  authorName: "Resident",
  publicText: maximumJournal.slice(0, 500),
  questionForNext: maximumPrivate.slice(0, 160),
}));
built.input.resident.privateNotes = [1, 2, 3, 4, 5, 6, 7].map((cycle) => ({
  cycle,
  text: maximumPrivate.slice(0, 240),
}));
const measurement = measurePromptContext(built.input);
console.log(JSON.stringify({
  ...measurement,
  configuredMaxOutputTokens: 1200,
  note: "Estimated tokens use a conservative Japanese character ratio; provider token usage should also be recorded during shakeout.",
}, null, 2));

void new FakeModelAdapter();
