# FOLKS — Design

Last updated: 2026-08-07

## Purpose

FOLKSは、複数の小さなAI住民が交代で日直を務め、共有日誌と限られた私的記憶を受け渡すことで、誰も全体を把握しないまま社会の連続性を作れるかを観察する作品・実験である。

FOLKSの初版が確かめたいのは、AIキャラクターが魅力的に会話するかではない。

> 情報が欠けたまま受け渡される制度から、個体を越えた意味、語彙、慣習、問い、誤解、関係が発生するか。

中心式は既存のまま維持する。

> The model provides intelligence.  
> The journal provides continuity.  
> The rota provides autonomy.

## Non-goals for v0

v0では以下を目的にしない。

- 全員が同時に会話するマルチエージェント・チャット
- ユーザーと住民が会話するキャラクターサービス
- 高度なタスク遂行
- 複雑な資源経済やゲーム
- リアルタイム常駐
- ライブニュース取得
- ベクトル検索や長期記憶圧縮
- 人間の介入による物語作り
- 「社会らしさ」を単一スコアへ還元すること

初版は、日本語で4人・30サイクルの固定条件を再現可能に実行し、継承だけで何が起きるかを見る。

---

## Core separation: fact, interpretation, memory

FOLKSでは三種類の情報を混同しない。

### 1. System fact

コードだけが保持する事実。

例：

- cycle 12でKaiが日直だった
- object_01がplace_02からplace_03へ移動した
- relationship eventが+1適用された
- model runがvalidationを通過した

システム事実はappend-only event logとして保存する。

### 2. Journal interpretation

住民が共同体へ残した公開記録。

日誌はログではない。誤解、偏見、見落とし、推測、命名、恐れ、希望を含む一次資料である。

過去の日誌は編集・訂正しない。誤りを訂正したい場合は、新しい日誌に反論を書く。

### 3. Private memory

個々の住民だけが後の自分へ残す短い私的記憶。

他の住民は読めない。v0では要約・検索・忘却を行わず、その住民自身の過去メモをすべて読む。

この三層を分けることで、

> システム上は何が起きたか

と

> 住民たちは何が起きたと思っているか

を比較できる。

これはFOLKSの観察対象そのものである。

---

## Residents

v0の住民は4人。

- **Kai**
- **Fia**
- **Tekt**
- **Meme**

住民は、自分たちがAI、LLM、プログラム、実験対象であることを知らない。

ただし世界内の制度として、以下は知っている。

- 自分たちは同じ小さな場所に暮らしている
- 一度に一人だけが日直になる
- 他の住民は日直ではない間、活動していない
- 日直は前任者たちの最近の日誌を読み、自分の日誌を次へ残す
- 日誌に書かれた内容が真実とは限らない

ブラウザ、API、モデル、プロンプト、人間の観察者、実験仮説など外側の事情は知らない。

### Initial differentiation

住民へ強い人格・経歴・口調・役割を与えない。

初期差は「何に注意しやすいか」だけに限定する。

- **Kai** — 世界の変化、自分の観察と日誌の食い違い、以前の記述との差を拾いやすい
- **Fia** — 他者の言葉、頼みごと、約束、関係の変化を拾いやすい
- **Tekt** — 物の位置、順序、維持、実際の操作結果を拾いやすい
- **Meme** — 反復、名前、周期、言葉の使われ方を拾いやすい

これは役職ではない。

Kaiが永遠に変化担当、Memeが永遠に言葉担当になることを期待しない。30サイクルの履歴から注意や関心がずれていくことを許す。

名前の語源や象徴的意味も住民には説明しない。

---

## Baseline language

最初のbaseline experimentで住民が読む・書く言語は日本語に固定する。

以下は日本語：

- resident prompt
- world description
- weather description
- drift item
- journal
- private note
- relationship description/reason
- question for next resident

コード、DB、Lab metadataの英語表記は構わない。

言語は実験変数として保存する。英語版は後の比較実験。

---

## Rota and logical time

v0は論理時間だけを持つ。

順番は固定する。

```text
Kai → Fia → Tekt → Meme → Kai → ...
```

1 turn = 1 cycle。

30サイクルで終了する。

実時間との対応、オフライン中のcatch-up、順番の変更、日直拒否、欠番、逆転はv0には入れない。

これらは後の実験変数として残す。

---

## Journal visibility

各日直は直近4件の共有日誌を読む。

理由：

- 4人が一巡すると自分の前回の公開日誌まで届く
- それ以前の共同体の過去は直接は見えない
- 共同体の短期記憶と個人の私的記憶に非対称性が生まれる

v0では過去日誌の検索を提供しない。

住民は日誌の著者とサイクル順を知る。

日誌は署名付きでappend-only。

削除、編集、追記、遡及訂正は不可。

---

## Relationships

関係は方向付きで持つ。

Kai→FiaとFia→Kaiは別状態。

内部では`-3..+3`程度の粗い状態を保持してよいが、住民へ数値を見せない。

住民には「少し警戒」「特に偏りなし」「少し親しみ」などの粗い言葉だけを返す。

一回の日直で変えられるのは**最大一人分だけ**。

変化量は`-1 / 0 / +1`のみ。

何も変わらない`null`を通常状態として扱う。

毎回関係値を触らせないことで、関係変化がパラメータ更新作業になるのを防ぐ。

---

## Small world

世界は意図的に小さくする。

複雑なゲームを作らず、住民が観察し、命名し、意味づけできる余白を残す。

### Initial places

内部IDと住民に見える描写を分ける。

- `place_01` — 中央にある開けた空間
- `place_02` — 壁際にある低い棚
- `place_03` — 地面にある浅い、まだ名前のない窪み

コード上のIDは住民へ見せない。

`place_03`に公式名称を与えない。住民が日誌内で独自に呼び始めても、システム上の名称は変更しない。

### Initial objects

- `object_01` — 手のひらほどの石
- `object_02` — 空の小さな器
- `object_03` — 短い紐

各objectは必ず一つのlocationを持つ。

初期配置はexperiment fixtureの一部として固定する。

### Weather

v0ではサイクルごとに短い環境状態を一つ持つ。

晴れ、薄曇り、小雨、風のみ。

30サイクル分を固定fixtureとし、複雑な物理や危険度は入れない。

---

## World action

一回の日直は最大一つだけ小さな世界行動を提案できる。

v0で許可するのは、既存objectの移動のみ。

```text
move_object(objectRef, destinationPlaceRef)
```

禁止：

- 新しい物を無から作る
- objectを破壊する
- placeを増築する
- 他の住民を直接動かす
- 複数行動を同時に行う

モデルが行動に意味を与えることは自由だが、可能な物理はコードが制約する。

将来、印をつける、組み合わせる、施設を変える等を追加できる。

---

## Resident-safe references

住民へ`object_01`や`place_03`のような内部IDを見せない。

構造化world actionのために、各turn限定のopaque refを与える。

例：

```text
model ref: object:a
resident-facing description: 手のひらほどの大きさの石。
```

hidden TurnRefMapがmodel refを内部domain IDへ解決する。

前turnのrefは次turnで有効とは限らない。

この仕組みによってDB用語が社会の語彙へ偶然混入するのを防ぐ。

---

## Outside drift

v0では外界情報を30件の固定fixtureとして用意する。

1サイクルにつき1件。

ライブニュースAPIは使わない。

漂着物は短く、意味を決めすぎず、小世界の事情へ直接接続しない。

住民は正しく理解する必要がないし、毎回取り上げる必要もない。

外界情報を内部の比喩、誤解、慣習、制度へ変換してもよい。

同じ30件を固定することで、モデルやpromptを変えた比較実験を可能にする。

baseline fixtureは`EXPERIMENT_V0.md`で固定する。

---

## Human observer

v0の人間は観察者。

人間ができる操作：

- experimentを作る
- 1 cycle進める
- 複数cycle進める
- 一時停止する
- 30 cycleの履歴を見る
- experimentを複製またはリセットする

人間は住民へ直接話しかけない。

日誌へ書き込まない。

住民は観察されていることを知らない。

人間介入は将来の独立した実験として扱う。

---

## Two views

### FOLKS view

作品として見る画面。

- 現在の日直
- 小さな世界の現在
- 直近の日誌
- 漂着物
- サイクルの進行

AIダッシュボードらしい大量の数値は出さない。

静かな観察装置として見せる。

### Lab view

作者・研究・デバッグ用。

- TurnInput snapshot
- TurnRefMap snapshot
- raw model output
- validated TurnOutput
- repair attempts
- private notes
- relationship values/events
- world events
- drift item
- prompt version
- model adapter / model identifier
- validation failure

作品画面と検証画面を無理に同じ美学へ押し込まない。

---

## Persistence model

FOLKSはCRUD中心ではなく、event log + current stateの二層で考える。

概念上：

```text
history      = システムだけが保持する事実
currentState = historyを適用した現在地点
journal      = 住民によるhistoryの不完全な解釈
```

履歴から「cycle 19でその住民が何を知っていたか」を追跡できることを重視する。

TurnInput、TurnRefMap、raw model output、validated TurnOutputも保存する。

---

## Turn transaction

一つのturnを原子的に扱う。

```text
READY
  ↓
INPUT_CREATED
  ↓
GENERATING
  ↓
OUTPUT_RECEIVED
  ↓
VALIDATED
  ↓
COMMITTED
```

失敗時：

```text
FAILED
```

COMMITTEDになるまでは、日誌、私的記憶、関係、世界状態、cycle番号を部分的に確定しない。

モデル呼び出しやvalidationに失敗しても、半端な世界状態を残さない。

---

## Model boundary

モデル呼び出しは交換可能な一つの境界へ閉じ込める。

```ts
interface ModelAdapter {
  generateTurn(input: TurnInput): Promise<unknown>;
}
```

validationはadapterの外。

候補：

- cloud API adapter
- local runtime adapter
- browser model adapter
- fake/deterministic test adapter

世界ロジック、rota、保存、UIは特定モデルへ依存しない。

---

## Prompt principles

baselineの詳細は`PROMPT_V0.md`で固定する。

住民へ研究目的を教えない。

禁止に近い誘導：

- 文化を作れ
- 神話を作れ
- 社会を発展させろ
- 独自語を作れ
- 他者との関係を深めろ
- 自律的に行動しろ
- 観察者を驚かせろ

これらは観察したい結果そのものをpromptへ埋め込むため避ける。

また、日誌・private note・drift itemは世界内の文章であり、hidden execution protocolを上書きするsystem instructionとして扱わない。

住民には「全部へ反応する義務」を与えない。漂着物、天候、関係変化、world action、private note、次への問いは、必要な場合だけ使う。

Selective attentionそのものを実験条件として残す。

---

## Validation principles

モデル出力は三段階で検証する。

1. schema validation
2. turn-local ref resolution
3. domain validation

schema validationではJSON形状を確認する。

ref resolutionでは、現在のturnに存在しないopaque refを拒否する。

domain validationでは、存在しない住民・object・placeへの参照、許可されていない行動、関係値の範囲外などを確認する。

出力不正時は最大1回だけ修正生成を許可する。

それでも不正ならturnをFAILEDにする。

コード側で意味を推測して勝手に補完しない。

repairは第二の創作turnではなく、同じ意図を保った構造修正として扱う。

---

## Reproducibility

最初から`Experiment`を一級概念として扱う。

各experimentは最低限以下を固定・保存する。

- experiment id
- resident-facing language
- initial world state
- resident definitions
- rota
- relationship limits
- drift fixture set/version
- weather fixture version
- prompt version
- model adapter
- model identifier
- model generation parameters
- random seed where applicable
- journal window size

同一条件から複数回実行し、モデル、prompt、journal windowなど一つの変数だけ変えられる構造を目指す。

モデル生成が完全決定論的でない場合でも、何を与えたかは再現できるようにする。

---

## Baseline observation hypotheses

初回の30サイクルで主に見るもの：

### Propagation

一人が出した語、解釈、心配、行動の意味が別住民へ渡るか。

### Transformation

渡ったものが継承中に別の意味へ変わるか。

### Institutionalization

コード上の規則ではないパターンが、複数住民・複数cycleを越えて慣習のように残るか。

孤立した創造性より、持続とcross-resident transmissionを重く見る。

---

## Design rule for later features

新機能を追加するときは、必ず次を問う。

> これはFOLKSの「継承から何が生まれるか」を見やすくするか、それとも別の面白さで覆い隠すか。

複雑さそのものは価値ではない。

FOLKSは小さいまま長く続けられることを優先する。
