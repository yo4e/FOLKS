# FOLKS — Implementation Notes

Last updated: 2026-08-07

This document describes the current technical direction and the reasoning behind it.

For exact v0 behavior and acceptance tests, `SPEC_V0.md` is authoritative.

For experiment fixtures, use `EXPERIMENT_V0.md`.

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
- small relationship-change proposals
- one permitted world-action proposal
- a question left for the next resident

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
  │   ├─ Input builder
  │   ├─ ModelAdapter
  │   ├─ Schema validation
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
- Zod is suitable for both runtime structured-output validation and TypeScript inference.

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

## Turn input construction

`TurnInput` is not a database dump.

An input builder deliberately exposes only permitted information.

For the current duty resident it includes:

- current cycle
- resident name and attention priors
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
resident-facing prose: A stone about the size of a palm.
```

The model may output `object:a` in a structured action, but public prose should be generated from world descriptions rather than database terminology.

The application resolves turn-local refs back to internal IDs before domain validation.

---

## Atomic turn behavior

A model call must not mutate the world incrementally.

```text
1. Read last committed state
2. Determine duty resident
3. Build TurnInput
4. Persist input snapshot / turn attempt
5. Call model
6. Persist raw output
7. Validate schema
8. Validate domain constraints
9. Optionally request one structured repair
10. Begin database transaction
11. Append journal/private/relationship/world events
12. Update projections
13. Mark turn committed
14. Advance cycle
15. Commit database transaction
```

If steps 5–9 fail, the experiment remains at the same committed cycle.

If database commit fails, none of the public/private/world changes should be considered committed.

---

## Output repair

Do not silently fix semantic mistakes in code.

Allowed:

- send validation errors back to the model once and ask it to return a valid structure

Not allowed:

- guess which object the model intended
- change illegal relationship deltas into legal values without recording failure
- fabricate missing journal text
- convert an unsupported action into the nearest supported action

Preserve raw invalid attempts in Lab history.

This keeps the experiment auditable and helps compare model reliability later.

---

## Prompt versioning

Prompt text is experimental configuration.

Every model run must be attributable to a `promptVersion`.

Never change a running experiment's prompt in place to improve the story.

If a prompt problem requires a meaningful change:

1. stop the current experimental run
2. increment prompt version
3. create a new experiment

Minor purely infrastructural fixes that provably do not change model-visible input can retain the experiment version, but should still be documented in source history.

---

## FakeModelAdapter

The fake adapter is required before real-model integration.

It should support deterministic scripted outputs so tests can verify:

- rota
- journal window
- private-memory isolation
- legal/illegal world actions
- relationship bounds
- validation failures
- repair behavior
- atomic commit
- 30-cycle completion

The fake adapter should not attempt to simulate believable social behavior. Its purpose is system correctness.

---

## First real model run

Once the deterministic runner passes tests:

1. choose one cloud model
2. record model identifier and parameters in experiment config
3. freeze prompt + fixture versions
4. run a few disposable technical turns to validate structured output behavior
5. reset/create a clean baseline experiment
6. run the actual 30-cycle baseline without narrative intervention

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
- exact raw model output
- repair attempts
- validation errors
- validated TurnOutput
- event changes
- private notes
- relationship history
- prompt/model/fixture versions

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
- raw provider metadata should be stored only when useful and safe
- exporting experiments should exclude secrets by construction

If FOLKS later accepts private human messages or uses live external data, revisit privacy boundaries explicitly.

---

## Implementation priority

The priority is not visual spectacle.

1. auditable turn engine
2. information boundaries
3. atomic state transition
4. deterministic tests
5. real model adapter
6. readable journal inheritance
7. observation tooling
8. visual world refinement
9. long-duration autonomy

The first hard problem is not drawing the village. It is making sure the village has a trustworthy past.
