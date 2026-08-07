# FOLKS — v0 Implementation Readiness

Last reviewed: 2026-08-08

Decision: **READY FOR IMPLEMENTATION**.

The repository was reviewed end-to-end before Codex handoff for:

- conceptual consistency
- cross-document conflicts
- resident/system information boundaries
- baseline experimental confounds
- turn state / failure / retry semantics
- implementation and acceptance-test completeness
- GitHub working state

The review found no remaining conceptual blocker after the corrections in `FINALIZATION_V0.md`.

## Material findings resolved before handoff

1. The original drift fixture strongly primed naming, tradition, inherited language, records, and persistence. It is now a resonant comparison fixture; the first baseline uses neutral drift.
2. The previous TurnInput/prompt examples could expose experiment ID and the 30-cycle horizon to residents. Finalization removes those from resident-visible context.
3. The previous wording allowed repeated manual creative retries after failed output. Baseline retry semantics now prevent content resampling selection bias.
4. Experiment state needed explicit `technical | baseline`, `paused`, and unambiguous `committedCycle` semantics.
5. The old approximate 80-character journal minimum could force narrative invention. v0 now permits genuinely short non-empty journals.
6. “Reset” semantics are fixed as create-new-experiment, never history rewrite.

## GitHub state at review

- implementation code: not started
- active implementation PR: none
- repository branch at design-review time: `main`
- preflight review: Issue #1 incorporated into design/gates
- implementation entrypoint: `docs/CODEX_HANDOFF_V0.md`

## Remaining unknowns are empirical, not conceptual

- selected cloud model/provider
- provider-specific structured-output syntax
- frozen generation parameters
- measured prompt/context budget
- exact SQLite/Drizzle application wiring

These should be resolved during implementation shakeout and recorded in experiment configuration.

## Handoff rule

Implementation should proceed on a dedicated branch and through a Draft PR. The design documents being committed directly to `main` is not permission to implement code on `main`.

If code work reveals a genuinely product-defining contradiction, record it and request a decision. Ordinary engineering choices should be resolved during implementation without reopening the concept phase.