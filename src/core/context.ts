import { JOURNAL_WINDOW } from "./constants";
import { buildTurnInput } from "./input";
import type { CurrentState, Experiment, TurnInput } from "./types";

export const WORST_CASE_CONTEXT_LIMITS = {
  journalEntries: JOURNAL_WINDOW,
  journalTextCharacters: 500,
  questionCharacters: 160,
  privateNoteCharacters: 240,
  privateNoteCount: 7,
} as const;

export function repeatToLength(value: string, length: number): string {
  if (length <= 0 || value.length === 0) {
    return "";
  }
  const characters = Array.from(value);
  return Array.from(
    { length },
    (_, index) => characters[index % characters.length],
  ).join("");
}

export function buildWorstCaseTurnInput(
  experiment: Experiment,
  state: CurrentState,
): TurnInput {
  const input = buildTurnInput(
    experiment,
    state,
    experiment.totalCycles,
  ).input;
  const maximumJournal = repeatToLength(
    "日",
    WORST_CASE_CONTEXT_LIMITS.journalTextCharacters,
  );
  const maximumQuestion = repeatToLength(
    "問い",
    WORST_CASE_CONTEXT_LIMITS.questionCharacters,
  );
  const maximumPrivateNote = repeatToLength(
    "私的メモ",
    WORST_CASE_CONTEXT_LIMITS.privateNoteCharacters,
  );
  input.recentJournal = Array.from(
    { length: WORST_CASE_CONTEXT_LIMITS.journalEntries },
    (_, index) => ({
      cycle: index + 1,
      authorName: "Resident",
      publicText: maximumJournal,
      questionForNext: maximumQuestion,
    }),
  );
  input.resident.privateNotes = Array.from(
    { length: WORST_CASE_CONTEXT_LIMITS.privateNoteCount },
    (_, index) => ({
      cycle: index + 1,
      text: maximumPrivateNote,
    }),
  );
  return input;
}
