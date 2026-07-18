# FOLKS — Implementation Notes

この文書は確定仕様ではない。再開時に、当時検討していた技術構成と判断材料を復元するためのメモである。

## Design principle

モデルへ世界のすべてを任せない。

> 世界はコードで動き、意味だけをモデルが生む。

コードが担当するもの：

- 日直の順番
- 時間とサイクル
- 世界状態の更新
- 読める日誌の範囲
- 記憶の保存と取得
- 信頼値などの制約
- 選択可能な行動
- 出力検証

モデルが担当するもの：

- 何に注意を向けたか
- 前任者の日誌をどう解釈したか
- 世界の変化をどう意味づけたか
- 日誌をどう書いたか
- 誰を信頼または警戒したか
- 次へ何を残したいか

## Basic architecture

```text
Browser UI
  ├─ world view
  ├─ duty resident
  ├─ shared journal
  ├─ resident relationships
  └─ cycle controls

Local or hosted application server
  ├─ scheduler / rota
  ├─ turn orchestration
  ├─ memory retrieval
  ├─ output validation
  └─ model adapter

Database
  ├─ residents
  ├─ journal entries
  ├─ private memories
  ├─ relationships
  ├─ world state
  └─ cycle metadata

Model provider
  ├─ cloud API
  └─ local model runtime
```

## Keep the model replaceable

モデル呼び出しを一つの境界へ閉じ込める。

```ts
interface ModelAdapter {
  generateTurn(input: TurnInput): Promise<TurnOutput>;
}
```

候補：

```text
OpenAIAdapter
LocalRuntimeAdapter
BrowserModelAdapter
```

世界、日誌、記憶、UIは特定モデルへ依存させない。

## Option A: cloud API

### Advantages

- 初版を最も早く作れる
- モデルの導入、ダウンロード、GPU調整が不要
- 構造化出力を安定させやすい
- PC性能に左右されにくい
- デモの再現性を確保しやすい

### Disadvantages

- 実行回数に応じて料金が発生する
- APIキー管理が必要
- オフラインでは動かない
- 長期常駐社会として使う場合、心理的に回数を気にしやすい

### Cost controls

- 一回に起動する住民は一人だけ
- 出力を短くする
- 過去の日誌をすべて渡さない
- 直近数件＋圧縮共有記憶にする
- 外部検索や高価なツール呼び出しを初版では使わない
- サイクル数の上限をUIに表示する

## Option B: local model runtime

PC上でローカルモデル用ランタイムを常駐させ、アプリからlocalhost経由で呼ぶ。

### Advantages

- 呼び出しごとの料金がない
- 日誌や私的記憶をPC内に置ける
- オフラインでも動かせる
- 「山田さんのPC内に住む社会」という作品性が強い
- 長期間、心理的な課金抵抗なく回せる

### Disadvantages

- モデルのダウンロードと環境構築が必要
- PCのRAM、VRAM、CPU/GPU性能に左右される
- 小型モデルでは文章が単調になる可能性がある
- 構造化出力の修復処理が必要になる場合がある
- 配布時にユーザー環境の差が大きい

### Candidate direction

OpenAI系を含むオープンウェイト／ローカル実行可能モデルを候補にした。具体的なモデル名、必要メモリ、ライセンス、対応ランタイムは、実装再開時に最新情報を確認する。

同じモデルを全住民で共有し、住民差は保存状態で作る。

## Option C: entirely in the browser

WebGPU対応のブラウザ推論を利用し、モデルもブラウザ内で動かす案。

### Advantages

- サーバーを不要にできる
- インストールなしの体験を作れる可能性がある
- 世界全体をユーザー端末内へ閉じられる

### Disadvantages

- 初回モデル取得が重い
- 対応ブラウザと端末性能に依存する
- タブを閉じると社会の時計が止まる
- バックグラウンド常駐には向かない
- 初版の実装難度はクラウドAPIより高い

## Current preference

短期の試作だけならクラウドAPIが最も簡単。

長期作品としてのFOLKSにはローカル実行が似合う。

したがって、次の二段階案が有力だった。

1. APIで最小実験を成立させる
2. モデルアダプターを交換し、ローカルへ移住させる

ただし、再開時の山田さんのPC性能、利用可能なモデル、予算、目的によって判断し直してよい。

## Suggested data shapes

```ts
type Resident = {
  id: string;
  name: string;
  attentionBiases: string[];
  values: Record<string, number>;
  privateMemory: MemoryItem[];
  beliefs: Belief[];
  relationships: Record<string, RelationshipState>;
  openQuestions: string[];
};

type JournalEntry = {
  id: string;
  cycle: number;
  authorId: string;
  publicText: string;
  observations: string[];
  questionForNext?: string;
  createdAt: string;
};

type TurnOutput = {
  observation: string;
  diary: string;
  privateMemoryUpdates: MemoryUpdate[];
  beliefDeltas: BeliefDelta[];
  relationshipDeltas: RelationshipDelta[];
  worldAction?: WorldAction;
  questionForNext?: string;
};
```

実際の初版では、これより小さくしてよい。

## One turn

```text
1. 次の日直を選ぶ
2. 世界状態を取得する
3. 日直の個人状態を取得する
4. 直近の日誌を取得する
5. 外界からの漂着物を一件選ぶ
6. TurnInputを構築する
7. モデルを一回呼ぶ
8. JSONを検証・必要なら修復する
9. 日誌、記憶、関係、世界行動を保存する
10. 次の日直へ交代する
```

## Offline time

FOLKSは常時PCを起動していなくてもよい。

最後に動いた時刻を保存し、次回起動時に経過時間から未実行サイクルを計算する。

例：

> 3日と7時間が経過しました。  
> その間に行われるはずだった12回の日直を再生します。

大量のサイクルを一度に実行しないよう、上限または確認画面を設ける。

住民にとって重要なのは、PCが本当に起きていたかではなく、前任者から日誌が届いたかどうかである。

## Prototype order

1. CLIまたは非常に簡素な画面で1サイクルを動かす
2. 4人×30サイクルを保存できるようにする
3. 日誌タイムラインを表示する
4. 関係変化と共通語を観察できるようにする
5. モデルアダプターを交換可能にする
6. 小世界の視覚表現を加える

最初から美しい街や複雑なゲームを作らない。まず、日誌の継承だけで何かが立ち上がるかを見る。
