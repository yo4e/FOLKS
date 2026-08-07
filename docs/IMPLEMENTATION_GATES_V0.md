# FOLKS — v0 Implementation Gates

Last updated: 2026-08-08

Status: required pre-baseline checks supplementing `SPEC_V0.md`.

This document records implementation risks surfaced by the pre-implementation review in Issue #1 and turns the useful additions into explicit gates.

It does **not** change the artistic or experimental design of FOLKS v0. Most of Issue #1 confirms decisions already present in `SPEC_V0.md`, `PROMPT_V0.md`, `IMPLEMENTATION.md`, and `UI_V0.md`: FakeModel-first testing, strict validation, one repair attempt, turn-local opaque refs, database-backed turn claims, atomic commit, model/prompt metadata, and Lab visibility.

The additions below are the parts that should become explicit implementation/acceptance requirements before the first meaningful baseline run.

---

## 1. Structured-output shakeout gate

Before a real baseline experiment, disposable technical experiments must exercise at least:

- malformed structured output
- explanatory prose surrounding otherwise valid JSON, if the provider can produce it
- missing required fields
- stale refs from another turn
- unknown refs
- illegal relationship target/delta
- illegal or no-op world actions
- one successful repair
- one failed repair

Requirements:

- preserve every raw model attempt
- repair at most once automatically
- never silently guess an intended ref or action
- repair receives concise validation errors, the required output structure, and the current valid opaque refs when refs are relevant
- repair must preserve the original turn intent rather than becoming a second creative turn

The baseline should not begin until these cases behave predictably with the selected provider/model.

---

## 2. Repair audit gate

Lab must make the distinction between original generation and repair unmistakable.

For a repaired turn, expose:

1. first raw attempt
2. validation errors from that attempt
3. repair request metadata
4. repaired raw attempt
5. second validation result
6. final validated/committed output, if any

Add a simple field-level or raw-text diff between the first and repaired attempts when inexpensive to implement.

The diff is an **audit aid**, not an automatic semantic-quality score. It may be computed in the UI and does not need to become a new persisted domain record if both raw attempts are already stored.

A repair that changes narrative substance substantially should remain visible to the human observer rather than being hidden behind a green "valid" state.

---

## 3. Prompt/context budget gate

The character limits in `SPEC_V0.md` are initial experimental limits, not assumptions that should go unmeasured.

Before freezing the first real baseline configuration, run a worst-case prompt-size check using the selected model/provider.

The test input should include at least:

- four maximum-length journal entries
- the maximum number of prior private notes a resident can actually possess when taking a v0 turn (seven in the 30-cycle fixed rota), at the configured maximum note length
- all resident relationship descriptions
- all world/place/object descriptions
- the complete baseline hidden protocol and structured-output schema
- one drift item

Record, where available:

- serialized resident-visible/context character count
- estimated or tokenizer-derived input tokens
- provider-reported input tokens
- configured maximum output tokens
- actual output tokens for shakeout calls

The selected baseline configuration must fit the chosen model context window with a deliberate safety margin rather than merely fitting by accident.

If empirical shakeout requires changing journal/private-note/output limits, treat those limits as experiment configuration: freeze the new values before the baseline and do not change them mid-run.

Token counting is a technical diagnostic. Residents never see token budgets or context-window language.

---

## 4. Duplicate claim and stale-generation recovery gate

`IMPLEMENTATION.md` already requires a database-backed ownership claim for `(experiment_id, cycle)` and a recovery path for abandoned `GENERATING` turns. These now become explicit acceptance cases.

Required invariants:

- `UNIQUE(experiment_id, cycle)` or an equivalent database invariant prevents duplicate logical turns
- compare-and-set / conditional status transition decides which execution owns a turn
- only the successful claimant may call the model for that execution
- a concurrent duplicate request returns/observes the existing turn instead of starting a second generation
- an active claim cannot be casually reclaimed
- a demonstrably stale/abandoned `GENERATING` execution can be marked abandoned or deliberately reclaimed for the **same logical cycle**
- recovery never mutates journal/world/relationship state by itself
- prior `model_runs` and raw attempts remain preserved after recovery
- the experiment cycle advances only after a successful atomic commit

Minimum tests:

1. two simultaneous claims for the same next cycle produce one owner
2. duplicate UI/network retry does not create a second model generation
3. an active `GENERATING` turn cannot be reclaimed
4. a stale `GENERATING` turn can be deliberately recovered
5. recovery preserves previous model-run audit history
6. a recovered turn still commits at most once

The stale timeout itself may remain implementation configuration; the existence and auditability of the recovery path may not.

---

## 5. Model-run reproducibility metadata gate

`Experiment` already stores:

- `modelIdentifier`
- `promptVersion`
- `modelParameters`
- `randomSeed` when applicable
- fixture/language versions

Each `model_run` should additionally retain useful execution metadata when the provider exposes it safely, for example:

- provider/model identifier actually returned by the API
- request start/end timestamps and latency
- input/output token usage
- finish/stop reason
- structured-output or schema mode used

Do not fabricate fields a provider does not supply, and do not persist secrets.

The goal is not perfect deterministic replay of a probabilistic model. The goal is to know enough about each run to compare experiments and diagnose unexplained differences.

---

## 6. FOLKS/Lab data-boundary gate

Issue #1 describes this as a UI privacy/permission risk. For v0, do not introduce a multi-user authorization system merely to solve an internal surface boundary.

Instead, make the boundary structural.

### FOLKS view data shape

The normal FOLKS surface should be built from a resident-safe/public observer view model that **does not contain**:

- private notes
- raw TurnInput snapshots
- TurnRefMap snapshots
- raw model attempts
- validation/repair internals
- raw relationship numbers
- internal database IDs where resident/public prose is intended
- secret/provider credentials

If those fields never enter the FOLKS-view data object, an accidental component render cannot expose them.

### Lab data shape

Lab may explicitly request the richer audit model containing private notes, raw attempts, ref maps, machine events, and diagnostic metadata.

This is a product/data-shaping boundary in v0. If FOLKS later becomes a multi-user or publicly hosted service, add real authentication/authorization as a separate security design rather than pretending the v0 view-model split is sufficient access control.

---

## 7. Export boundary gate

Do not use one ambiguously named "export" for both the creative/public surface and the audit surface.

If v0 implements only one export, make it explicitly a **Lab audit JSON export** and keep it in Lab/experiment tooling.

A Lab audit export may include:

- frozen experiment configuration
- resident definitions
- TurnInput/ref-map snapshots
- raw model attempts and validation metadata
- public journals
- private notes
- relationship events
- world events

It must exclude API keys, environment secrets, authentication material, and unrelated server configuration by construction.

If a later **public/creative export** is added, it should be a separate projection and should exclude private notes, raw model attempts, TurnInput/ref maps, validation internals, and other Lab-only material unless the user explicitly chooses an audit export.

---

## 8. Implementation order confirmation

Issue #1 strongly recommends FakeModel + tests first. This matches the existing v0 specification and remains the correct order.

Before integrating the real cloud model, the deterministic path should already verify:

- 30-cycle rota completion
- journal-window enforcement
- private-memory isolation
- ref generation/resolution and stale-ref rejection
- schema/domain failure paths
- automatic repair limit
- duplicate claim behavior
- stale-generation recovery
- atomic commit
- projection rebuild integrity

The real model is allowed to reveal prompt/schema reliability problems. It should not be the thing that discovers basic state-machine correctness.

---

## 9. What Issue #1 does not change

The review does not justify adding the following to v0:

- a richer agent framework
- synchronous resident conversation
- live web/news tools
- memory embeddings or summarization
- stronger personality prompts
- automatic culture/emergence scoring
- multi-user auth before there is a multi-user product requirement

These would change the experiment or add machinery unrelated to the risks identified by the review.

---

## Pre-baseline checklist

The first meaningful baseline run may start only when all of the following are true:

- deterministic/FakeModel required tests pass
- duplicate-turn and stale-recovery tests pass
- selected real model can reliably return/repair the required structured output in disposable shakeout runs
- prompt/context budget has been measured against the selected model
- prompt version, model identifier, generation parameters, size limits, fixtures, and language are frozen in a fresh experiment
- Lab can distinguish raw attempt → validation → repair → committed output
- FOLKS view cannot receive private/Lab-only fields through its normal data shape
- audit export, if present, excludes secrets by construction

After these gates pass, a dull 30-cycle baseline is still a valid result. Do not improve the story by changing conditions mid-run.
