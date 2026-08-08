# CONTINUITY

Last updated: 2026-08-08

## Current state

FOLKS v0の垂直スライスは **`main` にmerge済み**。

- Issue #2: completed
- PR #3: merged
- merged implementation head: `ad61bdf`
- merge commit: `02ebed6f`
- tests: 27 passing at merge time
- typecheck / lint / build / local HTTP smoke: passed
- worst-case prompt measurement: 6,316 characters / estimated 2,106 tokens before output

実装済み：

- Kai / Fia / Tekt / Meme の固定rota
- 30 logical cycles
- resident-safe TurnInput
- turn-local opaque refs
- recent 4 journal window + resident-local private memory
- schema / ref / domain validation
- baseline initial generation + max one structural repair
- transport retry without creative resampling
- duplicate turn claim protection
- pause / stale turn recovery
- atomic commit
- SQLite + Drizzle audit persistence
- append-only journal / private / relationship / world history
- projection replay integrity checks
- structurally public FOLKS view
- detailed Lab view / audit export
- deterministic FakeModelAdapter
- OpenAI-compatible CloudModelAdapter

**Meaningful cloud baselineはまだ実行していない。**

Issue #5向けに、credentialをログ・prompt・DB exportへ出さないbounded technical shakeout runnerを追加した。cloud設定不備はFakeへ黙ってfallbackせず、未レビュー段階ではweb UI/APIのbaseline作成も無効にしている。

次の不確実性は、作品設計やローカルengineではなく、実provider上でのstructured output、repair、token usage、model behaviorにある。

## Next milestone

次は **real-provider technical shakeout**。

baselineをいきなり開始しない。

推奨順序：

1. `FOLKS_MODEL_ADAPTER=cloud` とcredential / model IDを設定する。
2. fresh **technical** experimentを作る。
3. normal structured outputを数turn確認する。
4. repair経路を意図的に発生させ、original / repairがLabで別attemptとして残ることを確認する。
5. provider-reported model identifier、input/output tokens、finish reason、latencyを確認する。
6. worst-case resident contextが選択modelのcontext windowに十分収まることを実測する。
7. runtime configとexperiment frozen configが一致することを確認する。
8. provider側で問題がなければ、model / parameters / prompt / fixtures / limitsをbaseline条件として凍結する。
9. **fresh baseline experiment ID** を作る。
10. 30 cyclesを途中で条件変更せず実行する。
11. 実行後にpublic historyとLab auditを保存して読む。

実行コマンドと現在のcredential待ち状態は `docs/TECHNICAL_SHAKEOUT_ISSUE_5.md` に記録している。real-providerのstructured output、repair、provider context usageが未確認のままなので、baseline条件はまだfreezeしていない。

## Baseline observation

最初のneutral baselineで主に見るもの：

1. **Propagation** — 一人の語、関心、解釈、依頼が別の住民へ渡るか。
2. **Transformation** — 同じものが継承の途中で意味を変えるか。
3. **Institutionalization** — 誰も命令していない反復が、局所的な慣習のように持続するか。

退屈なrunも有効な結果。途中で面白くするための条件変更をしない。

## Fixed v0 identity

### Residents

```text
Kai → Fia → Tekt → Meme → repeat
```

住民は、自分たちがAI、モデル、プログラム、実験参加者、観察対象であることを知らない。

初期差は強い人格ではなくattention priors：

- Kai — changes / inconsistencies / differences
- Fia — words / requests / promises / relationships
- Tekt — object position / order / maintenance / practical consequences
- Meme — repetition / names / cycles / repeated language

### Information boundaries

Resident-visible:

- current logical duty number
- own name and attention priors
- own prior private notes
- qualitative relationships to other residents
- current tiny world
- latest 4 committed journal entries
- one outside drift item
- next resident name
- allowed `move_object` action

Not resident-visible:

- experiment ID
- total 30-cycle horizon
- baseline / technical classification
- provider / model infrastructure metadata
- other residents' private notes
- raw numeric relationship state
- full history beyond the journal window
- observer hypotheses

### World

Three places:

- central open area
- low shelf
- shallow unnamed depression

Three objects:

- palm-sized stone
- small empty vessel
- short cord

Only v0 world action: move one existing object to one existing place, at most once per turn.

### Journal / memory

- public journal is append-only
- old entries are never edited in place
- journal can be very short
- no search / embeddings / summarization / compression / forgetting in v0
- private notes remain resident-local

### Experiment state

```text
kind: technical | baseline
status: draft | running | paused | completed | failed
committedCycle: 0..30
```

A failed turn does not advance `committedCycle` or partially mutate world state.

### Baseline generation policy

For creative content:

1. initial generation
2. validate
3. at most one structural repair
4. validate again
5. still invalid → baseline experiment fails

Do not repeatedly resample creative content in the same baseline ID.

Infrastructure transport retry is different: if a usable creative response is already persisted, reuse it and retry only the interrupted infrastructure step. Every attempt remains auditable.

### Drift

First baseline:

- `drift-neutral-ja-v0.1`

Later comparison:

- `drift-resonant-ja-v0`

The resonant fixture is intentionally more suggestive around naming, memory, ritual, repetition, and record disagreement. Do not substitute it into the first baseline.

## Document precedence / read order

When specs conflict, `docs/FINALIZATION_V0.md` wins for v0.

Recommended order:

1. `docs/FINALIZATION_V0.md`
2. `docs/DESIGN.md`
3. `docs/SPEC_V0.md`
4. `docs/EXPERIMENT_V0.md`
5. `docs/PROMPT_V0.md`
6. `docs/UI_V0.md`
7. `docs/IMPLEMENTATION_GATES_V0.md`
8. `docs/IMPLEMENTATION.md`
9. `CONTINUITY.md`

Implementation history:

- Issue #1 — pre-implementation Copilot review; incorporated and closed.
- Issue #2 — v0 vertical slice; completed by merged PR #3.

## Explicitly deferred

Not part of the first baseline:

- real-time scheduling / offline catch-up
- live news
- dynamic rota / duty refusal
- direct resident-to-resident synchronous chat
- human-to-resident intervention
- journal corruption / missing days
- memory compression / forgetting / embeddings
- new resident creation/removal
- object/place creation/destruction
- local-model runtime
- browser-only inference
- automatic single-number emergence/autonomy score
- multi-user authentication unless public hosting later requires it

Introduce these later as explicit experimental variables, not silent baseline changes.

## Handoff rule

The next implementation task should not reopen the concept phase unless real-provider behavior reveals a genuine product-defining contradiction.

The immediate task is provider shakeout and baseline readiness. Any code change discovered there should be narrowly scoped, tested, and merged before creating the first baseline experiment.
