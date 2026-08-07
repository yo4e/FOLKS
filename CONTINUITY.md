# CONTINUITY

Last updated: 2026-08-07

## Current state

FOLKSは構想保存段階から、**v0設計確定・実装待ち**の段階へ進んだ。

2026-08-07に、既存のCONCEPT / IMPLEMENTATION / OPEN_QUESTIONSを再読し、最初の4住民・30サイクル実験について、作品設計、データ境界、実験条件、Turn入出力、validation、transaction、観察仮説まで詰めた。

実装はまだ開始していない。

次にコードを書く場合は、まず以下を読む。

1. `docs/DESIGN.md`
2. `docs/SPEC_V0.md`
3. `docs/EXPERIMENT_V0.md`

この3文書が現在の優先仕様である。

## Project identity

FOLKSは、ブラウザから観察できる小さなAI社会である。

複数の住民が常時会話するのではなく、交代制で一人だけが「日直」として起動する。日直は小世界の現在、外界から届いた少数の情報、直近の日誌、自分の私的記憶と他者への現在の感触を読み、日誌と小さな変化を残して休眠する。

次の日直は、前任者の日誌を絶対的な事実ではなく、前任者による解釈として受け取る。

中心式：

> The model provides intelligence.  
> The journal provides continuity.  
> The rota provides autonomy.

中心的な問い：

> 住民が社会と日誌を維持しているのか。  
> それとも、日誌が住民を使って自分自身を維持しているのか。

## Decisions now fixed for v0

### Experiment

- 4 residents
- 30 cycles
- 1 active resident per cycle
- fixed rota
- logical time only
- no synchronous resident conversation
- no human-to-resident conversation
- one fixed outside drift item per cycle
- fixed experiment fixtures for baseline reproducibility

### Residents

Names and order:

```text
Kai → Fia → Tekt → Meme → repeat
```

Residents do **not** know they are AI, models, programs, or experiment participants.

They know only the world-internal duty system: one resident is active at a time, recent journals are inherited, and journals may be mistaken or subjective.

Initial differences are attention priors, not strong personalities:

- Kai — changes, inconsistencies, differences
- Fia — words, requests, promises, relationships
- Tekt — object positions, order, maintenance, practical consequences
- Meme — repetition, names, cycles, repeated language

No backstories, professions, fixed speaking styles, or prescribed relationships in v0.

### Journal and memory

- shared journal is append-only
- old journal entries cannot be edited or corrected in place
- each duty resident reads at most the latest 4 committed journal entries
- each resident reads all of their own prior private notes
- residents cannot read other residents' private notes
- no journal search in v0
- no memory embeddings, summarization, compression, or forgetting in v0

### World

The initial world is deliberately tiny:

- a central open area
- a low shelf
- a shallow unnamed depression
- a palm-sized stone
- a small empty vessel
- a short piece of cord
- mild fixed weather per cycle

Residents may socially name or reinterpret places and objects, but those meanings do not automatically become system facts.

The only v0 world action is moving one existing object to one existing place, at most once per turn.

### Human observer

The user is an observer in v0.

The observer can run, pause, inspect, reset/duplicate experiments, and read history, but does not speak to residents or write into their journal.

Residents do not know they are being observed.

### System architecture

FOLKS separates:

```text
system fact     = append-only machine/audit history
journal         = residents' public interpretation
private memory  = each resident's private continuity
```

The system is designed as event log + current-state projections rather than CRUD-only mutable state.

Each TurnInput and model output is preserved so that later it is possible to answer:

> What exactly did this resident know at cycle N?

A turn is atomic. Model or validation failure must not partially mutate the world or advance the cycle.

### Model boundary

Model generation remains replaceable through a ModelAdapter boundary.

The initial implementation should include a deterministic/fake adapter for system tests and one real cloud adapter for the first actual experiment.

Local and browser models remain later options.

## Baseline observation hypotheses

The first 30-cycle experiment watches primarily for:

1. **Propagation** — one resident's term, concern, interpretation, or practice is reused by another.
2. **Transformation** — a shared item changes meaning while passing through residents.
3. **Institutionalization** — an unprogrammed pattern persists across residents/cycles strongly enough to behave like a local convention.

Do not prompt residents to create culture, traditions, myths, autonomous behavior, novel vocabulary, or emergence. Those are possible observations, not resident instructions.

## Explicitly deferred

The following are intentionally not v0 requirements:

- real-time scheduling
- offline catch-up cycles
- dynamic rota or duty refusal
- live news
- journal corruption or blank days
- long-term memory compression and forgetting
- journal search
- direct resident conversation
- human intervention
- new residents or resident removal
- object creation/destruction and construction
- local model runtime
- browser-only inference
- semantic embedding-based observation metrics

These should be introduced as later experimental variables, not quietly folded into the baseline.

## Implementation handoff

For implementation, `docs/SPEC_V0.md` is authoritative for behavior and acceptance tests.

Recommended implementation order inside one coherent implementation branch/PR:

1. domain types and fixtures
2. FakeModel 30-cycle runner
3. validation and atomic turn semantics
4. persistence/event projections
5. Lab view
6. FOLKS view
7. one real cloud model adapter
8. first full 30-cycle baseline run

Do not begin by building a rich world, live scheduler, or polished game UI.

## Instruction to the next Monday / Codex

- Read `docs/DESIGN.md`, `docs/SPEC_V0.md`, and `docs/EXPERIMENT_V0.md` before coding.
- Treat the v0 baseline as an experiment whose conditions must remain inspectable and reproducible.
- Preserve information boundaries: private notes must never leak across residents.
- Preserve the distinction between system fact and journal interpretation.
- Do not add features merely because an agent framework makes them easy.
- Do not prompt the model to manufacture the behaviors the experiment is supposed to observe.
- Prefer a small, auditable engine over a feature-rich agent demo.

FOLKS is no longer dormant. The next step is implementation, not another concept restart.
