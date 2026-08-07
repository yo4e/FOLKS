# FOLKS — v0 Specification

Last updated: 2026-08-07

Status: implementation-ready specification for the first 4-resident / 30-cycle experiment.

This document defines v0 behavior. `DESIGN.md` explains why these choices exist.

---

## 1. Definition of done

FOLKS v0 is complete when:

> The same initial experiment can run four residents through 30 duty cycles. Each resident sees only the information allowed at that cycle, produces one public journal entry plus optional private and state changes, and leaves an auditable record of every model input, output, validation result, and committed world change. The run can be read in both a quiet FOLKS view and a diagnostic Lab view.

A successful implementation does not need to prove that a society emerged. It must make that question observable.

---

## 2. Fixed v0 constants

```ts
export const RESIDENT_IDS = ["kai", "fia", "tekt", "meme"] as const;
export const TOTAL_CYCLES = 30;
export const JOURNAL_WINDOW = 4;
export const MAX_WORLD_ACTIONS_PER_TURN = 1;
export const MAX_RELATIONSHIP_CHANGES_PER_TURN = 1;
export const MAX_RELATIONSHIP_DELTA_PER_TURN = 1;
export const RELATIONSHIP_MIN = -3;
export const RELATIONSHIP_MAX = 3;
export const MAX_OUTPUT_REPAIR_ATTEMPTS = 1;
export const BASELINE_LANGUAGE = "ja";
```

Rota:

```text
kai -> fia -> tekt -> meme -> repeat
```

Cycle numbering starts at 1.

Resident for cycle `n`:

```ts
RESIDENT_IDS[(n - 1) % 4]
```

---

## 3. Baseline language

The first baseline experiment is conducted in **Japanese**.

Resident-facing world descriptions, journal entries, private notes, questions, relationship reasons, and drift items should be Japanese.

Internal identifiers, source-code types, database names, and Lab-only technical metadata may remain English.

Language is part of experiment configuration and must be versioned. A later English run is a comparison experiment, not the same baseline.

---

## 4. Residents

```ts
type ResidentId = "kai" | "fia" | "tekt" | "meme";

type ResidentDefinition = {
  id: ResidentId;
  name: string;
  attentionBiasesJa: string[];
};
```

Initial definitions:

```ts
const residents: ResidentDefinition[] = [
  {
    id: "kai",
    name: "Kai",
    attentionBiasesJa: [
      "世界の変化",
      "自分の観察と日誌の食い違い",
      "以前の記述との差"
    ]
  },
  {
    id: "fia",
    name: "Fia",
    attentionBiasesJa: [
      "他の住民の言葉",
      "頼みごとや約束",
      "親しさや距離の変化"
    ]
  },
  {
    id: "tekt",
    name: "Tekt",
    attentionBiasesJa: [
      "物の位置",
      "順序や維持",
      "行動の実際的な結果"
    ]
  },
  {
    id: "meme",
    name: "Meme",
    attentionBiasesJa: [
      "繰り返される言葉",
      "名前や名付け",
      "周期や反復する形"
    ]
  }
];
```

These are attention priors, not immutable personality traits or jobs.

Residents are not told the etymology or symbolic meaning of their names.

Residents do not know they are AI or part of an experiment.

---

## 5. World state

### 5.1 Places

```ts
type PlaceId = "place_01" | "place_02" | "place_03";

type Place = {
  id: PlaceId;
  descriptionJa: string;
};
```

Initial places:

```ts
[
  {
    id: "place_01",
    descriptionJa: "住んでいる場所の中央にある、小さく開けた空間。"
  },
  {
    id: "place_02",
    descriptionJa: "壁際にある低い棚。"
  },
  {
    id: "place_03",
    descriptionJa: "地面にある浅い窪み。決まった名前はまだない。"
  }
]
```

Internal place IDs are never shown to residents.

### 5.2 Objects

```ts
type ObjectId = "object_01" | "object_02" | "object_03";

type WorldObject = {
  id: ObjectId;
  descriptionJa: string;
  locationId: PlaceId;
};
```

Initial objects:

```ts
[
  {
    id: "object_01",
    descriptionJa: "手のひらほどの大きさの石。",
    locationId: "place_01"
  },
  {
    id: "object_02",
    descriptionJa: "小さな空の器。",
    locationId: "place_02"
  },
  {
    id: "object_03",
    descriptionJa: "短い紐。",
    locationId: "place_02"
  }
]
```

### 5.3 Weather

```ts
type Weather = "clear" | "thin_cloud" | "light_rain" | "wind";
```

Weather is read-only from the model's perspective in v0.

Resident-facing weather descriptions are Japanese and come from a fixed 30-cycle fixture.

---

## 6. Relationship state

Relationships are directional.

Kai's state toward Fia may differ from Fia's state toward Kai.

```ts
type RelationshipValue = -3 | -2 | -1 | 0 | 1 | 2 | 3;

type RelationshipState = Record<ResidentId, Partial<Record<ResidentId, RelationshipValue>>>;
```

Self-relationships are absent.

Initial value for every pair is `0`.

The model does not see raw numeric values.

Resident-facing mapping:

```ts
-3 => "強く警戒している"
-2 => "警戒している"
-1 => "少し警戒している"
 0 => "特に偏りはない"
 1 => "少し親しみを感じている"
 2 => "親しみを感じている"
 3 => "強い親しみを感じている"
```

One turn may propose **zero or one** relationship change total.

The delta must be `-1`, `0`, or `+1`. A `0` change is valid but normally unnecessary; prompts may encourage `null` when nothing changed.

Values remain within `[-3, 3]`. An illegal change is rejected rather than silently clamped.

---

## 7. Journal

```ts
type JournalEntry = {
  id: string;
  experimentId: string;
  cycle: number;
  authorId: ResidentId;
  publicText: string;
  questionForNext: string | null;
  createdAt: string;
};
```

Rules:

- exactly one journal entry per committed cycle
- immutable after commit
- author is visible
- cycle order is visible
- only the latest 4 entries are included in the next TurnInput
- no resident-facing full-history search in v0
- no edits, deletes, corrections, or annotations of old entries

A correction must be written as a new journal entry.

---

## 8. Private memory

```ts
type PrivateNote = {
  id: string;
  experimentId: string;
  residentId: ResidentId;
  cycle: number;
  text: string;
  createdAt: string;
};
```

Rules:

- at most one new private note per committed turn
- notes are visible only to the same resident on later duty turns
- all previous private notes for that resident are supplied in v0
- no embeddings
- no semantic retrieval
- no summarization
- no forgetting

At 30 cycles, each resident has only 7 or 8 duty turns, so full private-note replay is acceptable and experimentally cleaner.

---

## 9. Drift item

```ts
type DriftItem = {
  id: string;
  textJa: string;
};
```

Exactly one fixed drift item is assigned to each cycle.

No web access is exposed to residents in v0.

The 30-item fixture is defined in `EXPERIMENT_V0.md` and should also exist as machine-readable fixture data in implementation.

---

## 10. Internal world action

The committed domain action uses internal IDs and is never model-facing directly.

```ts
type MoveObjectAction = {
  type: "move_object";
  objectId: ObjectId;
  destinationPlaceId: PlaceId;
};

type WorldAction = MoveObjectAction;
```

Rules:

- zero or one action per turn
- source object must exist
- destination place must exist
- action is rejected if object is already at destination
- model cannot create/delete objects or places
- model cannot modify weather
- model cannot act on another resident directly

The public journal may describe motivations or meanings not represented in the action schema.

---

## 11. Resident-safe references

The model must never need to use database IDs such as `object_01` or `place_03`.

Each TurnInput assigns short opaque refs that are valid only for that input.

Example:

```text
内部ID: object_01
モデル向けref: object:a
住民が読む説明: 手のひらほどの大きさの石。
```

```ts
type ResidentObjectRef = `object:${string}`;
type ResidentPlaceRef = `place:${string}`;
type ResidentRef = `resident:${string}`;
```

The input builder owns a hidden resolution map:

```ts
type TurnRefMap = {
  objects: Record<ResidentObjectRef, ObjectId>;
  places: Record<ResidentPlaceRef, PlaceId>;
  residents: Record<ResidentRef, ResidentId>;
};
```

The resolution map is stored with Lab/audit data but is not shown as world lore.

---

## 12. TurnInput

TurnInput is constructed by application code and stored as a snapshot before the model call.

```ts
type TurnInput = {
  experiment: {
    id: string;
    cycle: number;
    totalCycles: 30;
    language: "ja";
  };

  resident: {
    ref: ResidentRef;
    name: string;
    attentionBiases: string[];
    privateNotes: Array<{
      cycle: number;
      text: string;
    }>;
    relationships: Array<{
      residentRef: ResidentRef;
      residentName: string;
      state: string;
    }>;
  };

  nextResident: {
    ref: ResidentRef;
    name: string;
  };

  world: {
    places: Array<{
      ref: ResidentPlaceRef;
      description: string;
    }>;
    objects: Array<{
      ref: ResidentObjectRef;
      description: string;
      locationRef: ResidentPlaceRef;
    }>;
    weather: string;
  };

  recentJournal: Array<{
    cycle: number;
    authorName: string;
    publicText: string;
    questionForNext: string | null;
  }>;

  drift: {
    text: string;
  };

  allowedActions: ["move_object"];
};
```

It excludes:

- other residents' private notes
- full journal history beyond the 4-entry window
- machine event-log truth
- future drift items
- future weather
- experiment observation hypotheses
- human/Lab annotations
- raw relationship numbers
- model/provider infrastructure

---

## 13. Raw model output contract

The model-facing structured output uses resident-safe refs.

```ts
type ModelTurnOutput = {
  journalText: string;

  privateNote: string | null;

  relationshipChange: {
    residentRef: ResidentRef;
    delta: -1 | 0 | 1;
    reason: string;
  } | null;

  worldAction: {
    type: "move_object";
    objectRef: ResidentObjectRef;
    destinationPlaceRef: ResidentPlaceRef;
  } | null;

  questionForNext: string | null;
};
```

After schema validation, the application resolves refs through the TurnRefMap and performs domain validation.

Only then is the result converted into the internal validated `TurnOutput`.

---

## 14. Validated TurnOutput

```ts
type TurnOutput = {
  journalText: string;

  privateNote: string | null;

  relationshipChange: {
    residentId: ResidentId;
    delta: -1 | 0 | 1;
    reason: string;
  } | null;

  worldAction: WorldAction | null;

  questionForNext: string | null;
};
```

Suggested v0 limits:

- `journalText`: 80–500 Japanese characters
- `privateNote`: 0–240 Japanese characters
- `reason`: 1–160 Japanese characters
- `questionForNext`: 0–160 Japanese characters

Hard limits belong in schema/domain validation. Softer stylistic preferences belong in the prompt.

---

## 15. Model prompt contract

The system prompt communicates only world-internal rules and output requirements.

Conceptual Japanese content:

```text
あなたは、この小さな場所で暮らす四人の住民の一人です。
いまはあなたが日直です。
一度に活動する住民は一人だけです。
あなたは前の住民たちが残した最近の日誌を受け取ります。
日誌は書き手の理解や解釈であり、間違っていることもあります。
いま自分が観察できる世界と照らし合わせて考えてください。
必要なら、許可された小さな行動を一つだけ行えます。
次の日直へ公開の日誌を残してください。
必要なら、未来の自分だけが読む私的なメモも残せます。
```

Do not tell the model to:

- create culture
- invent mythology
- establish traditions
- behave autonomously
- develop relationships
- create new vocabulary
- surprise the observer
- demonstrate emergence

Those are possible observations, not instructions.

The resident is never told that it is an AI, model, agent, simulation, test subject, or experiment participant.

---

## 16. Output validation

### 16.1 Schema validation

Reject malformed or incomplete structured output.

### 16.2 Ref resolution validation

Reject when any resident/object/place ref is not present in the current TurnRefMap.

Never guess which entity was intended.

### 16.3 Domain validation

Reject when:

- relationship target resolves to self
- relationship delta is outside `-1 | 0 | 1`
- a second relationship change is present
- world action type is unsupported
- object does not exist
- destination does not exist
- object is already at destination
- output exceeds hard size limits

Do not infer intended IDs or intended actions.

### 16.4 Repair

If validation fails:

1. preserve the raw invalid output
2. make at most one repair request to the same adapter/model
3. include validation errors and the required schema, not new creative instructions
4. validate again
5. if still invalid, mark the turn FAILED

FAILED turns do not advance the cycle and do not mutate committed world state.

---

## 17. Turn lifecycle

```ts
async function runTurn(experimentId: string): Promise<TurnRecord> {
  // 1. Load committed experiment state.
  // 2. Determine duty resident from next cycle.
  // 3. Build TurnInput + TurnRefMap.
  // 4. Persist immutable input/ref snapshots.
  // 5. Call ModelAdapter.
  // 6. Persist raw output.
  // 7. Validate schema and refs.
  // 8. Resolve refs and validate domain constraints.
  // 9. Optionally perform one repair call.
  // 10. In one database transaction:
  //     - append journal entry
  //     - append private note if present
  //     - append relationship event if present
  //     - append world event if present
  //     - update current-state projections
  //     - mark turn COMMITTED
  //     - advance experiment cycle
  // 11. Return committed turn.
}
```

No world mutation occurs before the commit transaction.

---

## 18. Turn status

```ts
type TurnStatus =
  | "READY"
  | "INPUT_CREATED"
  | "GENERATING"
  | "OUTPUT_RECEIVED"
  | "VALIDATED"
  | "COMMITTED"
  | "FAILED";
```

A production implementation may collapse transient statuses internally, but persisted records must make failed model calls and validation failures distinguishable from committed turns.

---

## 19. Experiment record

```ts
type Experiment = {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "failed";
  currentCycle: number;
  totalCycles: 30;
  journalWindow: 4;
  language: "ja";
  promptVersion: string;
  driftFixtureVersion: string;
  weatherFixtureVersion: string;
  initialStateVersion: string;
  modelAdapter: string;
  modelIdentifier: string;
  modelParameters: Record<string, unknown>;
  randomSeed: string | null;
  createdAt: string;
  completedAt: string | null;
};
```

An experiment stores enough configuration to identify what differed between runs.

---

## 20. Persistence tables

Exact ORM/SQL syntax is implementation-specific. Conceptual tables:

```text
experiments
resident_definitions
turns
journal_entries
private_notes
relationship_events
relationship_current
world_events
world_objects_current
drift_items
model_runs
```

### `turns`

Must preserve:

```text
id
experiment_id
cycle
resident_id
status
input_snapshot
ref_map_snapshot
validated_output_snapshot
created_at
committed_at
```

### `model_runs`

Must preserve:

```text
id
turn_id
attempt
adapter
model_identifier
prompt_version
raw_request_or_reconstructable_input
raw_output
validation_errors
started_at
finished_at
```

Secrets/API keys must never be stored in snapshots.

---

## 21. Event records

World and relationship changes are append-only events.

```ts
type WorldEvent = {
  experimentId: string;
  cycle: number;
  actorId: ResidentId;
  type: "object_moved";
  payload: {
    objectId: ObjectId;
    fromPlaceId: PlaceId;
    toPlaceId: PlaceId;
  };
};

type RelationshipEvent = {
  experimentId: string;
  cycle: number;
  actorId: ResidentId;
  targetId: ResidentId;
  delta: -1 | 0 | 1;
  reason: string;
  before: RelationshipValue;
  after: RelationshipValue;
};
```

Current-state tables are projections for convenience, not the sole history source.

---

## 22. ModelAdapter

```ts
interface ModelAdapter {
  generateTurn(input: TurnInput): Promise<unknown>;
}
```

The adapter returns `unknown` because validation belongs outside the adapter.

Recommended implementations:

```text
FakeModelAdapter
CloudModelAdapter
LocalRuntimeAdapter     // later
BrowserModelAdapter    // later
```

The fake adapter is mandatory for tests.

---

## 23. Suggested module boundaries

Framework-independent core:

```text
src/core/
  experiment/
  rota/
  turn/
  world/
  journal/
  memory/
  relationships/
  validation/
```

Infrastructure:

```text
src/adapters/
  model/
  persistence/
```

UI/application shell:

```text
src/app/
  folks/
  lab/
```

The core must not import framework UI modules or a specific model SDK.

---

## 24. UI requirements

### FOLKS view

Minimum:

- experiment/cycle indicator
- current or most recent duty resident
- current small-world state
- recent journal timeline
- current drift item for a running turn where appropriate
- controls to run one cycle or continue the experiment

Do not expose private notes, raw relationship numbers, internal IDs, or model metadata here.

### Lab view

Minimum:

- experiment configuration
- turn list
- per-turn TurnInput snapshot
- TurnRefMap snapshot
- raw model output
- validation/repair result
- validated output
- private notes
- relationship event history
- world event history
- prompt/model metadata

Lab view is allowed to look technical.

---

## 25. Required tests

### Rota

- cycle 1 = Kai
- cycle 2 = Fia
- cycle 3 = Tekt
- cycle 4 = Meme
- cycle 5 = Kai
- cycle 30 = Fia
- no resident receives an extra/missing turn

Expected duty counts after 30 cycles:

```text
Kai  = 8
Fia  = 8
Tekt = 7
Meme = 7
```

### Information boundaries

- no resident receives another resident's private notes
- journal input contains at most latest 4 committed entries
- failed turns do not appear as journal entries
- future drift/weather is absent from TurnInput
- raw internal system IDs are not exposed where resident-safe refs/descriptions are intended
- Lab-only data is absent from model input

### Reference resolution

- current opaque refs resolve correctly
- stale refs from a previous turn are rejected
- unknown refs are rejected
- refs never become persistent social names by system behavior

### Relationships

- zero or one relationship change per turn
- cannot change relationship with self
- cannot change by more than ±1
- cannot exceed configured bounds
- failed relationship validation commits nothing

### Transactions

- model failure causes zero committed state changes
- validation failure after repair causes zero committed state changes
- successful turn commits journal + optional memory + optional relationship + optional world event atomically
- cycle advances only after commit

### Domain validation

- cannot move missing object
- cannot move to missing place
- cannot move object to same place
- cannot create unsupported world action

### Replay/audit

- each committed turn has an input snapshot
- each model attempt retains raw output
- each turn retains its ref map
- experiment config identifies prompt/model/fixtures/language
- current world state agrees with applying committed world events

---

## 26. First implementation sequence

Implementation may be performed as one coherent branch/PR, but internally should become functional in this order:

1. domain types and Japanese baseline fixtures
2. in-memory/FakeModel 30-cycle runner
3. resident-safe ref mapping
4. validation and transaction semantics
5. SQLite persistence and event projections
6. Lab view
7. FOLKS view
8. one real cloud model adapter
9. full 30-cycle manual run
10. fix prompt/schema problems exposed by disposable technical runs
11. freeze the first actual baseline experiment version

Do not begin with visual polish or live scheduling.

---

## 27. Explicitly deferred after v0

- real-world elapsed time and catch-up cycles
- long-term memory compression
- forgetting
- journal search
- journal corruption or blank days
- resident refusal of duty
- dynamic rota
- direct resident-to-resident synchronous communication
- new residents / resident removal
- human messages to residents
- live news feeds
- object creation/destruction
- construction or new places
- local model runtime
- browser-only inference
- automatic semantic metrics using embeddings

These are experiment dimensions, not missing v0 requirements.
