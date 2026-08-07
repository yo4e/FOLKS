# FOLKS — Open Questions

Last updated: 2026-08-07

This document now tracks questions that remain **after** the v0 baseline design was fixed.

Questions already resolved for v0 are recorded first so that future work does not reopen them accidentally.

For current implementation behavior, `SPEC_V0.md` is authoritative.

---

## Resolved for v0

### Residents

- Initial resident count: **4**
- Names: **Kai, Fia, Tekt, Meme**
- Rota: **Kai → Fia → Tekt → Meme → repeat**
- Resident differentiation: **attention priors only; no strong personality/backstory**
- Residents know they are AI: **no**
- Residents know the world-internal duty system: **yes**
- Residents know the experiment/observer/model infrastructure: **no**
- Initial relationships: **all neutral**

### Journal and memory

- Shared journal visibility: **latest 4 committed entries**
- Journal editing: **not allowed**
- Journal correction: **only through a later new entry**
- Journal full-history search: **not in v0**
- Private memory: **same resident's prior private notes only**
- Other residents' private memory: **never visible**
- Memory summarization / embeddings / forgetting: **not in v0**

### World

- Small world: **3 simple places + 3 simple objects**
- One place begins deliberately unnamed
- World physics: **code-controlled**
- Model meaning/interpretation: **free in prose**
- v0 world action: **move one existing object to one existing place**
- New construction / object creation: **not in v0**
- Weather: **fixed mild fixture sequence**

### Outside drift

- v0 source: **fixed 30-item fixture**
- live news: **not in v0**
- exactly one drift item per cycle

### Time and rota

- v0 time: **logical cycles only**
- total cycles: **30**
- rota: **fixed**
- real-time clock: **not in v0**
- offline catch-up: **not in v0**

### Human observer

- role in v0: **observer**
- direct conversation with residents: **not in v0**
- journal writing/intervention: **not in v0**
- residents know they are observed: **no**

### System architecture

- preserve model replaceability behind a ModelAdapter
- preserve TurnInput snapshots and raw model outputs
- separate system fact / public journal / private memory
- use append-only events for historical changes
- keep current state as a projection/convenience layer
- commit a turn atomically
- failed turns do not advance the cycle
- schema + domain validation outside ModelAdapter
- at most one repair attempt for invalid structured output

---

## Questions intentionally deferred until after baseline v0

These are not blockers for initial implementation.

### Identity and memory

- When should residents begin forgetting?
- Who/what performs long-term memory compression?
- Should memory summarization distortion be treated as a bug, a phenomenon, or both?
- What happens if two residents' private memories are swapped?
- If all residents are replaced but the journal remains, is it still the same society?
- If a new resident receives only the journal, how much communal identity survives?

### Journal perturbation experiments

- What happens when one duty entry is blank?
- What happens when a journal fragment is missing?
- Should residents ever see different subsets of the same journal history?
- What happens when two contradictory entries describe the same event?
- Should an old journal be rediscovered later as an object/archive rather than searchable memory?

### Rota perturbation experiments

- What happens if duty order changes unexpectedly?
- Can a resident refuse duty?
- Can the same resident appear twice in a row?
- Can a duty slot be missing?
- Can the rota itself become a resident-interpreted institution?

### Human intervention

- Can the observer send a message into the world?
- If so, is the message framed as a human message, an anonymous drift item, or a world event?
- Can the observer physically move an object?
- Do residents know a human actor exists?
- Can the observer write directly in the shared journal?
- Does observation itself become part of the world fiction?

### World growth

- Can residents create new objects?
- Can residents mark or modify existing objects?
- Can places receive persistent system-level names after social adoption?
- Can residents build structures?
- Is resource scarcity useful or does it turn FOLKS into a game?
- Can society emerge without competition or danger?

### Long-duration operation

- What real-time duration corresponds to one cycle?
- Should offline elapsed time replay every missed cycle or compress intervals?
- What happens after hundreds or thousands of cycles?
- How are database size and model context controlled without erasing meaningful distortion?
- Should a long-running society be pausable/forkable as a first-class operation?

### Model migration

- Which local model/runtime is suitable when local migration begins?
- Does changing the underlying model preserve resident identity?
- Should a model migration be visible to residents as a world event?
- Can different residents later use different model families without changing the experiment's meaning too much?
- Is browser-only inference valuable enough to justify the constraints?

---

## Questions to answer during the first real v0 implementation

These are implementation details that should be decided empirically without changing the experiment's conceptual character.

### Prompt language

- Should the baseline residents think/write in Japanese or English?
- Does one language create materially different journal compression or naming behavior?

Initial implementation may choose one language, but the choice must be stored as part of prompt/config versioning.

### Text limits

- Are the suggested journal/private-note limits large enough to allow nuance but small enough to prevent each turn becoming an essay?
- Does the model naturally obey them with structured output?

### Relationship change frequency

- Should the model be allowed to emit several ±1 relationship changes in a single turn, or should v0 restrict the turn to one relationship target total?

Current spec permits multiple targets, each with at most ±1. If real runs make relationship values noisy, tighten this in a new prompt/spec version rather than silently changing a run.

### Weather visibility

- Is mild weather useful as a small source of changing observation, or is it needless noise?

Keep it for the baseline fixture first. Remove only in a comparison experiment.

### Resident-safe action references

- What is the cleanest way to give the model stable structured references to objects/places without exposing implementation IDs as world vocabulary?

Current design suggests turn-local opaque refs.

### Model output repair

- Is one repair attempt enough for the selected model/provider?
- Does the repair prompt materially change creative content, and should repair runs be excluded from some observations?

All repairs must remain visible in Lab history.

---

## Observation questions

These remain intentionally interpretive.

### Propagation

- Did a resident-created word, concern, question, or practice cross to another resident?
- Was the transfer explicit through a journal instruction, or indirect through imitation?

### Transformation

- Did a shared concept change meaning over several handoffs?
- Did a misunderstanding survive after its factual basis disappeared?

### Institutionalization

- Did something become a norm without being encoded as a system rule?
- Did residents maintain it for absent/future residents?
- Did a practice persist after the person who started it stopped mentioning it?

### Identity

- After 30 cycles, do Kai, Fia, Tekt, and Meme feel distinguishable for reasons not reducible to their initial attention priors?
- Are those differences legible in private notes, public journals, relationships, or all three?

### Journal agency

- Do residents increasingly orient toward what the journal expects rather than toward direct world observation?
- Does the journal begin to constrain the society more strongly than any resident does?

This remains the deepest long-term FOLKS question:

> Are the residents continuing the journal, or is the journal using residents to continue itself?

---

## Anti-drift questions for future design reviews

Before adding a feature, ask:

1. Does this feature make inheritance and continuity easier to observe?
2. Does it create an entirely different source of entertainment that may hide the core experiment?
3. Is the behavior being observed, or has it been instructed into existence?
4. Does it leak information that residents should not have?
5. Can the experiment still explain what changed and why?
6. Can the feature be introduced as a controlled variable rather than a permanent complication?

If the answer is unclear, prefer leaving the feature out of the baseline.
