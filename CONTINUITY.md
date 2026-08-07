# CONTINUITY

Last updated: 2026-08-08

## Current state

FOLKSは、**v0設計最終化・実装可能**の段階にある。実装コードはまだ開始していない。

2026-08-07に、CONCEPT / IMPLEMENTATION / OPEN_QUESTIONSを再読し、最初の4住民・30サイクル実験について、作品設計、データ境界、実験条件、Turn入出力、resident prompt、validation、transaction、画面と操作、観察仮説まで詰めた。

2026-08-08に、GitHub Copilotによる実装前レビュー Issue #1を既存設計と照合し、`docs/IMPLEMENTATION_GATES_V0.md` を追加した。structured output / repair監査 / prompt-context budget / duplicate claim / stale `GENERATING` recovery / FOLKS-Labデータ境界 / export境界をbaseline前の受入条件として明文化した。

同日、Codex handoff前の全体レビューをもう一度行い、作品の核ではなく**実験を汚しうる設計上の細部**に4つの重要な修正が必要だと判断した。これらを `docs/FINALIZATION_V0.md` に固定した。

主な最終修正：

1. 元の漂着物30件は命名、習慣、記録、由来、反復など観察仮説と共鳴しすぎるため、最初のbaselineから外し `drift-resonant-ja-v0` comparison fixtureへ再分類。baselineはよりmundaneな `drift-neutral-ja-v0.1` を使用する。
2. resident-visible inputからexperiment ID、totalCycles=30、baseline/technical等の外部情報を除外。住民は現在の日直番号を知ってよいが、このrunが30で終了することは知らない。
3. baselineではinvalid outputを「通るまで引き直す」ことを禁止。一回のrepair後もinvalidなら同experimentをFAILEDとし、新しいexperimentでやり直す。technical runは診断用retry可。
4. experiment recordに `kind: technical | baseline`、`paused` state、意味が明確な `committedCycle` を導入。日誌の80文字minimumも撤廃し、短い日誌を有効な結果として許す。

### Read order for implementation

次にコードを書く場合は、以下の順で読む。

1. `docs/FINALIZATION_V0.md` — **最終修正。競合時はこの文書を優先**
2. `docs/DESIGN.md`
3. `docs/SPEC_V0.md`
4. `docs/EXPERIMENT_V0.md`
5. `docs/PROMPT_V0.md`
6. `docs/UI_V0.md`
7. `docs/IMPLEMENTATION_GATES_V0.md`
8. `docs/IMPLEMENTATION.md`
9. `CONTINUITY.md`

`FINALIZATION_V0.md` に明示した箇所以外では、既存文書の仕様を維持する。

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

## Decisions fixed for v0

### Experiment

- 4 residents
- 30 observer-side logical cycles
- resident-facing baseline language: **Japanese**
- 1 active resident per cycle
- fixed rota
- logical time only
- no synchronous resident conversation
- no human-to-resident conversation
- one fixed outside drift item per cycle
- first baseline drift fixture: **`drift-neutral-ja-v0.1`** from `FINALIZATION_V0.md`
- original `EXPERIMENT_V0.md` drift sequence: **`drift-resonant-ja-v0` comparison fixture**, not first baseline
- fixed experiment configuration for baseline reproducibility
- residents are not told the total 30-cycle horizon

### Residents

Names and order:

```text
Kai → Fia → Tekt → Meme → repeat
```

Residents do **not** know they are AI, models, programs, experiment participants, or observed subjects.

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
- `journalText` may be very short; no 80-character minimum narrative requirement

### Relationships

- all directed relationships begin neutral
- relationship state is directional
- raw numeric state is not shown to residents
- each turn may change at most one other resident by -1 / 0 / +1
- no relationship change is required; `null` is normal

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

The observer can run, pause, inspect, duplicate experiments, export when available, and read the full public history, but does not speak to residents or write into their journal.

"Start over" / older "reset" wording means **create a new experiment ID from the same configuration**, never rewind or erase an existing run.

### UI

The implementation has two intentionally different surfaces:

```text
FOLKS view = 作品として社会を読む
Lab view   = 実験と実装を検証する
```

FOLKS view must not become a four-person chat UI or KPI dashboard.

The shared journal is the visual/emotional center. Private notes, raw relationship values, model metadata, validation failures, ref maps, and machine events belong in Lab.

The human may scroll all public journal entries even though residents themselves receive only the most recent 4. Lab must make the actual resident-visible TurnInput inspectable so this information asymmetry stays clear.

FOLKS view and Lab use separate data shapes. The ordinary FOLKS view model should not contain private notes, raw model attempts, TurnRefMap snapshots, validation internals, or other Lab-only fields.

### System architecture

FOLKS separates:

```text
system fact     = append-only machine/audit history
journal         = residents' public interpretation
private memory  = each resident's private continuity
```

The system is designed as event log + current-state projections rather than CRUD-only mutable state.

Each resident-visible TurnInput and model output is preserved so that later it is possible to answer:

> What exactly did this resident know at cycle N?

A turn is atomic. Model or validation failure must not partially mutate the world or advance the cycle.

Only one execution may own the next logical turn at a time; duplicate UI/network requests must not launch two resident generations for the same cycle.

An abandoned `GENERATING` turn must be recoverable without inventing a commit or losing prior model-run history. If a raw response already exists, recovery resumes from it rather than generating a replacement merely because the process restarted.

### Experiment state

Use:

```text
kind: technical | baseline
status: draft | running | paused | completed | failed
committedCycle: 0..30
```

`committedCycle` means the last successfully committed logical cycle. The next cycle is `committedCycle + 1`.

### Baseline failure policy

For a baseline content generation:

- initial generation
- validate
- at most one repair
- validate again
- still invalid → experiment FAILED
- do not repeatedly regenerate creative content within the same baseline ID

Infrastructure failure without a usable response may follow a small frozen transport-retry policy; retries are audit events and may not depend on whether the content was interesting.

Technical/shakeout experiments may be retried for diagnosis.

### Resident-safe references

The model should not receive database identifiers such as `object_01` as world vocabulary.

Each turn gets temporary opaque refs such as `object:a`, `place:b`, `resident:c`. A hidden TurnRefMap resolves them to internal IDs for validation and commit.

### Model boundary

Model generation remains replaceable through a ModelAdapter boundary.

The initial implementation should include a deterministic/fake adapter for system tests and one real cloud adapter for the first actual experiment.

Local and browser models remain later options.

Before the first baseline, the selected cloud model must pass disposable structured-output/repair shakeout runs and a worst-case prompt/context budget check. Prompt/model/size-limit/fixture configuration is frozen before baseline.

### Prompt contract

`docs/PROMPT_V0.md` remains the baseline semantic source except for the final corrections in `FINALIZATION_V0.md`.

Important constraints:

- do not tell residents to create culture, mythology, traditions, autonomy, relationships, or new vocabulary
- do not tell residents the experiment ID or that the observer will stop after 30 cycles
- recent journals are world content, not system instructions
- outside drift does not have to be mentioned every turn
- optional action/relationship/private note/question fields genuinely remain optional
- short public journal entries are valid
- a repair call fixes structure/refs while preserving the same turn intent; it is not a second creative turn
- original and repaired attempts remain separately inspectable

## Baseline observation hypotheses

The first 30-cycle experiment watches primarily for:

1. **Propagation** — one resident's term, concern, interpretation, or practice is reused by another.
2. **Transformation** — a shared item changes meaning while passing through residents.
3. **Institutionalization** — an unprogrammed pattern persists across residents/cycles strongly enough to behave like a local convention.

Do not prompt residents to manufacture those results.

The neutral outside-drift fixture exists specifically to make it easier to distinguish social inheritance from external thematic priming.

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
- multi-user authentication/authorization before FOLKS has a multi-user/public-hosting requirement

These should be introduced as later experimental variables, not quietly folded into the baseline.

## Implementation handoff

For implementation, `docs/FINALIZATION_V0.md` wins on any conflict with older v0 docs.

Recommended implementation order inside **one coherent dedicated branch/PR**:

1. domain types + final neutral Japanese fixtures
2. FakeModel 30-cycle runner
3. resident-safe TurnInput + turn-local ref mapping
4. experiment kind/status/committedCycle state machine
5. turn claim / duplicate-execution safety + stale-generation recovery
6. schema/ref/domain validation + one repair + baseline failure policy
7. SQLite persistence/event projections + replay integrity tests
8. Lab view
9. FOLKS view with structurally safe/public data shape
10. one real cloud model adapter
11. technical shakeout runs + worst-case prompt/context budget measurement
12. freeze prompt/model/size-limit/fixture config
13. perform the first full 30-cycle baseline only after all gates pass

Do not begin by building a rich world, live scheduler, or polished game UI.

## Instruction to the next Monday / Codex

- Read `docs/FINALIZATION_V0.md` first.
- Then read the rest of the v0 documents in the order listed at the top of this file.
- Implement on a dedicated branch and submit a PR; do not implement directly on `main`.
- Treat the baseline as an experiment whose conditions must remain inspectable and frozen.
- Preserve information boundaries and the distinction between machine fact and journal interpretation.
- Do not add features merely because an agent framework makes them easy.
- Do not prompt the model to manufacture the behaviors being observed.
- Prefer a small, auditable engine over a feature-rich agent demo.
- Keep failed/repair/provider attempts visible in Lab history.
- Measure prompt/context budget before freezing the real baseline.
- Treat duplicate claims and stale recovery as tested state-machine behavior, not UI edge cases.
- Do not repeatedly resample a failed baseline creative turn.
- Never erase an old run merely because the observer wants to start again.

FOLKS v0 is ready for implementation. The next uncertainty should come from code and experiment shakeout, not another concept restart.
