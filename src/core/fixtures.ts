import type { ObjectId, Place, PlaceId, Weather, WorldObject } from "./types";

export const PLACES: readonly Place[] = [
  {
    id: "place_01",
    descriptionJa: "住んでいる場所の中央にある、小さく開けた空間。",
  },
  {
    id: "place_02",
    descriptionJa: "壁際にある低い棚。",
  },
  {
    id: "place_03",
    descriptionJa: "地面にある浅い窪み。決まった名前はまだない。",
  },
] as const;

export const INITIAL_OBJECTS: readonly WorldObject[] = [
  {
    id: "object_01",
    descriptionJa: "手のひらほどの大きさの石。",
    locationId: "place_01",
  },
  {
    id: "object_02",
    descriptionJa: "小さな空の器。",
    locationId: "place_02",
  },
  {
    id: "object_03",
    descriptionJa: "短い紐。",
    locationId: "place_02",
  },
] as const;

export const WEATHER_FIXTURE: ReadonlyArray<{
  cycle: number;
  kind: Weather;
  textJa: string;
}> = [
  { cycle: 1, kind: "clear", textJa: "晴れ" },
  { cycle: 2, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 3, kind: "clear", textJa: "晴れ" },
  { cycle: 4, kind: "wind", textJa: "風" },
  { cycle: 5, kind: "light_rain", textJa: "小雨" },
  { cycle: 6, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 7, kind: "clear", textJa: "晴れ" },
  { cycle: 8, kind: "wind", textJa: "風" },
  { cycle: 9, kind: "clear", textJa: "晴れ" },
  { cycle: 10, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 11, kind: "light_rain", textJa: "小雨" },
  { cycle: 12, kind: "clear", textJa: "晴れ" },
  { cycle: 13, kind: "wind", textJa: "風" },
  { cycle: 14, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 15, kind: "clear", textJa: "晴れ" },
  { cycle: 16, kind: "clear", textJa: "晴れ" },
  { cycle: 17, kind: "light_rain", textJa: "小雨" },
  { cycle: 18, kind: "wind", textJa: "風" },
  { cycle: 19, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 20, kind: "clear", textJa: "晴れ" },
  { cycle: 21, kind: "wind", textJa: "風" },
  { cycle: 22, kind: "clear", textJa: "晴れ" },
  { cycle: 23, kind: "light_rain", textJa: "小雨" },
  { cycle: 24, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 25, kind: "clear", textJa: "晴れ" },
  { cycle: 26, kind: "wind", textJa: "風" },
  { cycle: 27, kind: "clear", textJa: "晴れ" },
  { cycle: 28, kind: "light_rain", textJa: "小雨" },
  { cycle: 29, kind: "thin_cloud", textJa: "薄曇り" },
  { cycle: 30, kind: "clear", textJa: "晴れ" },
] as const;

export const DRIFT_NEUTRAL_JA: ReadonlyArray<{
  cycle: number;
  text: string;
}> = [
  { cycle: 1, text: "遠い谷で、朝の気温が前日より少し下がった。" },
  { cycle: 2, text: "海辺の町で、市場の屋根が雨のあと修理された。" },
  { cycle: 3, text: "山の斜面で、黄色い花が多く咲いた。" },
  { cycle: 4, text: "遠い川の水位が、先月より少し高くなった。" },
  { cycle: 5, text: "果樹園で、梨の収穫がいつもより早く始まった。" },
  { cycle: 6, text: "遠い港で、一艘の船の帆が新しい布に替えられた。" },
  { cycle: 7, text: "丘の道が、倒木のため半日だけ通れなくなった。" },
  { cycle: 8, text: "ある町のパン屋で、小麦粉の到着が遅れた。" },
  { cycle: 9, text: "山頂の雲が、昼まで消えなかった。" },
  { cycle: 10, text: "沿岸の海水温が、普段より少し高かった。" },
  { cycle: 11, text: "町の噴水が午後だけ止まり、夕方にまた動いた。" },
  { cycle: 12, text: "粘土を掘る場所で、色の薄い土の層が見つかった。" },
  { cycle: 13, text: "朝の霧のため、遠い町の列車が十分ほど遅れた。" },
  { cycle: 14, text: "強い風で、畑の柵の一部が傾いた。" },
  { cycle: 15, text: "湖の水位が下がり、岸辺の砂地が広く現れた。" },
  { cycle: 16, text: "ある工房で、割れた窓ガラスが交換された。" },
  { cycle: 17, text: "山羊の群れが、暑さを避けて高い牧草地へ移された。" },
  { cycle: 18, text: "海辺の建物の外壁が、白く塗り直された。" },
  { cycle: 19, text: "夜の雨で、小川の流れが速くなった。" },
  { cycle: 20, text: "ある店で、冬用の布が今年初めて並べられた。" },
  { cycle: 21, text: "小さな橋の床板が、一枚交換された。" },
  { cycle: 22, text: "古い壁の隙間に、蜂が巣を作った。" },
  { cycle: 23, text: "山の北側だけに、雪が少し残っていた。" },
  { cycle: 24, text: "漁から戻った船の帆が、一部破れていた。" },
  { cycle: 25, text: "雨のあと、遠い集落の井戸の水がいつもより冷たかった。" },
  { cycle: 26, text: "遠い農場で、豆の収穫が終わった。" },
  { cycle: 27, text: "風車が、修理のため二日間止まった。" },
  { cycle: 28, text: "池の浅い場所で、蛙が多く見つかった。" },
  { cycle: 29, text: "荷車の車輪が壊れ、道がしばらく塞がれた。" },
  { cycle: 30, text: "乾いた空気のため、夕焼けが濃く見えた。" },
] as const;

export const DRIFT_RESONANT_JA: ReadonlyArray<{
  cycle: number;
  text: string;
}> = [
  { cycle: 1, text: "遠い土地で、長いあいだ使われていた橋が閉じられた。" },
  { cycle: 2, text: "古い床の下から鐘が見つかったが、それがかつて何を知らせていたのかは誰にも分からなかった。" },
  { cycle: 3, text: "ある村で、昔の名の由来を覚えている人がいなくなったため、一つの通りの名前が変えられた。" },
  { cycle: 4, text: "渡り鳥が、人々の予想より数日早くやって来た。" },
  { cycle: 5, text: "ある図書館で、同じ古い本のすべての写しから、同じ一ページだけが失われていることが分かった。" },
  { cycle: 6, text: "ある町では、いくつもの地区に同じ形のガラス瓶を置いて、雨の量を測り始めた。" },
  { cycle: 7, text: "港が使われなくなったあとも、灯台だけは光り続けていた。" },
  { cycle: 8, text: "遠い学校の子どもたちが、雨の最初の一滴が落ちる直前の瞬間に名前をつけた。" },
  { cycle: 9, text: "枯れたと思われていた一本の木から、新しい枝が一本だけ伸びた。" },
  { cycle: 10, text: "同じ海岸を描いた二枚の地図で、小さな島が存在するかどうかが食い違っていた。" },
  { cycle: 11, text: "駅の古い時計が、長いあいだ七分遅れたままだったことが分かった。" },
  { cycle: 12, text: "ある道の脇に小さな石を置く人が増えたが、誰が最初に始めたのかについては意見が一致しなかった。" },
  { cycle: 13, text: "一艘の漁船が、乗組員にも正体の分からない物を載せて帰ってきた。" },
  { cycle: 14, text: "ほとんど誰もその音を待たなくなったため、ある町では毎日鳴らしていた鐘を鳴らすのをやめた。" },
  { cycle: 15, text: "手書きの手紙が、送られてから何十年も経って届いた。" },
  { cycle: 16, text: "ある動物の群れが、もう食べ物のある場所へは続いていない古い道筋を、今もたどっていることが分かった。" },
  { cycle: 17, text: "一枚の壁が、元のものとは少し違う煉瓦を使って修理された。" },
  { cycle: 18, text: "離れた場所にいた何人もの人が、それぞれ同じ聞き覚えのない旋律を聞いたと話した。" },
  { cycle: 19, text: "ある記録庫で、同じ会合について二つの記録が見つかり、それぞれに違う最終決定が書かれていた。" },
  { cycle: 20, text: "何年も前に誰かが地面へ置き忘れた道具の周りに、庭のように植物が育っているのが見つかった。" },
  { cycle: 21, text: "もっと速い別の道ができたあとも、一艘の渡し船には毎朝一人だけ乗客が乗り続けた。" },
  { cycle: 22, text: "ある家族は、自分たちの家の中だけで使っている言葉に、誰も由来を知らないことに気づいた。" },
  { cycle: 23, text: "畑の端を示すために置かれた印が、長いあいだに、その畑の中心のように扱われるようになった。" },
  { cycle: 24, text: "ある共同体が入口を作り直したが、新しい入口は以前より少しだけ狭くなった。" },
  { cycle: 25, text: "夜空を見ていた人々のあいだで、一つのかすかな光が場所を変えたかどうかについて意見が分かれた。" },
  { cycle: 26, text: "何年も閉じられていた箱を開けると、中には折り畳まれた白紙が一枚だけ入っていた。" },
  { cycle: 27, text: "遠い集落では、そこに生きている誰も会ったことのない人々の名前を記した一覧を、今も保管している。" },
  { cycle: 28, text: "嵐のあと、いくつもの物が岸へ流れ着き、その並び方に意味があると考える人が現れた。" },
  { cycle: 29, text: "長く使われていた道が、一季節だれも通らなかったあと、新しい草に覆われて見えなくなった。" },
  { cycle: 30, text: "遠い土地で四人が同じ古い話を語ったが、それぞれの話は違う結末で終わった。" },
] as const;

export const PLACE_BY_ID: Record<PlaceId, Place> = Object.fromEntries(
  PLACES.map((place) => [place.id, place]),
) as Record<PlaceId, Place>;

export const OBJECT_BY_ID: Record<ObjectId, WorldObject> = Object.fromEntries(
  INITIAL_OBJECTS.map((object) => [object.id, object]),
) as Record<ObjectId, WorldObject>;

export function driftForCycle(
  cycle: number,
  fixture: "neutral" | "resonant" = "neutral",
): string {
  const items = fixture === "neutral" ? DRIFT_NEUTRAL_JA : DRIFT_RESONANT_JA;
  const item = items.find((candidate) => candidate.cycle === cycle);
  if (!item) {
    throw new Error("No drift fixture for cycle " + cycle + ".");
  }
  return item.text;
}

export function weatherForCycle(cycle: number): string {
  const item = WEATHER_FIXTURE.find((candidate) => candidate.cycle === cycle);
  if (!item) {
    throw new Error("No weather fixture for cycle " + cycle + ".");
  }
  return item.textJa;
}
