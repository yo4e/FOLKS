# FOLKS — Codex Handoff v0

Last updated: 2026-08-08

Status: implementation task handoff.

This file is deliberately short. It is an entrypoint, not a replacement for the design documents.

## Goal

Implement the complete FOLKS v0 vertical slice as one coherent, reviewable branch/PR.

Do not redesign the project during implementation unless a genuine contradiction or technical blocker is discovered.

## Mandatory read order

1. `docs/FINALIZATION_V0.md`
2. `docs/DESIGN.md`
3. `docs/SPEC_V0.md`
4. `docs/EXPERIMENT_V0.md`
5. `docs/PROMPT_V0.md`
6. `docs/UI_V0.md`
7. `docs/IMPLEMENTATION_GATES_V0.md`
8. `docs/IMPLEMENTATION.md`
9. `CONTINUITY.md`

`FINALIZATION_V0.md` wins on conflicts with older v0 documents.

## Final overrides that are easy to miss

- First baseline drift fixture is `drift-neutral-ja-v0.1` from `FINALIZATION_V0.md`.
- The original drift list in `EXPERIMENT_V0.md` is `drift-resonant-ja-v0`, a later comparison fixture.
- Residents must not receive experiment ID or total-cycle horizon. They may know the current duty number, not that the observer stops at 30.
- `journalText` is non-empty up to 500 Japanese characters; there is no 80-character minimum.
- Experiment has `kind: technical | baseline`, `status: draft | running | paused | completed | failed`, and `committedCycle: 0..30`.
- A baseline turn gets at most one creative generation plus one structural repair. If still invalid, the baseline experiment fails; do not repeatedly resample content in the same baseline ID.
- Stale generation recovery reuses a persisted raw response when one exists.
- “Reset/start over” creates a new experiment ID; it never rewrites old history.

## Implementation sequence

Implement inside one branch/PR, but make the system functional in this order:

1. TypeScript domain types and final Japanese fixtures
2. deterministic `FakeModelAdapter`
3. in-memory 30-cycle runner and required tests
4. resident-visible TurnInput / TurnRefMap boundary
5. experiment lifecycle and turn claim/idempotency
6. schema/ref/domain validation and one-repair path
7. stale `GENERATING` recovery and baseline failure policy
8. SQLite + Drizzle persistence, append-only events, projections, replay integrity
9. Lab view
10. FOLKS view using a structurally public/safe data shape
11. one real cloud `ModelAdapter`
12. disposable provider shakeout + worst-case prompt/context measurement
13. freeze model/prompt/limits/fixtures for a fresh baseline
14. run the 30-cycle baseline only if all implementation gates pass and credentials/environment permit it

Do not begin with visual polish.

## Required engineering properties

- exactly one logical turn per `(experiment, cycle)`
- database-backed duplicate claim protection
- no world/journal/private/relationship mutation before atomic commit
- failed turns never advance `committedCycle`
- every model attempt remains auditable
- current projections can be rebuilt/checked from committed event history
- another resident's private notes never enter TurnInput
- FOLKS view data objects do not contain Lab/private/raw fields
- internal DB IDs do not leak into resident prose/context where opaque refs are intended
- prompt/model/fixture/config versions are frozen per baseline experiment
- no secrets in snapshots or exports

## Definition of done

The v0 implementation is ready when:

- FakeModel can run all 30 cycles and all required/gate tests pass;
- duplicate claims, failure, repair, stale recovery, and projection rebuild are tested;
- FOLKS view can read the tiny society as a quiet journal/world view;
- Lab can inspect exact resident-visible input, ref map, raw attempts, validation/repair, committed output, private memory, relationship events, world events, and frozen config;
- one cloud adapter exists behind the model boundary;
- provider shakeout and context-budget gates are either passed or clearly documented as blocked by unavailable credentials/environment;
- no deferred v1 features have been smuggled into v0.

A dull baseline is a valid result. Do not improve the narrative by changing conditions mid-run.

## Explicit non-goals

Do not add:

- agent frameworks without a concrete need
- synchronous resident chat
- human-to-resident messaging
- live news/web tools
- real-time/offline scheduling
- memory embeddings, summarization, or forgetting
- object/place creation
- dynamic rota
- culture/ritual/myth generation instructions
- automatic emergence score
- multi-user authentication before there is a multi-user deployment requirement

## Git workflow

- do not implement directly on `main`
- create a dedicated implementation branch
- preserve unrelated/user changes
- run tests, lint, typecheck, and build where available
- inspect the final diff
- open a Draft PR with completed checks, remaining gates, and any unresolved empirical model/provider choice

Prefer one coherent PR over mechanical fragmentation.

If implementation reveals a design contradiction that materially changes the experiment, stop that specific decision and document it rather than silently choosing a new product behavior.