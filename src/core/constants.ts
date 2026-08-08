import type {
  ExperimentKind,
  ExperimentStatus,
  ResidentDefinition,
  ResidentId,
  RelationshipValue,
} from "./types";

export const RESIDENT_IDS = ["kai", "fia", "tekt", "meme"] as const;
export const TOTAL_CYCLES = 30 as const;
export const JOURNAL_WINDOW = 4 as const;
export const MAX_WORLD_ACTIONS_PER_TURN = 1 as const;
export const MAX_RELATIONSHIP_CHANGES_PER_TURN = 1 as const;
export const MAX_RELATIONSHIP_DELTA_PER_TURN = 1 as const;
export const RELATIONSHIP_MIN = -3 as const;
export const RELATIONSHIP_MAX = 3 as const;
export const MAX_OUTPUT_REPAIR_ATTEMPTS = 1 as const;
export const BASELINE_LANGUAGE = "ja" as const;
export const PROMPT_VERSION = "resident-ja-v0.1" as const;
export const DRIFT_BASELINE_VERSION = "drift-neutral-ja-v0.1" as const;
export const DRIFT_RESONANT_VERSION = "drift-resonant-ja-v0" as const;
export const WEATHER_FIXTURE_VERSION = "weather-ja-v0.1" as const;
export const INITIAL_STATE_VERSION = "tiny-world-ja-v0.1" as const;
export const STALE_GENERATION_MS = 5 * 60 * 1000;

export const RESIDENTS: readonly ResidentDefinition[] = [
  {
    id: "kai",
    name: "Kai",
    attentionBiasesJa: [
      "世界の変化",
      "自分の観察と日誌の食い違い",
      "以前の記述との差",
    ],
  },
  {
    id: "fia",
    name: "Fia",
    attentionBiasesJa: [
      "他の住民の言葉",
      "頼みごとや約束",
      "親しさや距離の変化",
    ],
  },
  {
    id: "tekt",
    name: "Tekt",
    attentionBiasesJa: [
      "物の位置",
      "順序や維持",
      "行動の実際的な結果",
    ],
  },
  {
    id: "meme",
    name: "Meme",
    attentionBiasesJa: [
      "繰り返される言葉",
      "名前や名付け",
      "周期や反復する形",
    ],
  },
] as const;

export const RELATIONSHIP_LABELS: Record<RelationshipValue, string> = {
  [-3]: "強く警戒している",
  [-2]: "警戒している",
  [-1]: "少し警戒している",
  [0]: "特に偏りはない",
  [1]: "少し親しみを感じている",
  [2]: "親しみを感じている",
  [3]: "強い親しみを感じている",
};

export const DEFAULT_MODEL_PARAMETERS = {
  temperature: 0.7,
  maxOutputTokens: 1200,
  responseFormat: "json_object",
} as const;

export function residentForCycle(cycle: number): ResidentId {
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new Error("Cycle must be a positive integer.");
  }
  return RESIDENT_IDS[(cycle - 1) % RESIDENT_IDS.length];
}

export function nextResidentForCycle(cycle: number): ResidentId {
  return residentForCycle(cycle + 1);
}

export function isExperimentTerminal(status: ExperimentStatus): boolean {
  return status === "completed" || status === "failed";
}

export function isExperimentKind(value: string): value is ExperimentKind {
  return value === "technical" || value === "baseline";
}
