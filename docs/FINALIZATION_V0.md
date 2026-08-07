# FOLKS — v0 Finalization

Last updated: 2026-08-08

Status: **final pre-implementation corrections and supersessions for v0**.

This document records the final whole-repository review before implementation handoff.

Read it **before** `DESIGN.md`, `SPEC_V0.md`, `EXPERIMENT_V0.md`, `PROMPT_V0.md`, `UI_V0.md`, and `IMPLEMENTATION_GATES_V0.md`.

Where this document conflicts with an older v0 document, **this document wins**. Otherwise, the older documents remain authoritative in their existing areas.

The purpose of these corrections is not to change the artistic premise. They remove accidental experimental priming, resident-visible infrastructure leakage, retry selection bias, and a few implementation-state ambiguities.

---

## 1. Final baseline invariant

The v0 baseline remains:

- Kai / Fia / Tekt / Meme
- Japanese resident-facing language
- fixed rota
- 30 logical cycles
- one active resident per cycle
- latest 4 committed shared-journal entries
- same-resident private notes only
- tiny fixed world
- zero or one relationship change per turn
- zero or one `move_object` world action per turn
- one outside drift item per turn
- no human-to-resident conversation
- no live news
- no real-time scheduling

Residents do not know they are AI, models, agents, programs, experiment participants, or observed subjects.

The observer knows the experiment is 30 cycles long. **The residents do not.**

---

## 2. Neutral drift replaces the old baseline drift fixture

The original 30 drift items in `EXPERIMENT_V0.md` are evocative and useful, but many directly invoke the exact phenomena the baseline hopes to observe: naming, repeated customs, inherited words, conflicting records, forgotten origins, symbolic placement, and persistence after origin loss.

That creates an avoidable confound:

> Did a pattern arise from journal inheritance, or was the same conceptual pattern repeatedly primed by outside drift?

Therefore:

- the old drift sequence is reclassified as **`drift-resonant-ja-v0`**, a later comparison/stress fixture;
- it is **not** the first baseline fixture;
- the first baseline uses **`drift-neutral-ja-v0.1`** below.

The neutral fixture is intentionally mundane. It still gives the world a small external disturbance each turn, but it avoids explicit references to naming, traditions, rituals, records, memory, disputed history, inherited language, symbolic customs, or origin stories.

### `drift-neutral-ja-v0.1`

#### Cycle 1
> 遠い谷で、朝の気温が前日より少し下がった。

#### Cycle 2
> 海辺の町で、市場の屋根が雨のあと修理された。

#### Cycle 3
> 山の斜面で、黄色い花が多く咲いた。

#### Cycle 4
> 遠い川の水位が、先月より少し高くなった。

#### Cycle 5
> 果樹園で、梨の収穫がいつもより早く始まった。

#### Cycle 6
> 遠い港で、一艘の船の帆が新しい布に替えられた。

#### Cycle 7
> 丘の道が、倒木のため半日だけ通れなくなった。

#### Cycle 8
> ある町のパン屋で、小麦粉の到着が遅れた。

#### Cycle 9
> 山頂の雲が、昼まで消えなかった。

#### Cycle 10
> 沿岸の海水温が、普段より少し高かった。

#### Cycle 11
> 町の噴水が午後だけ止まり、夕方にまた動いた。

#### Cycle 12
> 粘土を掘る場所で、色の薄い土の層が見つかった。

#### Cycle 13
> 朝の霧のため、遠い町の列車が十分ほど遅れた。

#### Cycle 14
> 強い風で、畑の柵の一部が傾いた。

#### Cycle 15
> 湖の水位が下がり、岸辺の砂地が広く現れた。

#### Cycle 16
> ある工房で、割れた窓ガラスが交換された。

#### Cycle 17
> 山羊の群れが、暑さを避けて高い牧草地へ移された。

#### Cycle 18
> 海辺の建物の外壁が、白く塗り直された。

#### Cycle 19
> 夜の雨で、小川の流れが速くなった。

#### Cycle 20
> ある店で、冬用の布が今年初めて並べられた。

#### Cycle 21
> 小さな橋の床板が、一枚交換された。

#### Cycle 22
> 古い壁の隙間に、蜂が巣を作った。

#### Cycle 23
> 山の北側だけに、雪が少し残っていた。

#### Cycle 24
> 漁から戻った船の帆が、一部破れていた。

#### Cycle 25
> 雨のあと、遠い集落の井戸の水がいつもより冷たかった。

#### Cycle 26
> 遠い農場で、豆の収穫が終わった。

#### Cycle 27
> 風車が、修理のため二日間止まった。

#### Cycle 28
> 池の浅い場所で、蛙が多く見つかった。

#### Cycle 29
> 荷車の車輪が壊れ、道がしばらく塞がれた。

#### Cycle 30
> 乾いた空気のため、夕焼けが濃く見えた。

The implementation should store this as the baseline machine-readable drift fixture.

Do not delete the original resonant list from the repository. It remains useful for a later controlled comparison:

```text
neutral drift vs resonant drift
```

That comparison can directly test how strongly external conceptual priming affects apparent social emergence.

---

## 3. Resident-visible TurnInput must not expose experiment infrastructure

The current `SPEC_V0.md` example includes an `experiment` block containing `id`, `totalCycles`, and `language`. These are useful audit/config fields, but they must **not** be part of the model-visible resident context.

In particular, residents must not receive:

- experiment ID
- total experiment length (`30`)
- baseline/technical experiment kind
- provider/model identifiers
- prompt version
- fixture version strings
- language/config metadata as world facts

The resident may know the current world-internal duty number/cycle because journal entries are ordered and cycle-labelled.

### Final model-visible shape

Conceptually:

```ts
type TurnInput = {
  cycle: number;

  resident: {
    ref: ResidentRef;
    name: string;
    attentionBiases: string[];
    privateNotes: Array<{
      cycle: number;
      text: string;
    }>;
    relationships: Array<{
      residentRef: ResidentRef;
      residentName: string;
      state: string;
    }>;
  };

  nextResident: {
    ref: ResidentRef;
    name: string;
  };

  world: {
    places: Array<{
      ref: ResidentPlaceRef;
      description: string;
    }>;
    objects: Array<{
      ref: ResidentObjectRef;
      description: string;
      locationRef: ResidentPlaceRef;
    }>;
    weather: string;
  };

  recentJournal: Array<{
    cycle: number;
    authorName: string;
    publicText: string;
    questionForNext: string | null;
  }>;

  drift: {
    text: string;
  };

  allowedActions: ["move_object"];
};
```

`experimentId`, language, model metadata, fixture versions, and total cycles belong to the persisted `turn` / `experiment` audit records around this input, not inside resident-visible content.

### Prompt correction

Where `PROMPT_V0.md` currently sketches:

```text
cycle: {{cycle}} / 30
```

implement instead:

```text
日直番号: {{cycle}}
```

Do not tell a resident that cycle 30 is the end.

---

## 4. Journal length must not force narrative invention

The previous suggested `journalText` range of roughly 80–500 Japanese characters risks forcing a resident to elaborate when it has little to report.

That works against selective attention and can manufacture significance.

Final v0 hard limits:

```text
journalText      = 1–500 Japanese characters, non-whitespace
privateNote      = null or 1–240 Japanese characters
relationship reason = 1–160 Japanese characters when a change exists
questionForNext  = null or 1–160 Japanese characters
```

There is **no minimum narrative richness**.

A short entry such as 「今日は特に変わりなし。」 is a valid experimental outcome.

The prompt may encourage concise, selective writing, but must not require an essay-like minimum length.

---

## 5. Experiment kind and state semantics

The implementation must distinguish disposable technical shakeout runs from meaningful baseline runs.

Final conceptual record:

```ts
type ExperimentKind = "technical" | "baseline";

type ExperimentStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed"
  | "failed";

type Experiment = {
  id: string;
  name: string;
  kind: ExperimentKind;
  status: ExperimentStatus;
  committedCycle: number; // 0..30, last successfully committed cycle
  totalCycles: 30;
  journalWindow: 4;
  language: "ja";
  promptVersion: string;
  driftFixtureVersion: string;
  weatherFixtureVersion: string;
  initialStateVersion: string;
  modelAdapter: string;
  modelIdentifier: string;
  modelParameters: Record<string, unknown>;
  randomSeed: string | null;
  createdAt: string;
  completedAt: string | null;
};
```

This supersedes the ambiguous `currentCycle` field in `SPEC_V0.md`.

`committedCycle = 0` means the initial world before Kai's first turn.

The next logical cycle is always:

```text
committedCycle + 1
```

until 30 commits.

`paused` is an observer/application state between committed turns. It is not a fictional resident-world event.

---

## 6. Baseline failure and retry policy

Technical experiments may be manually retried as often as needed for engineering diagnosis, with all attempts preserved.

A **baseline** experiment must not silently resample a creative turn until a convenient valid answer appears.

Final policy:

### Structured/domain failure

For a baseline turn:

1. initial model generation
2. validation
3. at most one automatic repair preserving the original intent
4. validation again
5. if still invalid, mark the turn and experiment `FAILED`
6. do **not** perform another creative regeneration in the same baseline experiment ID

This prevents selection bias from “keep drawing until the output works.”

To try again after such a failure, create a new experiment.

### Infrastructure/transport failure

A request that fails without yielding a usable model response may be retried according to a small, preconfigured infrastructure retry policy.

Requirements:

- retry policy is frozen before the baseline begins;
- provider/SDK retry behavior should be known where practical;
- each application-visible attempt is preserved in `model_runs`;
- transport recovery must not depend on whether the creative content was desirable.

### Stale `GENERATING` recovery

If an abandoned turn already has a persisted raw model response, resume validation/commit from that response; **do not regenerate merely because the process restarted**.

If no response was persisted, reclaiming the same logical cycle may make a fresh provider request as infrastructure recovery. Preserve the abandoned run record.

Recovery never advances the cycle by itself.

### UI consequence

For a failed baseline experiment, Lab may show the failure and offer to create a fresh experiment from the same frozen configuration.

A generic “retry until success” control is appropriate for technical runs, not for failed baseline content generations.

---

## 7. Restart / reset semantics

Any older wording such as “reset experiment” means:

> create a new experiment ID from the same frozen configuration and initial state.

Never rewind or erase an existing experiment in place.

The old experiment remains audit history.

---

## 8. Baseline vs resonant-drift comparison

The original resonant drift list should not be discarded. It becomes an especially useful early comparison after the neutral baseline is stable.

Suggested comparison:

```text
A. drift-neutral-ja-v0.1
B. drift-resonant-ja-v0
```

Keep all other configuration identical where possible.

Question:

> How much apparent naming, persistence, contradiction, ritualization, and transmission comes from the social inheritance mechanism itself, and how much is amplified by conceptually resonant outside material?

This is a stronger experiment than quietly using the resonant material as the only baseline.

---

## 9. Final pre-Codex readiness rules

Implementation may begin when the implementer accepts the following read order:

1. `docs/FINALIZATION_V0.md` — final corrections; wins on conflict
2. `docs/DESIGN.md` — artistic/system design
3. `docs/SPEC_V0.md` — core behavior and acceptance tests
4. `docs/EXPERIMENT_V0.md` — experiment rationale, weather, hypotheses; its original drift list is now resonant comparison data
5. `docs/PROMPT_V0.md` — model-visible semantics, subject to the horizon/length corrections above
6. `docs/UI_V0.md` — FOLKS/Lab interaction
7. `docs/IMPLEMENTATION_GATES_V0.md` — pre-baseline reliability gates
8. `docs/IMPLEMENTATION.md` — technical rationale and supporting detail
9. `CONTINUITY.md` — project state and handoff context

Implementation should happen on a dedicated branch and be reviewed through a PR.

Do not implement directly on `main` merely because the design documents were finalized there.

One coherent implementation PR is preferred over mechanical fragmentation, provided it remains testable and reviewable.

---

## Final judgment

After these corrections, there is no remaining conceptual blocker to implementing the FOLKS v0 vertical slice.

The remaining unknowns are intentionally empirical engineering choices:

- exact cloud model/provider for the first real baseline
- frozen generation parameters
- measured prompt/context budget
- exact SQLite/Drizzle wiring
- provider-specific structured-output syntax

Those belong in technical shakeout, not another concept-design round.