# Issue #5 — Technical shakeout record

Last updated: 2026-08-08

## Safety boundary

The shakeout runner in `scripts/technical-shakeout.ts` is deliberately bounded:

- it requires `FOLKS_MODEL_ADAPTER=cloud`, `OPENAI_API_KEY`, and an explicit `FOLKS_MODEL_ID`;
- it uses a fresh disposable SQLite database, or `FOLKS_SHAKEOUT_DATABASE_PATH` when explicitly supplied;
- it creates only `kind: technical` experiments;
- it never creates or runs a meaningful 30-cycle baseline;
- it prints provider metadata and gate results, never the credential or endpoint;
- `FOLKS_ALLOW_BASELINE=1` is required before the web UI/API can create a baseline.

The default context probe also requires `FOLKS_MODEL_CONTEXT_WINDOW` to pass the context gate. The runner reserves the configured `maxOutputTokens` and requires at least 512 additional tokens of headroom after comparing the local worst-case estimate with provider-reported input usage.

## Commands

```bash
npm run shakeout:preflight
npm run shakeout:cloud
```

Optional bounded controls:

```bash
npm run shakeout:cloud -- --turns=3 --no-context-probe
```

The cloud command runs several normal technical turns, injects one disposable invalid field into a real generation to exercise repair, forces one repair transport failure, retries that repair, and makes a separate worst-case context probe. It records only sanitized metadata in its JSON report. The database path is printed so the Lab can be inspected with the same local database setting if desired.

## Local preflight status

At the time of this handoff, the workspace had no `.env` or `.env.local`, and the shell did not expose `OPENAI_API_KEY`, `FOLKS_MODEL_ADAPTER`, `FOLKS_MODEL_ID`, or `FOLKS_MODEL_CONTEXT_WINDOW`. Therefore the real-provider shakeout is **blocked on local environment configuration**. No provider request was made and no baseline was created.

FakeModel tests remain technical acceptance tests only; they do not satisfy the real-provider gates.

## Baseline freeze record

This record is intentionally not frozen until the real-provider gates pass. The runner emits the following exact fields for review:

- provider / adapter;
- provider-returned model identifier;
- prompt version;
- temperature;
- maximum output tokens;
- response format;
- `drift-neutral-ja-v0.1`;
- weather fixture version;
- initial-state version;
- journal window;
- transport retry policy;
- code commit identity.

The first meaningful baseline must be created as a fresh experiment only after this record is complete and reviewed.
