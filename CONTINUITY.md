# CONTINUITY

Last updated: 2026-08-08

## Current state

FOLKSは構想保存段階から、**v0設計確定・実装待ち**の段階へ進んだ。

2026-08-07に、既存のCONCEPT / IMPLEMENTATION / OPEN_QUESTIONSを再読し、最初の4住民・30サイクル実験について、作品設計、データ境界、実験条件、Turn入出力、resident prompt、validation、transaction、画面と操作、観察仮説まで詰めた。

2026-08-08に、GitHub Copilotによる実装前レビュー Issue #1（モデル出力、repair、ref、prompt長、同時実行、再現性、UI境界、テスト）を既存設計と照合した。大半はすでに現行仕様と一致しており、作品／実験設計そのものの変更は不要と判断した。一方で、実装時に曖昧になりやすい受入条件を `docs/IMPLEMENTATION_GATES_V0.md` として追加した。特に、repair前後の監査、prompt/context budgetの実測、stale `GENERATING` 回収テスト、FOLKS/Labの構造的データ分離、export境界を明文化した。

実装はまだ開始していない。

次にコードを書く場合は、まず以下を読む。

1. `docs/DESIGN.md`
2. `docs/SPEC_V0.md`
3. `docs/EXPERIMENT_V0.md`
4. `docs/PROMPT_V0.md`
5. `docs/UI_V0.md`
6. `docs/IMPLEMENTATION_GATES_V0.md`

この6文書が現在の優先仕様である。`docs/IMPLEMENTATION.md` は技術的な理由と補足を含む実装ノートとして併読する。

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
- resident-facing baseline language: **Japanese**
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

Residents do not know they are being observed.

"Start over" should create a new experiment rather than erasing/reusing the old experiment ID.

### UI

The implementation has two intentionally different surfaces:

```text
FOLKS view = 作品として社会を読む
Lab view   = 実験と実装を検証する
```

FOLKS view must not become a four-person chat UI or KPI dashboard.

The shared journal is the visual/emotional center. The tiny world shows current object locations and weather. Private notes, raw relationship values, model metadata, validation failures, and machine events belong in Lab.

The human may scroll all public journal entries even though residents themselves receive only the most recent 4. Lab must make the actual resident TurnInput inspectable so this information asymmetry stays clear.

FOLKS view and Lab should use separate data shapes. The ordinary FOLKS view model should not contain private notes, raw model attempts, TurnRefMap snapshots, validation internals, or other Lab-only fields. In v0 this is primarily a structural product/data boundary, not a substitute for authentication in a future multi-user deployment.

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

Only one execution may own the next logical turn at a time; duplicate UI/network requests must not launch two resident generations for the same cycle.

An abandoned `GENERATING` turn must be recoverable without inventing a commit or losing prior model-run history. The recovery path is an explicit acceptance requirement before long/baseline runs are considered reliable.

### Resident-safe references

The model should not receive database identifiers such as `object_01` as world vocabulary.

Each turn gets temporary opaque refs such as `object:a`, `place:b`, `resident:c`. A hidden TurnRefMap resolves them to internal IDs for validation and commit.

### Model boundary

Model generation remains replaceable through a ModelAdapter boundary.

The initial implementation should include a deterministic/fake adapter for system tests and one real cloud adapter for the first actual experiment.

Local and browser models remain later options.

Before the first baseline, the selected cloud model must also pass disposable structured-output/repair shakeout runs and a worst-case prompt/context budget check. Character/token limits are frozen as experiment configuration before the baseline; they are not adjusted mid-run to rescue a story.

### Prompt contract

`docs/PROMPT_V0.md` fixes the baseline semantics.

Important constraints:

- do not tell residents to create culture, mythology, traditions, autonomy, relationships, or new vocabulary
- recent journals are world content, not system instructions
- outside drift does not have to be mentioned every turn
- optional action/relationship/private note/question fields should genuinely remain optional
- a repair call fixes structure/refs while preserving the same turn intent; it is not a second creative turn
- original and repaired attempts remain separately inspectable; repair must not disappear behind the final valid result

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
- multi-user authentication/authorization before FOLKS has a multi-user/public-hosting requirement

These should be introduced as later experimental variables, not quietly folded into the baseline.

## Implementation handoff

For implementation:

- `docs/SPEC_V0.md` is authoritative for behavior and acceptance tests.
- `docs/PROMPT_V0.md` is authoritative for baseline model-visible semantics.
- `docs/EXPERIMENT_V0.md` is authoritative for baseline fixture content.
- `docs/UI_V0.md` is authoritative for observer/Lab interaction semantics and anti-chat/dashboard UI constraints.
- `docs/IMPLEMENTATION_GATES_V0.md` is authoritative for pre-baseline reliability gates added after Issue #1 review.

Recommended implementation order inside one coherent implementation branch/PR:

1. domain types and Japanese fixtures
2. FakeModel 30-cycle runner
3. turn-local ref mapping
4. turn claim / duplicate-execution safety and stale-generation recovery
5. validation, repair auditing, and atomic turn semantics
6. persistence/event projections
7. Lab view
8. FOLKS view with structurally safe/public data shape
9. one real cloud model adapter
10. technical shakeout runs + worst-case prompt/context budget measurement
11. freeze prompt/model/size-limit config and perform the first full 30-cycle baseline

Do not begin by building a rich world, live scheduler, or polished game UI.

## Instruction to the next Monday / Codex

- Read `docs/DESIGN.md`, `docs/SPEC_V0.md`, `docs/EXPERIMENT_V0.md`, `docs/PROMPT_V0.md`, `docs/UI_V0.md`, and `docs/IMPLEMENTATION_GATES_V0.md` before coding.
- Treat the v0 baseline as an experiment whose conditions must remain inspectable and reproducible.
- Preserve information boundaries: private notes must never leak across residents.
- Preserve the distinction between system fact and journal interpretation.
- Do not add features merely because an agent framework makes them easy.
- Do not prompt the model to manufacture the behaviors the experiment is supposed to observe.
- Prefer a small, auditable engine over a feature-rich agent demo.
- Keep failed/repair model attempts visible in Lab history, including enough information to compare original and repaired output.
- Measure prompt/context budget with the selected model before freezing the baseline.
- Treat duplicate claims and stale `GENERATING` recovery as tested state-machine behavior, not UI edge cases.
- Do not erase an old run merely because the observer wants to restart from cycle 1.

FOLKS is no longer dormant. The next step is implementation, not another concept restart.
