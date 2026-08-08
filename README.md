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

**v0 vertical slice implemented on the issue #2 branch.**

The local implementation now includes the deterministic 30-cycle runner, resident-safe
input boundary, strict validation/repair path, stale-turn recovery, SQLite/Drizzle
audit persistence, FOLKS/Lab views, and an OpenAI-compatible cloud adapter. The real
provider shakeout and first meaningful cloud baseline remain environment-dependent;
the default local path uses FakeModelAdapter.

2026-08-08の最終全体レビューで、作品の核は維持したまま、baselineを汚しうる点を `docs/FINALIZATION_V0.md` に修正しました。主な修正は、漂着物のテーマ誘導を弱めたneutral fixture、resident-visible inputから実験ID／30-cycle horizonを除外、baselineの再生成selection bias防止、experiment stateの明確化、日誌の最低文字数強制の撤廃です。

GitHub Copilotによるpre-implementation review（Issue #1）も設計へ反映済みで、structured output、repair監査、prompt/context budget、duplicate claim / stale generation recovery、FOLKS/Labデータ境界、export境界を実装前ゲートとして明文化しています。

実装の前提と受入ゲートは、以下の文書に固定しています。

1. [`docs/FINALIZATION_V0.md`](./docs/FINALIZATION_V0.md) — **最終修正。競合時はこの文書を優先**
2. [`docs/DESIGN.md`](./docs/DESIGN.md) — 作品設計、情報境界、世界と観察者
3. [`docs/SPEC_V0.md`](./docs/SPEC_V0.md) — 実装仕様、型、validation、transaction、テスト
4. [`docs/EXPERIMENT_V0.md`](./docs/EXPERIMENT_V0.md) — 初期状態、実験仮説、weather。元のdrift列はresonant comparison扱い
5. [`docs/PROMPT_V0.md`](./docs/PROMPT_V0.md) — baseline resident promptとrepair契約
6. [`docs/UI_V0.md`](./docs/UI_V0.md) — FOLKS view / Lab view / 操作意味
7. [`docs/IMPLEMENTATION_GATES_V0.md`](./docs/IMPLEMENTATION_GATES_V0.md) — baseline前に通す信頼性・監査ゲート
8. [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) — 技術構成と実装方針
9. [`CONTINUITY.md`](./CONTINUITY.md) — 現在地とhandoff context

## Documents

- [`docs/FINALIZATION_V0.md`](./docs/FINALIZATION_V0.md) — final pre-implementation corrections / supersessions
- [`CONTINUITY.md`](./CONTINUITY.md) — 現在地、確定事項、次の入口
- [`docs/CONCEPT.md`](./docs/CONCEPT.md) — 作品思想と原型
- [`docs/DESIGN.md`](./docs/DESIGN.md) — 現在の設計原則
- [`docs/SPEC_V0.md`](./docs/SPEC_V0.md) — v0の実装仕様
- [`docs/EXPERIMENT_V0.md`](./docs/EXPERIMENT_V0.md) — experiment rationale / weather / hypotheses / resonant drift comparison data
- [`docs/PROMPT_V0.md`](./docs/PROMPT_V0.md) — resident-facing prompt contract
- [`docs/UI_V0.md`](./docs/UI_V0.md) — 観察画面とLab画面の設計
- [`docs/IMPLEMENTATION_GATES_V0.md`](./docs/IMPLEMENTATION_GATES_V0.md) — pre-baseline reliability / audit gates
- [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) — 技術構成と実装方針
- [`docs/OPEN_QUESTIONS.md`](./docs/OPEN_QUESTIONS.md) — v0以後に残した問い

## First implementation goal

同じ初期条件から4住民×30サイクルを安全に実行でき、各日直がその時点で許された情報だけを読み、公開日誌・私的記憶・小さな関係変化・最大一つの世界行動を残せること。

すべての入力、モデル出力、validation、世界変化を追跡可能にし、作品として読むFOLKS viewと検証するLab viewの両方から履歴を観察できること。

実装は専用ブランチで行い、PRでレビューします。最初のbaselineは、FakeModel/tests、実model shakeout、context budget、claim/recovery等のimplementation gatesを通過してから開始します。

そこまで完成して初めて、「継承だけで何かが立ち上がるか」を実際に問います。
