# FOLKS — Implementation Notes

Last updated: 2026-08-07

This document describes the current technical direction and the reasoning behind it.

For exact v0 behavior and acceptance tests, `SPEC_V0.md` is authoritative.

For experiment fixtures, use `EXPERIMENT_V0.md`.

For baseline model-visible semantics, use `PROMPT_V0.md`.

---

## Design principle

Do not give the model control of the whole world.

> The world moves by code. The model creates meaning.

Code owns:

- duty order
- cycle progression
- information visibility
- journal window
- memory access boundaries
- legal world actions
- relationship bounds
- validation
- persistence
- atomic commit
- experiment configuration

The model owns:

- what the active resident notices
- how journals are interpreted
- what meaning is attached to world changes
- public journal prose
- private note prose
- zero or one small relationship-change proposal
- zero or one permitted world-action proposal
- an optional question left for the next resident

---

## v0 architecture

```text
Browser
  ├─ FOLKS view
  └─ Lab view

Application
  ├─ Experiment service
  ├─ Turn engine
  │   ├─ Rota
  │   ├─ Turn claim / idempotency
  │   ├─ Input builder
  │   ├─ TurnRefMap builder
  │   ├─ ModelAdapter
  │   ├─ Schema validation
  │   ├─ Ref resolution
  │   ├─ Domain validation
  │   └─ Atomic commit
  ├─ World projection
  ├─ Relationship projection
  └─ Observation helpers

Persistence
  ├─ experiment config
  ├─ turn snapshots
  ├─ model runs
  ├─ journal entries
  ├─ private notes
  ├─ relationship events
  └─ world events
```

The core engine should be framework-independent TypeScript where practical.

---

## Current v0 stack direction

Recommended initial stack:

```text
TypeScript
Next.js
SQLite
Drizzle ORM
Zod
```

Reasons:

- TypeScript gives one type system across domain, validation, application, and UI.
- Next.js is sufficient for a local/small hosted browser interface without introducing a separate frontend/backend deployment prematurely.
- SQLite is more than sufficient for a four-resident baseline and makes local ownership/portability easy.
- Drizzle keeps SQL/data modeling explicit enough for event history and snapshots.
- Zod is suitable for runtime structured-output validation and TypeScript inference.

These choices are implementation conveniences, not part of FOLKS's artistic identity. The domain model must remain portable.

Do not introduce a dedicated agent framework unless a concrete requirement appears that the ordinary turn engine cannot satisfy.

---

## Model strategy

### v0

Use one real cloud model adapter for the first baseline experiment, plus a mandatory deterministic/fake adapter for tests.

Do not make the rest of the code depend directly on a provider SDK.

```ts
interface ModelAdapter {
  generateTurn(input: TurnInput): Promise<unknown>;
}
```

Validation remains outside the adapter.

The specific cloud model and generation parameters are chosen during implementation shakeout and then frozen in experiment configuration before the first baseline run.

### Later

Possible additional adapters:

```text
LocalRuntimeAdapter
BrowserModelAdapter
```

Long-term, local execution still fits the character of FOLKS especially well: a small society living on the user's machine. It is not required to test the core inheritance mechanism.

A specific cloud or local model name should be recorded in each experiment configuration rather than hard-coded as FOLKS identity.

---

## Why no agent framework in v0

FOLKS has intentionally narrow autonomy.

The active resident does not need:

- arbitrary tool discovery
- recursive planning
- subagents
- web browsing
- background jobs
- multi-agent messaging
- arbitrary code execution

The orchestration loop is explicit and small. Hiding it behind a general agent framework would make the most important experimental mechanism harder to inspect.

The turn engine itself is the orchestration system.

---

## Data model approach

Use append-only event records for history and current-state projections for convenient reads.

Conceptually:

```text
historical truth = committed machine events
current world    = projection of committed events
journal          = resident interpretation
private notes    = resident-specific continuity
```

Do not rely only on mutable `residents` or `world_state` rows that erase how the state was reached.

Recommended conceptual tables:

```text
experiments
resident_definitions
turns
model_runs
journal_entries
private_notes
relationship_events
relationship_current
world_events
world_objects_current
drift_items
```

Snapshots can be JSON where that improves auditability, while relational/event columns should remain queryable for core identifiers and cycle ordering.

---

## Turn records and retries

A `turn` represents one logical experiment cycle.

Recommended invariant:

```text
UNIQUE(experiment_id, cycle)
```

A failed model execution does not create a new logical cycle.

Instead, the same turn may contain multiple `model_runs` / execution attempts while preserving every raw attempt.

Example:

```text
turn cycle=8
  model_run attempt=1 -> invalid JSON
  model_run attempt=2 -> repair invalid
  turn status=FAILED

manual retry of cycle 8
  model_run attempt=3 -> valid
  turn status=COMMITTED
```

The exact attempt numbering may distinguish automatic repair from manual retry, but audit history must make both visible.

The experiment's committed cycle advances only after the logical turn commits.

---

## Concurrency and duplicate execution

Even a single-user UI can send a duplicate request through double-click, refresh, retry, or network behavior.

FOLKS must not run two model generations for the same logical next turn unintentionally.

Required invariant:

> At most one active execution may own a given `(experiment_id, cycle)` at a time.

Recommended approach:

1. determine expected next logical cycle from last committed state
2. atomically create or claim that turn row
3. transition it to `GENERATING` using compare-and-set semantics
4. only the successful claimant calls the model
5. concurrent duplicate requests return the current turn state rather than launching another generation

A simple application mutex alone is insufficient if the app may ever run in more than one process. Prefer a database-backed claim/invariant.

For SQLite, an explicit transaction plus unique turn key / conditional status update is sufficient for v0.

---

## Stale in-progress recovery

A process may die while a turn is `GENERATING`.

Persist enough timing/state data to distinguish active generation from an abandoned claim.

Suggested turn fields:

```text
status
execution_token
claimed_at
updated_at
```

Recovery behavior:

- never assume a stale `GENERATING` turn committed
- do not mutate world state during recovery
- allow a deliberate retry of the same logical cycle after marking/reclaiming the abandoned execution
- preserve any model-run metadata already written

The exact timeout can remain implementation configuration; the recovery path itself must exist before treating long runs as reliable.

---

## Turn input construction

`TurnInput` is not a database dump.

An input builder deliberately exposes only permitted information.

For the current duty resident it includes:

- current cycle
- resident name and Japanese attention priors
- that resident's private notes
- coarse descriptions of directional relationships
- current world descriptions
- latest four journal entries
- current drift item
- next resident identity
- permitted action schema

It excludes:

- other residents' private notes
- full journal history
- event log truth
- future drift items
- future weather
- observation hypotheses
- human/Lab annotations
- raw relationship numbers
- model infrastructure

Information-boundary tests are first-class tests, not incidental implementation details.

---

## Resident-safe entity references

Structured actions need stable references, but internal IDs should not become accidental world vocabulary.

Preferred approach:

```text
internal database id: object_01
turn-local model ref: object:a
resident-facing prose: 手のひらほどの大きさの石。
```

The model outputs the turn-local ref in structured action fields.

The application stores a hidden TurnRefMap with the turn input, resolves the ref to an internal ID, then performs domain validation.

Requirements:

- model-facing refs are opaque
- refs are scoped to one turn
- stale refs are rejected
- public prose is not generated from DB IDs
- the ref map is visible only in Lab/audit data

---

## Atomic turn behavior

A model call must not mutate the world incrementally.

```text
1. Read last committed state
2. Determine duty resident / next logical cycle
3. Claim the logical turn
4. Build TurnInput + TurnRefMap
5. Persist immutable input/ref snapshots
6. Call model
7. Persist raw output
8. Validate schema
9. Resolve refs
10. Validate domain constraints
11. Optionally request one structured repair
12. Begin database commit transaction
13. Append journal/private/relationship/world events
14. Update projections
15. Mark turn committed
16. Advance experiment committed cycle
17. Commit database transaction
```

The network model call should normally occur **outside** the final database commit transaction. Do not hold a long write transaction open while waiting for the provider.

The earlier turn claim prevents duplicate execution while the network call is in flight.

If validation fails, the experiment remains at the same committed cycle.

If final database commit fails, none of the public/private/world changes should be considered committed.

---

## Output repair

Do not silently fix semantic mistakes in code.

Allowed:

- send validation errors and legal refs back to the model once and ask it to preserve intent while fixing structure

Not allowed:

- guess which object the model intended
- change illegal relationship deltas into legal values without recording failure
- fabricate missing journal text
- convert an unsupported action into the nearest supported action

Preserve raw invalid attempts in Lab history.

Repair is not a second creative turn. See `PROMPT_V0.md`.

---

## Prompt versioning

Prompt text is experimental configuration.

Every model run must be attributable to a `promptVersion`.

Never change a running experiment's prompt in place to improve the story.

If a prompt problem requires a model-visible change:

1. stop the current experimental run
2. increment prompt version
3. create a new experiment

Technical shakeout experiments may be discarded or labeled non-baseline. Once a baseline begins, model-visible conditions are frozen.

---

## FakeModelAdapter

The fake adapter is required before real-model integration.

It should support deterministic scripted outputs so tests can verify:

- rota
- Japanese fixtures
- journal window
- private-memory isolation
- legal/illegal opaque refs
- legal/illegal world actions
- zero/one relationship change rule
- relationship bounds
- validation failures
- repair behavior
- atomic commit
- duplicate-turn claims
- failed-turn retry
- 30-cycle completion

The fake adapter should not attempt to simulate believable social behavior. Its purpose is system correctness.

---

## Projection integrity

Current-state tables are caches/projections of committed history.

At minimum, tests or a diagnostic function should be able to rebuild:

- current object locations from initial world + committed world events
- current relationships from neutral initial values + committed relationship events

and compare the rebuilt result with projection tables.

This gives FOLKS a way to detect silent projection drift.

A full general event-sourcing framework is unnecessary; a small explicit replay function is enough.

---

## First real model run

Once the deterministic runner passes tests:

1. choose one cloud model
2. record model identifier and parameters in experiment config
3. use disposable technical experiments to validate structured output behavior
4. adjust provider-specific schema formatting if necessary
5. freeze resident prompt + model + fixture versions
6. create a clean baseline experiment
7. run the actual 30-cycle Japanese baseline without narrative intervention

If the baseline is dull, that is a valid result.

Do not improve it halfway through by adding personality, richer world mechanics, or culture-building instructions.

---

## FOLKS view

The public/creative surface should feel like a quiet observation device rather than an analytics product.

Possible emphasis:

- the current resident
- a small representation of world/object placement
- journal pages / timeline
- signs of passage from one duty resident to another
- subtle display of outside drift

Avoid making numerical relationship values or automated emergence scores central.

The visual design can become richer later, but v0 should prioritize readability of inheritance.

---

## Lab view

The Lab surface is allowed to be technical and dense.

It should expose enough information to diagnose both code and experimental interpretation:

- exact TurnInput snapshot
- exact TurnRefMap snapshot
- exact raw model output
- repair attempts
- validation errors
- validated TurnOutput
- event changes
- private notes
- relationship history
- prompt/model/fixture versions
- turn claim/retry state where useful

A future observation layer may add phrase recurrence, cross-resident adoption, naming persistence, contradiction survival, and question-lifetime aids.

Those helpers should link back to source journal entries rather than present an opaque score.

---

## Scheduling and offline time

The earlier idea of mapping real elapsed time to duty cycles remains valuable for long-term FOLKS, but it is intentionally not part of v0.

Later design may support:

```text
real elapsed time
  ↓
number of missed duty cycles
  ↓
controlled catch-up / compression policy
```

Do not build this until the 30-cycle logical-time baseline has shown that the core inheritance mechanism is worth keeping.

---

## Security and privacy basics

Even for a small experimental application:

- API keys stay server-side / environment-only
- never persist secrets in TurnInput/model-run snapshots
- resident input must not accidentally include Lab-only data
- journal/private/drift content cannot override hidden execution rules
- raw provider metadata should be stored only when useful and safe
- exporting experiments should exclude secrets by construction

If FOLKS later accepts private human messages or uses live external data, revisit privacy boundaries explicitly.

---

## Implementation priority

The priority is not visual spectacle.

1. auditable turn engine
2. information boundaries
3. turn claiming / duplicate-execution safety
4. atomic state transition
5. deterministic tests
6. real model adapter
7. readable journal inheritance
8. observation tooling
9. visual world refinement
10. long-duration autonomy

The first hard problem is not drawing the village. It is making sure the village has a trustworthy past.
