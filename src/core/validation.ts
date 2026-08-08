import { z } from "zod";
import {
  RELATIONSHIP_MAX,
  RELATIONSHIP_MIN,
  RESIDENT_IDS,
} from "./constants";
import { getRelationship } from "./state";
import type {
  CurrentState,
  ModelTurnOutput,
  ObjectId,
  PlaceId,
  ResidentId,
  TurnInput,
  TurnOutput,
  TurnRefMap,
  ValidationIssue,
} from "./types";

const residentRefSchema = z
  .string()
  .regex(/^resident:[a-z]$/, "residentRef must be a turn-local opaque ref");
const objectRefSchema = z
  .string()
  .regex(/^object:[a-z]$/, "objectRef must be a turn-local opaque ref");
const placeRefSchema = z
  .string()
  .regex(/^place:[a-z]$/, "placeRef must be a turn-local opaque ref");

export const modelTurnOutputSchema = z
  .object({
    journalText: z.string(),
    privateNote: z.string().nullable(),
    relationshipChange: z
      .object({
        residentRef: residentRefSchema,
        delta: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
        reason: z.string(),
      })
      .strict()
      .nullable(),
    worldAction: z
      .object({
        type: z.literal("move_object"),
        objectRef: objectRefSchema,
        destinationPlaceRef: placeRefSchema,
      })
      .strict()
      .nullable(),
    questionForNext: z.string().nullable(),
  })
  .strict();

function issue(
  path: string,
  code: string,
  message: string,
): ValidationIssue {
  return { path, code, message };
}

function japaneseText(value: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(
    value,
  );
}

function validateText(
  value: string | null,
  path: string,
  min: number,
  max: number,
  required: boolean,
): ValidationIssue[] {
  if (value === null) {
    return required
      ? [issue(path, "required", "A non-null Japanese text value is required.")]
      : [];
  }
  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  const issues: ValidationIssue[] = [];
  if (required && length === 0) {
    issues.push(issue(path, "empty", "Text must contain non-whitespace."));
  }
  if (length < min || length > max) {
    issues.push(
      issue(
        path,
        "length",
        "Text length must be between " + min + " and " + max + " characters.",
      ),
    );
  }
  if (length > 0 && !japaneseText(trimmed)) {
    issues.push(issue(path, "language", "Text must contain Japanese characters."));
  }
  return issues;
}

function parseJsonCandidate(candidate: unknown): unknown {
  if (typeof candidate !== "string") {
    return candidate;
  }
  const trimmed = candidate.trim();
  const fence = String.fromCharCode(96).repeat(3);
  const withoutFence = trimmed
    .replace(new RegExp("^" + fence + "(?:json)?\\s*", "i"), "")
    .replace(new RegExp("\\s*" + fence + "$"), "")
    .trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1));
      } catch {
        return candidate;
      }
    }
    return candidate;
  }
}

function zodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((item) =>
    issue(item.path.join(".") || "$", "schema", item.message),
  );
}

export type ValidationResult =
  | {
      ok: true;
      parsed: ModelTurnOutput;
      output: TurnOutput;
    }
  | {
      ok: false;
      issues: ValidationIssue[];
      parsed: ModelTurnOutput | null;
    };

export function validateModelTurnOutput(
  candidate: unknown,
  input: TurnInput,
  refMap: TurnRefMap,
  state: CurrentState,
  residentId: ResidentId,
): ValidationResult {
  const parsedCandidate = parseJsonCandidate(candidate);
  const schemaResult = modelTurnOutputSchema.safeParse(parsedCandidate);
  if (!schemaResult.success) {
    return { ok: false, issues: zodIssues(schemaResult.error), parsed: null };
  }

  const parsed = schemaResult.data;
  const issues: ValidationIssue[] = [
    ...validateText(parsed.journalText, "journalText", 1, 500, true),
    ...validateText(parsed.privateNote, "privateNote", 1, 240, false),
    ...validateText(
      parsed.relationshipChange ? parsed.relationshipChange.reason : null,
      "relationshipChange.reason",
      1,
      160,
      parsed.relationshipChange !== null,
    ),
    ...validateText(
      parsed.questionForNext,
      "questionForNext",
      1,
      160,
      false,
    ),
  ];

  let relationshipTarget: ResidentId | null = null;
  if (parsed.relationshipChange) {
    relationshipTarget =
      refMap.residents[parsed.relationshipChange.residentRef] ?? null;
    if (!relationshipTarget) {
      issues.push(
        issue(
          "relationshipChange.residentRef",
          "unknown_ref",
          "The relationship residentRef is not valid for this turn.",
        ),
      );
    } else if (relationshipTarget === residentId) {
      issues.push(
        issue(
          "relationshipChange.residentRef",
          "self_reference",
          "A resident cannot change a relationship toward themself.",
        ),
      );
    } else {
      const before = getRelationship(state, residentId, relationshipTarget);
      const after = before + parsed.relationshipChange.delta;
      if (
        after < RELATIONSHIP_MIN ||
        after > RELATIONSHIP_MAX ||
        !Number.isInteger(after)
      ) {
        issues.push(
          issue(
            "relationshipChange.delta",
            "relationship_bounds",
            "The relationship would leave the configured bounds.",
          ),
        );
      }
    }
  }

  let objectId: ObjectId | null = null;
  let destinationPlaceId: PlaceId | null = null;
  if (parsed.worldAction) {
    objectId = refMap.objects[parsed.worldAction.objectRef] ?? null;
    destinationPlaceId =
      refMap.places[parsed.worldAction.destinationPlaceRef] ?? null;
    if (!objectId) {
      issues.push(
        issue(
          "worldAction.objectRef",
          "unknown_ref",
          "The objectRef is not valid for this turn.",
        ),
      );
    }
    if (!destinationPlaceId) {
      issues.push(
        issue(
          "worldAction.destinationPlaceRef",
          "unknown_ref",
          "The destinationPlaceRef is not valid for this turn.",
        ),
      );
    }
    if (objectId && destinationPlaceId) {
      const object = state.objects[objectId];
      if (!object) {
        issues.push(
          issue(
            "worldAction.objectRef",
            "missing_object",
            "The selected object does not exist.",
          ),
        );
      } else if (object.locationId === destinationPlaceId) {
        issues.push(
          issue(
            "worldAction.destinationPlaceRef",
            "no_op",
            "The object is already at the selected place.",
          ),
        );
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues, parsed };
  }

  const output: TurnOutput = {
    journalText: parsed.journalText.trim(),
    privateNote: parsed.privateNote ? parsed.privateNote.trim() : null,
    relationshipChange: parsed.relationshipChange
      ? {
          residentId: relationshipTarget as ResidentId,
          delta: parsed.relationshipChange.delta,
          reason: parsed.relationshipChange.reason.trim(),
        }
      : null,
    worldAction: parsed.worldAction
      ? {
          type: "move_object",
          objectId: objectId as ObjectId,
          destinationPlaceId: destinationPlaceId as PlaceId,
        }
      : null,
    questionForNext: parsed.questionForNext
      ? parsed.questionForNext.trim()
      : null,
  };

  return { ok: true, parsed, output };
}

export function validationErrorStrings(issues: ValidationIssue[]): string[] {
  return issues.map(
    (item) =>
      (item.path === "$" ? "" : item.path + ": ") +
      item.code +
      " — " +
      item.message,
  );
}

export function assertKnownResident(id: string): ResidentId {
  if (!RESIDENT_IDS.includes(id as ResidentId)) {
    throw new Error("Unknown resident " + id);
  }
  return id as ResidentId;
}
