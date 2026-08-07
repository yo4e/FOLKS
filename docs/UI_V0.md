# FOLKS — UI v0

Last updated: 2026-08-07

This document defines the first interface behavior and aesthetic boundaries.

It does not prescribe pixel-perfect visual design. It exists to prevent the implementation from drifting into a generic AI chat/dashboard product.

---

## UI principle

FOLKS has two intentionally different surfaces:

```text
FOLKS view = 作品として社会を読む
Lab view   = 実験と実装を検証する
```

Do not force both surfaces into the same visual language.

The observer may know more than the residents do.

That asymmetry is intentional.

---

## What the interface is not

The primary FOLKS view should not resemble:

- a four-person group chat
- Discord/Slack
- an agent execution console
- a KPI dashboard
- a game HUD full of meters
- a Tamagotchi-like needs system
- a social network feed with avatars and reactions

The residents are not waiting for the user to message them.

The primary action is closer to **watching time pass and reading what remains**.

---

## Information asymmetry

Residents can read only the latest 4 committed journal entries plus their own private notes.

The human observer may read the full public journal history of the experiment.

Therefore:

- FOLKS view may show the complete public timeline to the human
- the UI must never imply that a resident can also search/read that entire timeline
- Lab must make each resident's actual TurnInput inspectable
- private notes remain hidden from the public FOLKS surface

The human observer's ability to see more history is an observational privilege, not a world fact.

---

## Suggested routes / screens

Exact routing syntax may vary, but conceptually:

```text
/                     experiment entry / latest experiment
/experiments          experiment list
/experiments/:id      FOLKS view
/lab/:id              Lab view
/lab/:id/turn/:cycle  detailed turn inspection
```

A very small implementation may merge some routes, but the FOLKS/Lab separation should remain obvious.

---

## Experiment list

Minimum information:

- experiment name
- baseline / technical label
- status
- committed cycle, e.g. `12 / 30`
- resident-facing language
- created time
- model identifier in Lab-oriented metadata, not as the visual headline

Actions:

- open
- duplicate configuration into a new experiment
- create baseline experiment
- optionally export JSON

Do not implement in-place reset that destroys prior history.

### Reset semantics

When the UI says something like "最初からやり直す", it should create a **new experiment ID** with the same frozen configuration and initial state.

The old run remains intact unless an explicit destructive delete feature is added later.

This preserves experimental history and avoids accidental rewriting of the past.

---

## Baseline creation

The ordinary observer should not need to configure every internal field.

Provide a baseline preset equivalent to:

```text
Residents: Kai / Fia / Tekt / Meme
Language: Japanese
Cycles: 30
Journal window: 4
Drift fixture: baseline v0
Weather fixture: baseline v0
Relationship change: max 1 target / turn
World action: move_object only
Prompt: frozen baseline prompt version
```

The model adapter/model may require a technical selection before starting if more than one configured option exists.

That choice belongs in Lab/config UI.

Once a baseline experiment has started, its model-visible configuration is read-only.

---

## FOLKS view composition

The main screen should prioritize three things:

1. who most recently held duty / who is about to hold duty
2. the current tiny world
3. the inherited journal

A possible desktop composition:

```text
┌───────────────────────────────────────────────────────┐
│ FOLKS                          cycle 12 / 30          │
│                                   次の日直: Kai       │
├───────────────────┬───────────────────────────────────┤
│                   │                                   │
│   small world     │          shared journal           │
│                   │                                   │
│   shelf           │   cycle 12 · Meme                 │
│   vessel / cord   │   ...                             │
│                   │                                   │
│   open space      │   cycle 11 · Tekt                 │
│   stone           │   ...                             │
│                   │                                   │
│   unnamed hollow  │                                   │
│                   │                                   │
├───────────────────┴───────────────────────────────────┤
│ 漂着物 / latest trace                                │
├───────────────────────────────────────────────────────┤
│ [一回進める]  [続ける]                 [Labを見る]   │
└───────────────────────────────────────────────────────┘
```

This is a hierarchy sketch, not a styling mandate.

Mobile may stack world → journal → controls.

---

## Resident presentation

Avoid over-designed character portraits in v0.

The initial resident identity should come primarily from:

- name
- accumulated writing
- history
- subtle visual marker if useful

Possible lightweight representation:

```text
Kai
Fia
Tekt
Meme
```

with a small glyph, mark, lamp, or typographic distinction.

Do not visually encode their attention priors as obvious permanent archetypes such as fire/water/earth/air roles.

The names have suggestive roots, but the UI should not turn them into fixed classes.

---

## Duty state

In the FOLKS view, avoid technical wording such as:

```text
LLM generating...
agent executing...
API request pending...
```

Prefer world-compatible observer language such as:

```text
Kaiの日直
Kaiが日誌を残している
```

or a subtle activity indicator.

Lab may show the exact technical status:

```text
GENERATING
attempt 1
provider latency
```

The FOLKS surface does not need to pretend the model call is literally real-time consciousness; it simply avoids making infrastructure the aesthetic foreground.

---

## World view

The world is deliberately tiny and should remain legible without becoming a game map.

Required facts to convey:

- three locations
- current object positions
- current mild weather

The shallow depression initially has no established social name.

The FOLKS UI should not assign a catchy label to it that residents never invented.

A neutral observer label such as "名前のない窪み" is acceptable before any social naming appears, because that is part of the initial world description.

If residents invent a name, do **not** automatically rename the system UI as though the name became canonical fact.

A later UI may display journal-derived aliases separately, e.g.:

```text
住民の日誌では「受け口」と呼ばれることがある
```

but v0 does not require automatic alias extraction.

---

## Object movement

After a committed `move_object` event, the world view should reflect the new location.

A small transition/animation is allowed but not required.

Do not imply a move before the turn commits.

If generation or validation fails, the world remains visually unchanged.

---

## Journal view

The shared journal is the emotional center of the project.

Journal entries should read as entries, not chat bubbles.

Each entry should expose at least:

- cycle
- author
- public text
- optional question for next resident

The observer may scroll the full journal history.

A subtle marker may indicate which four entries were actually visible to a selected later turn, but that belongs more naturally in Lab or an optional inspection mode.

Do not show private notes here.

---

## Question for next

`questionForNext` is part of the public handoff.

It may be displayed beneath the journal entry as a smaller continuation, for example:

```text
次へ：棚の器が動いていないか見てほしい。
```

Do not render it as a direct-message bubble.

It remains part of the shared journal inheritance.

---

## Outside drift presentation

A drift item is something that has reached the active resident from far away.

It should not visually dominate the world.

Possible metaphor:

- a slip of paper
- a small clipping
- a received fragment
- a line in the margin

Avoid a news-feed design with headlines, thumbnails, urgency scores, or source-brand decoration in the baseline.

The resident is allowed to ignore the drift item, so the UI should not frame it as the mandatory topic of the cycle.

---

## Run controls

### One cycle

`一回進める`

Runs exactly the next logical duty turn.

Disable/reject duplicate execution while that turn is already claimed/generating.

### Continue

`続ける`

Sequentially runs turns until:

- cycle 30 commits
- a turn fails and requires intervention
- the observer requests stop

Stop should take effect **between committed turns** where practical.

Do not launch multiple resident turns concurrently.

The rota is sequential by design.

### Stop

If a model call is already in flight, v0 may let that turn finish and stop before the next turn rather than implementing provider-specific cancellation.

The UI should clearly distinguish:

```text
停止予約: この日直が終わったら止まります
```

from an already stopped experiment.

---

## Failure state in FOLKS view

A technical failure should not be fictionalized into a resident failure or death.

Do not write an artificial journal entry saying the resident "could not wake up" unless that is later introduced as a deliberate experiment mechanic.

Instead show a restrained observer-level error:

```text
この日直はまだ確定していません。
```

with a way to open Lab/retry.

The world and journal remain at the last committed cycle.

---

## Lab overview

Lab exists to answer:

> What exactly happened, what did the model receive, and what was committed?

Suggested sections/tabs:

```text
Overview
Turns
Journal
Private memory
Relationships
World events
Config
```

The exact navigation may differ.

---

## Lab — experiment config

Show read-only frozen baseline data after start:

- resident definitions
- language
- initial world version
- rota
- journal window
- drift fixture version
- weather fixture version
- prompt version
- model adapter
- model identifier
- model generation parameters
- relationship/action limits
- random seed if supported

Clearly mark technical/shakeout experiments vs baseline experiments.

---

## Lab — turn inspector

A selected turn should expose, in order:

1. logical cycle and resident
2. turn status / retry history
3. exact TurnInput snapshot
4. exact TurnRefMap snapshot
5. raw model attempt(s)
6. validation errors
7. repair attempt if any
8. validated TurnOutput
9. committed journal entry
10. private note if any
11. relationship event if any
12. world event if any

This is the strongest audit surface in the application.

---

## Lab — private memory

Allow the observer to inspect each resident's private-note timeline.

Make the boundary visually explicit:

```text
Kaiだけが読める
```

This helps prevent the human observer from unconsciously treating private notes as communal knowledge when interpreting later journals.

A useful future feature is a "what Kai knew on cycle 17" reconstructed view, but v0 only needs the underlying snapshots to make that possible.

---

## Lab — relationships

The Lab may show raw directional numeric values because it is an analytical surface.

Prefer a small matrix or event list over gamified hearts.

Example:

```text
Kai → Fia  +1
Fia → Kai   0
```

Always make direction visible.

The FOLKS view should not foreground these numbers.

---

## Lab — world events

Show machine facts separately from journal claims.

Example:

```text
cycle 12
Tekt moved object_01
place_01 → place_03
```

This is intentionally more literal than the journal.

A future comparison UI may place:

```text
machine event | journal interpretation
```

side by side, but that is not required for initial completion.

---

## Export

A JSON export of one complete experiment is recommended for v0 if inexpensive to implement.

It should include:

- experiment config
- resident definitions
- committed turn snapshots
- model attempts / validation metadata
- journals
- private notes
- relationship events
- world events

It must exclude:

- API keys
- environment secrets
- unrelated server configuration

Export is useful because FOLKS is both a work and an experiment; runs should be portable for later analysis.

Import/replay from exported JSON may be deferred.

---

## Destructive actions

Avoid destructive controls in the primary surface.

For v0:

- duplicate instead of reset-in-place
- preserve completed/failed experimental history
- deleting an experiment is optional and may be omitted entirely

If delete is later added, it should be explicit and irreversible, not conflated with "start over".

---

## Accessibility / readability

Even with an atmospheric visual design:

- journal text must remain selectable and readable
- do not communicate resident identity by color alone
- world object positions need textual equivalents
- generation/failure states need text, not animation only
- keyboard-accessible controls are preferred
- long journal history should not require tiny typography

The experiment depends on reading subtle language changes. Legibility outranks decorative atmosphere.

---

## Aesthetic direction

Useful adjectives:

```text
quiet
small
observational
slightly uncanny
warm but not cute-only
archival
lived-in
```

Less useful directions:

```text
cyberpunk AI control room
cheerful multi-agent productivity app
RPG party screen
social-media chat wall
```

A journal, a lamp, a shelf, a weather trace, and four names may be enough.

The interface should leave room for the observer to notice that something ordinary has slowly acquired meaning.
