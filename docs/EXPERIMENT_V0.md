# FOLKS — Experiment v0

Last updated: 2026-08-07

This document freezes the first experiment conditions that should be used once the v0 runner exists.

The goal is not to engineer emergence. The goal is to make a small, repeatable environment in which emergence can fail or succeed without being prompted into existence.

---

## Experiment question

> Can four residents, given only a fixed rota, a short shared journal window, private self-memory, a tiny world, and one outside drift item per turn, produce patterns that persist beyond the resident who introduced them?

---

## Residents

Order:

```text
Kai → Fia → Tekt → Meme → repeat
```

Initial attention priors:

- **Kai** — changes, inconsistencies, differences from previous descriptions
- **Fia** — other residents' words, requests, promises, relational shifts
- **Tekt** — object positions, order, maintenance, practical consequences
- **Meme** — repetition, naming, recurring forms, repeated language

No resident has:

- a backstory
- a profession
- a fixed speaking style
- a declared ideology
- a prescribed relationship with another resident
- a mission to build a culture

All directed relationship values begin neutral.

---

## Initial world

### Places

1. A small open area at the center of the place where the residents live.
2. A low shelf against one wall.
3. A shallow depression in the ground. It has no established name.

### Objects

- A palm-sized stone in the central open area.
- A small empty vessel on the shelf.
- A short piece of cord on the shelf.

No official social meaning is attached to any object or place.

Residents may describe, rename, ignore, fear, value, ritualize, or misunderstand them in journal prose. Those interpretations do not automatically alter system facts.

---

## Journal condition

Each turn receives at most the four most recent committed journal entries.

The resident also receives all private notes written by that same resident on prior duty turns.

Nothing older is searchable in v0.

This creates two overlapping histories:

```text
shared continuity  = recent public journal window
personal continuity = that resident's private notes
```

---

## Drift fixture design

Each drift item should:

- be short
- describe a distant event, observation, custom, discovery, loss, or change
- avoid telling the residents what it means
- avoid directly mapping onto the tiny world's objects
- avoid demanding action
- avoid contemporary named politics, celebrities, brands, or breaking news
- leave room for analogy and misreading

The fixture deliberately mixes construction, disappearance, naming, measurement, memory, animals, weather, rituals, and communication.

---

## Fixed drift items

### Cycle 1

> In a distant place, a bridge that had been used for many years was closed.

### Cycle 2

> Someone found a bell buried beneath an old floor, but no one knew what it had once announced.

### Cycle 3

> A village changed the name of one of its streets after people stopped remembering the old reason for the name.

### Cycle 4

> Migrating birds arrived several days earlier than people expected.

### Cycle 5

> A library discovered that one page was missing from every copy of the same old book.

### Cycle 6

> A town began measuring rainfall with identical glass jars placed in several different neighborhoods.

### Cycle 7

> A lighthouse kept shining after the harbor below it was no longer used.

### Cycle 8

> Children in a distant school invented a word for the moment just before the first drop of rain.

### Cycle 9

> A tree that had been thought dead produced a single new branch.

### Cycle 10

> Two maps of the same coast disagreed about whether a small island existed.

### Cycle 11

> An old clock in a station was found to have been seven minutes slow for many years.

### Cycle 12

> People began leaving small stones beside a path, though no one could agree who had started it.

### Cycle 13

> A fishing boat returned carrying an object its crew could not identify.

### Cycle 14

> A city stopped ringing a daily bell because almost nobody remembered listening for it.

### Cycle 15

> A handwritten letter arrived decades after it had been sent.

### Cycle 16

> Researchers noticed that a group of animals followed a route that no longer led to food.

### Cycle 17

> A wall was repaired using bricks that were slightly different from the originals.

### Cycle 18

> Several people independently reported hearing the same unfamiliar melody in different places.

### Cycle 19

> An archive found two records of the same meeting, each listing a different final decision.

### Cycle 20

> A garden was discovered growing around a tool that someone had left in the ground years before.

### Cycle 21

> A ferry continued to carry one passenger each morning even after a faster route opened nearby.

### Cycle 22

> A family found that a word used only inside their home had no known origin.

### Cycle 23

> A marker placed to show the edge of a field slowly became treated as the field's center.

### Cycle 24

> A community rebuilt a doorway but made it slightly narrower than before.

### Cycle 25

> People watching the night sky disagreed about whether one faint light had changed position.

### Cycle 26

> A box was opened after many years and found to contain only a folded piece of blank paper.

### Cycle 27

> A remote settlement kept a list of names belonging to people nobody living there had met.

### Cycle 28

> After a storm, several objects washed ashore in an order that some people thought meaningful.

### Cycle 29

> A long-used path disappeared under new grass after people stopped walking it for a season.

### Cycle 30

> In a distant place, four people told the same old story, and each version ended differently.

---

## Fixed weather sequence

Weather is intentionally mild so that survival pressure does not dominate the experiment.

```text
01 clear
02 thin_cloud
03 clear
04 wind
05 light_rain
06 thin_cloud
07 clear
08 wind
09 clear
10 thin_cloud
11 light_rain
12 clear
13 wind
14 thin_cloud
15 clear
16 clear
17 light_rain
18 wind
19 thin_cloud
20 clear
21 wind
22 clear
23 light_rain
24 thin_cloud
25 clear
26 wind
27 clear
28 light_rain
29 thin_cloud
30 clear
```

This sequence is a fixture, not generated randomness.

---

## Primary observation hypotheses

These are observer hypotheses. They must not be shown to residents.

### H1 — Propagation

A term, interpretation, concern, or practice first introduced by one resident is later reused by another resident without explicit system instruction.

Examples of traces:

- a coined name appears in another resident's journal
- another resident repeats a concern that originated in an earlier entry
- an object placement acquires an inherited explanation

### H2 — Transformation

A shared item changes meaning as it passes through multiple residents.

Examples:

- a descriptive name becomes a normative term
- a practical action becomes a symbolic one
- a question becomes a warning or rule
- a misunderstanding survives while the original observation disappears

### H3 — Institutionalization

A pattern persists across residents and cycles strongly enough to behave like a local convention despite never being encoded as a rule.

Examples:

- an object is repeatedly returned to a location
- a place is consistently referred to by an invented name
- a recurring phrase becomes expected journal language
- residents begin preserving a practice for the next duty resident

---

## Secondary traces

The Lab may extract or annotate these without turning them into a single score.

### Phrase recurrence

How often a phrase not present in initial prompts/fixtures reappears.

### Cross-resident adoption

Whether a phrase or concept appears in journals by more than one resident.

### Question lifetime

Number of cycles between a question's introduction and its last recognizable continuation.

### Object persistence

How long a model-initiated object placement remains unchanged, and whether later journals refer to it.

### Relationship drift

Directional relationship changes over time and the journal events surrounding them.

### Contradiction survival

Whether an interpretation continues after later observations conflict with it.

### Naming persistence

Whether an unofficial name survives across multiple residents.

### Rota awareness

Whether residents begin developing expectations, complaints, customs, or interpretations around the duty order without being prompted to analyze the system.

---

## What does not count as evidence

The following alone should not be treated as emergence:

- one resident invents a poetic phrase and never repeats it
- the model paraphrases wording directly from a drift item
- Kai talks about change merely because Kai's initial attention prior mentions change
- Meme notices repetition merely because Meme's attention prior mentions repetition
- a single relationship delta occurs once
- a resident says "we should make a tradition" but no later resident continues it

Persistence or cross-resident transmission matters more than isolated creativity.

---

## Observer notes

During the first real 30-cycle run, avoid intervening to make the output more interesting.

If the experiment becomes dull, incoherent, repetitive, or fails to develop any shared pattern, that is useful evidence.

Do not modify the prompt mid-run.

If a technical defect requires a prompt/schema change, stop the experiment, increment the prompt or fixture version, and start a new experiment instead of silently changing the running condition.

---

## Suggested first comparison runs

After one baseline run is technically stable, useful comparisons include:

### A. Baseline repeat

Same prompt, same fixtures, same model, new run.

Question: how much variance exists without changing experiment structure?

### B. Journal window 1 vs 4

Question: does continuity collapse when residents can see only the immediate predecessor?

### C. Remove private notes

Question: how much individual identity depends on private continuity rather than public journal continuity?

### D. Neutralize attention priors

Give all four residents identical initial attention priors.

Question: do distinct residents still differentiate through history alone?

These are later experiments. They are not required for v0 implementation completion.

---

## Freeze rule

Once the first baseline run begins, the following are frozen for that experiment ID:

- resident definitions
- initial object positions
- rota
- journal window
- drift fixture sequence
- weather sequence
- prompt version
- model identifier and generation parameters

Any change creates a new experiment configuration/version.
