# FOLKS — Model direction

Last updated: 2026-08-09

## Why this note exists

FOLKS v0 currently connects the resident loop to a pretrained model through a replaceable `ModelAdapter`. The first real run is planned against a cloud API because that is the fastest way to verify the world, journal, rota, validation, audit, and experiment machinery end to end.

That is an implementation path, not the final research claim.

The longer-term idea behind FOLKS is not merely to place capable pretrained assistants inside a small fictional society. It is to explore whether **small, limited AIs can affect one another over repeated interaction, learn from what other residents leave behind, and change over time in ways that are not already supplied by a highly capable model**.

## What v0 does and does not learn

In the current v0:

- the model weights do not change between cycles;
- residents do not fine-tune one another;
- continuity comes from public journals, private notes, relationships, world state, and the rota;
- any apparent development is therefore development in the **state and history presented to the model**, not training-time evolution of the model itself.

This makes v0 useful for testing the social mechanism, but it must not be described as evidence that the resident models themselves learned or evolved.

## API models are a reference condition

A capable cloud model can read a sparse history and produce behavior that looks coherent, social, reflective, or culturally continuous because it already contains broad linguistic and social priors.

That creates an important confound for FOLKS: a strong model may **perform the appearance of emergence** even when very little has actually been learned inside the experiment.

For that reason, the first API-backed baseline should be treated as a **reference/control condition for the FOLKS machinery**, not as the endpoint of the project and not by itself as proof of collective learning.

Questions the API baseline can answer include:

- Does the journal/rota architecture preserve continuity?
- Do interpretations propagate or transform under a fixed information boundary?
- Is the experiment reproducible and auditable?
- Are the prompts and world constraints weak enough not to force a story?

Questions it cannot answer by itself include:

- Did a resident model acquire a new capability through interaction?
- Did residents train or alter one another?
- Did intelligence increase because of the society rather than because the base model already knew how to imitate such behavior?

## Long-term direction: small self-made models

A later phase should connect FOLKS to one or more **small, locally runnable, self-trained or deliberately limited language models** through the same model boundary.

The exact learning mechanism is intentionally left open for a separate design effort. Candidate research directions may include resident-specific training, shared small base models with separate learned state, periodic fine-tuning, lightweight adapters, or other bounded update mechanisms.

The important constraint is conceptual rather than architectural:

> The residents should begin limited enough that meaningful changes in behavior can plausibly be attributed to what happened inside the experiment.

The interesting future question is then closer to:

> Can several small AIs teach, distort, reinforce, specialize, or otherwise change one another through the traces they leave behind?

That is distinct from asking whether a strong pretrained model can convincingly role-play a society.

## Why the current implementation is still useful

The existing FOLKS implementation should remain the experiment harness:

- world and physical constraints stay outside the model;
- journals and private memory remain explicit state;
- the rota remains the autonomy mechanism;
- audit history remains model-independent;
- fixtures remain comparable across model families;
- `ModelAdapter` remains the exchange point.

A future local/tiny-model adapter should therefore plug into the same experiment structure rather than require a rewrite of the world, journal, persistence, or UI layers.

This also enables controlled comparison across conditions such as:

```text
capable cloud model
        vs
small frozen local model
        vs
small model with bounded learning/update
```

using the same world, drift, journal window, rota, and observation criteria.

## Interpretation rule

When reading future FOLKS results, keep these layers separate:

```text
social continuity  = state/history carried through journals and world state
model capability   = what the base model can already do
model learning     = measurable change caused by an explicit training/update mechanism
```

A compelling narrative is not sufficient evidence of model learning.

The long-term project becomes more interesting when those three layers can be varied independently and compared.