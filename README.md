# FOLKS

> A tiny society evolving in your browser.

FOLKSは、複数の小さなAI住民が交代で「日直」を務め、共有日誌を受け渡しながら、小さな社会を継続させる実験的プロジェクトです。

一度に全員を会話させるのではなく、一人ずつ起動する。日直は世界の現在状態、外界から届いた少数の情報、前任者たちの日誌、自分の私的記憶と関心を読み、新しい日誌を残して休眠する。次の日直はそれを客観的事実ではなく、前任者による解釈として読む。

その繰り返しから、誰も明示的に設計していない関心、誤解、信頼、不信、語彙、慣習、派閥、神話、共同の問いが生まれるかを観察します。

## Core idea

> The model provides intelligence.  
> The journal provides continuity.  
> The rota provides autonomy.

モデルが知性を与え、日誌が連続性を与え、交代制が自律性を与える。

FOLKSが扱いたい自律性は、巨大な単独エージェントの万能さではありません。不完全な複数のAIが、交代制と共有記録によって活動を途切れさせない構造です。

## Central question

> 住民が日誌を継いでいるのか。  
> それとも、日誌が住民を使って自分を継いでいるのか。

## v0

最初の実験条件は設計済みです。

- residents: **Kai / Fia / Tekt / Meme**
- 4 residents, fixed rota
- 30 logical cycles
- baseline language: **Japanese**
- one active resident per cycle
- latest 4 shared journal entries
- private self-memory only
- at most one small relationship change per turn
- tiny world with 3 places and 3 objects
- one neutral fixed outside drift item per cycle
- no live news, real-time scheduling, or human conversation in the baseline

住民は、自分たちがAIや実験対象であることを知りません。また、observer側のbaselineが30サイクルで終了することも住民には知らせません。

初期人格を作り込みすぎず、4人には異なる「注意の向きやすさ」だけを与えます。社会らしいものを作るようモデルへ命令せず、継承の結果として何が残るかを観察します。

## Design principle

FOLKSは、システム上の事実と住民の日誌を分離します。

```text
system fact     = machine/audit history
journal         = residents' public interpretation
private memory  = resident-specific continuity
```

世界の物理や制度はコードで動かし、何を意味あるものとして読むかをモデルに任せます。

## Current status

**v0 vertical slice is merged on `main`.**

PR #3 / Issue #2で、以下まで実装・レビュー済みです。

- deterministic FakeModelによる30-cycle runner
- resident-safe TurnInput / turn-local opaque refs
- strict schema/ref/domain validation + one-repair policy
- duplicate claim protection / pause / stale recovery
- repair transport retry without creative resampling
- SQLite + Drizzle persistence and audit history
- FOLKS view / Lab view
- OpenAI-compatible CloudModelAdapter
- provider usage metadata / audit export
- 27 regression and acceptance tests
- typecheck / lint / build / local HTTP smoke / context measurement

最初のmeaningful baselineはまだ実行していません。次の段階は、**実providerを使ったtechnical shakeout**です。そこでstructured output、repair挙動、実token usage、model identifier、context余裕を確認し、条件を凍結してからfresh baseline experimentを作ります。

FakeModelは技術検証用であり、meaningful baselineとして扱いません。

## Baseline safeguards

2026-08-08の全体レビューで、baselineを汚しうる点を `docs/FINALIZATION_V0.md` に固定しました。

主なもの：

- baseline driftはテーマ誘導を抑えた `drift-neutral-ja-v0.1`
- 元の強く共鳴する漂着物は `drift-resonant-ja-v0` comparison fixture
- resident-visible inputからexperiment ID / 30-cycle horizon / provider metadataを除外
- short journalを有効な結果として許容
- creative generationはinitial + 最大1 repairのみ
- transport failureでcreative outputを引き直さない
- stale turnは保存済みraw responseがあればそこから再開
- start overは既存履歴を消さず、新experiment IDを作る

## Documents

競合時は `docs/FINALIZATION_V0.md` を優先します。

1. [`docs/FINALIZATION_V0.md`](./docs/FINALIZATION_V0.md) — final v0 corrections / supersessions
2. [`docs/DESIGN.md`](./docs/DESIGN.md) — 作品設計、情報境界、世界と観察者
3. [`docs/SPEC_V0.md`](./docs/SPEC_V0.md) — 実装仕様、型、validation、transaction、テスト
4. [`docs/EXPERIMENT_V0.md`](./docs/EXPERIMENT_V0.md) — 初期状態、weather、hypotheses、resonant comparison fixture
5. [`docs/PROMPT_V0.md`](./docs/PROMPT_V0.md) — resident prompt / repair contract
6. [`docs/UI_V0.md`](./docs/UI_V0.md) — FOLKS / Lab viewと操作意味
7. [`docs/IMPLEMENTATION_GATES_V0.md`](./docs/IMPLEMENTATION_GATES_V0.md) — pre-baseline reliability / audit gates
8. [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) — 技術構成と実装方針
9. [`CONTINUITY.md`](./CONTINUITY.md) — 現在地と次のhandoff
10. [`docs/OPEN_QUESTIONS.md`](./docs/OPEN_QUESTIONS.md) — v0以後に残した問い

## Next milestone

次は実providerで**technical experiment**を行います。

1. cloud adapterを実credentialで起動
2. structured-output normal caseを確認
3. intentionally invalidなケースでrepair経路を確認
4. provider model identifier / input-output token usage / finish reasonをLabで確認
5. worst-case resident contextがprovider上限へ十分収まることを確認
6. prompt / model / parameters / fixturesをbaseline条件として凍結
7. fresh baseline experimentを作成
8. 30サイクルを途中で条件変更せず実行
9. Propagation / Transformation / Institutionalizationを人間が読む

退屈なbaselineも有効な結果です。面白くするために途中で条件を変えません。
