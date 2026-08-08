# CONTINUITY

Last updated: 2026-08-09

## Pause / restart point

**FOLKS is intentionally paused here.**

The code-side preparation for a real-provider technical shakeout is complete, but the next step requires human setup and a small external API budget. Do not treat this pause as a blocker or failed milestone; it is a deliberate stopping point until there is enough time/budget to resume cleanly.

No meaningful cloud baseline has been run yet.

When resuming, choose one of two paths before doing any baseline run:

### Path A — continue with the current API-first reference run

Use the existing OpenAI-compatible cloud adapter as a **reference/control condition** for validating the FOLKS social mechanism.

1. Re-check current provider/model availability, pricing, and context limits.
2. Choose the exact provider/model deliberately; do not assume the previously discussed candidate is still the best choice.
3. Configure local environment only: `FOLKS_MODEL_ADAPTER=cloud`, credential, explicit `FOLKS_MODEL_ID`, and `FOLKS_MODEL_CONTEXT_WINDOW`.
4. Run `npm run shakeout:preflight`.
5. Run `npm run shakeout:cloud` using only disposable `technical` experiments.
6. Review structured output, repair, transport retry, provider token usage, model identifier, context margin, credential hygiene, resident-boundary checks, and frozen-config reload.
7. Only if those gates pass, freeze the exact baseline configuration and create a fresh baseline experiment.
8. Run the 30-cycle meaningful baseline once without changing conditions mid-run.

### Path B — reconsider the model before spending API/runtime budget

If the research goal should move closer to the original idea of **small AIs that genuinely learn/change through interaction**, pause before the provider shakeout and revisit the model choice and learning architecture.

The current v0 does **not** update model weights. A capable pretrained API model can convincingly perform social continuity without learning inside FOLKS, so such behavior must not be treated as evidence of model evolution.

Longer-term direction is recorded in `docs/MODEL_DIRECTION.md`: keep FOLKS as the world / memory / rota / audit harness, then connect a small local/self-made/deliberately limited model through the existing `ModelAdapter` boundary and design any actual learning/update mechanism explicitly.

**Restart rule:** before touching baseline settings, read `CONTINUITY.md`, `docs/MODEL_DIRECTION.md`, and Issue #5. Then decide Path A or Path B. Do not silently drift from one into the other.

## Current state

FOLKS v0の垂直スライスとIssue #5向けtechnical shakeout infrastructureは **`main` にmerge済み**。

- Issue #2: completed
- PR #3: merged — v0 vertical slice
- PR #6: merged — bounded real-provider technical shakeout tooling
- current main merge commit after PR #6: `b8de969f`
- tests: 34 passing at PR #6 review time
- typecheck / lint / build: passed
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
- bounded technical shakeout runner
- baseline-creation gate pending technical review
- credential redaction / no-silent-cloud-fallback checks

**Meaningful cloud baselineはまだ実行していない。**

Issue #5は、実provider上でのstructured output、repair、token usage、model behaviorを確認するためにopenのまま残す。

## Next milestone

再開時のデフォルト開始点は、上の **Path A / Path B をまず選ぶこと**。

Path Aを選んだ場合の次作業は **real-provider technical shakeout**。baselineをいきなり開始しない。

推奨順序：

1. provider / model / budgetを再確認する。
2. `FOLKS_MODEL_ADAPTER=cloud` とcredential / model ID / context windowをローカル設定する。
3. `npm run shakeout:preflight` を通す。
4. fresh **technical** experimentで `npm run shakeout:cloud` を実行する。
5. normal structured outputを数turn確認する。
6. repair経路を意図的に発生させ、original / repairがLabで別attemptとして残ることを確認する。
7. provider-reported model identifier、input/output tokens、finish reason、latencyを確認する。
8. worst-case resident contextが選択modelのcontext windowに十分収まることを実測する。
9. runtime configとexperiment frozen configが一致することを確認する。
10. provider側で問題がなければ、model / parameters / prompt / fixtures / limitsをbaseline条件として凍結する。
11. **fresh baseline experiment ID** を作る。
12. 30 cyclesを途中で条件変更せず実行する。
13. 実行後にpublic historyとLab auditを保存して読む。

実行コマンドは `docs/TECHNICAL_SHAKEOUT_ISSUE_5.md` に記録している。real-providerのstructured output、repair、provider context usageが未確認なので、baseline条件はまだfreezeしていない。

## Baseline observation

最初のneutral baselineで主に見るもの：

1. **Propagation** — 一人の語、関心、解釈、依頼が別の住民へ渡るか。
2. **Transformation** — 同じものが継承の途中で意味を変えるか。
3. **Institutionalization** — 誰も命令していない反復が、局所的な慣習のように持続するか。

退屈なrunも有効な結果。途中で面白くするための条件変更をしない。

なお、APIモデルを使うbaselineで観察できるのは主に**社会機構上の継承**であり、それ自体をmodel learning / evolutionの証拠とはみなさない。

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

Recommended order when resuming:

1. `CONTINUITY.md`
2. `docs/MODEL_DIRECTION.md`
3. `docs/FINALIZATION_V0.md`
4. `docs/DESIGN.md`
5. `docs/SPEC_V0.md`
6. `docs/EXPERIMENT_V0.md`
7. `docs/PROMPT_V0.md`
8. `docs/UI_V0.md`
9. `docs/IMPLEMENTATION_GATES_V0.md`
10. `docs/IMPLEMENTATION.md`
11. `docs/TECHNICAL_SHAKEOUT_ISSUE_5.md`

Implementation history:

- Issue #1 — pre-implementation Copilot review; incorporated and closed.
- Issue #2 — v0 vertical slice; completed by merged PR #3.
- Issue #5 — real-provider technical shakeout / baseline freeze; infrastructure merged in PR #6, actual provider run still pending.
- PR #7 — documents API-first reference/control role and future tiny-LLM direction.

## Explicitly deferred

Not part of the first API reference baseline:

- actual model-weight learning/update inside FOLKS
- self-made/tiny local LLM integration
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

This project is currently in an **intentional pause**.

On restart, do not begin by coding or running a baseline. First decide whether the next phase is:

- **A: API reference/control run**, continuing Issue #5; or
- **B: model/learning redesign**, moving closer to small AIs that genuinely change through interaction.

If A, keep code changes narrow and finish the technical shakeout before the first meaningful baseline. If B, preserve the existing FOLKS world/memory/rota/audit harness where useful and treat model learning as a separate explicit design problem rather than retrofitting it invisibly into v0.
