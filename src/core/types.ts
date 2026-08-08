export type ResidentId = "kai" | "fia" | "tekt" | "meme";
export type PlaceId = "place_01" | "place_02" | "place_03";
export type ObjectId = "object_01" | "object_02" | "object_03";
export type Weather = "clear" | "thin_cloud" | "light_rain" | "wind";
export type RelationshipValue = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export type ExperimentKind = "technical" | "baseline";
export type ExperimentStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed"
  | "failed";
export type TurnStatus =
  | "READY"
  | "INPUT_CREATED"
  | "GENERATING"
  | "OUTPUT_RECEIVED"
  | "VALIDATED"
  | "COMMITTED"
  | "FAILED";
export type ModelRunKind = "generation" | "repair" | "transport";

export type ResidentDefinition = {
  id: ResidentId;
  name: string;
  attentionBiasesJa: string[];
};

export type Place = {
  id: PlaceId;
  descriptionJa: string;
};

export type WorldObject = {
  id: ObjectId;
  descriptionJa: string;
  locationId: PlaceId;
};

export type JournalEntry = {
  id: string;
  experimentId: string;
  cycle: number;
  authorId: ResidentId;
  publicText: string;
  questionForNext: string | null;
  createdAt: string;
};

export type PrivateNote = {
  id: string;
  experimentId: string;
  residentId: ResidentId;
  cycle: number;
  text: string;
  createdAt: string;
};

export type MoveObjectAction = {
  type: "move_object";
  objectId: ObjectId;
  destinationPlaceId: PlaceId;
};

export type WorldAction = MoveObjectAction;

export type WorldEvent = {
  id: string;
  experimentId: string;
  cycle: number;
  actorId: ResidentId;
  type: "object_moved";
  payload: {
    objectId: ObjectId;
    fromPlaceId: PlaceId;
    toPlaceId: PlaceId;
  };
  createdAt: string;
};

export type RelationshipEvent = {
  id: string;
  experimentId: string;
  cycle: number;
  actorId: ResidentId;
  targetId: ResidentId;
  delta: -1 | 0 | 1;
  reason: string;
  before: RelationshipValue;
  after: RelationshipValue;
  createdAt: string;
};

export type RelationshipState = Record<
  ResidentId,
  Partial<Record<ResidentId, RelationshipValue>>
>;

export type CurrentState = {
  objects: Record<ObjectId, WorldObject>;
  relationships: RelationshipState;
  journal: JournalEntry[];
  privateNotes: PrivateNote[];
  worldEvents: WorldEvent[];
  relationshipEvents: RelationshipEvent[];
};

export type ResidentRef = string;
export type ResidentPlaceRef = string;
export type ResidentObjectRef = string;

export type TurnRefMap = {
  objects: Record<ResidentObjectRef, ObjectId>;
  places: Record<ResidentPlaceRef, PlaceId>;
  residents: Record<ResidentRef, ResidentId>;
};

export type TurnInput = {
  cycle: number;
  resident: {
    ref: ResidentRef;
    name: string;
    attentionBiases: string[];
    privateNotes: Array<{
      cycle: number;
      text: string;
    }>;
    relationships: Array<{
      residentRef: ResidentRef;
      residentName: string;
      state: string;
    }>;
  };
  nextResident: {
    ref: ResidentRef;
    name: string;
  };
  world: {
    places: Array<{
      ref: ResidentPlaceRef;
      description: string;
    }>;
    objects: Array<{
      ref: ResidentObjectRef;
      description: string;
      locationRef: ResidentPlaceRef;
    }>;
    weather: string;
  };
  recentJournal: Array<{
    cycle: number;
    authorName: string;
    publicText: string;
    questionForNext: string | null;
  }>;
  drift: {
    text: string;
  };
  allowedActions: ["move_object"];
};

export type ModelTurnOutput = {
  journalText: string;
  privateNote: string | null;
  relationshipChange: {
    residentRef: ResidentRef;
    delta: -1 | 0 | 1;
    reason: string;
  } | null;
  worldAction: {
    type: "move_object";
    objectRef: ResidentObjectRef;
    destinationPlaceRef: ResidentPlaceRef;
  } | null;
  questionForNext: string | null;
};

export type TurnOutput = {
  journalText: string;
  privateNote: string | null;
  relationshipChange: {
    residentId: ResidentId;
    delta: -1 | 0 | 1;
    reason: string;
  } | null;
  worldAction: WorldAction | null;
  questionForNext: string | null;
};

export type Experiment = {
  id: string;
  name: string;
  kind: ExperimentKind;
  status: ExperimentStatus;
  committedCycle: number;
  totalCycles: 30;
  journalWindow: 4;
  language: "ja";
  promptVersion: string;
  driftFixtureVersion: string;
  weatherFixtureVersion: string;
  initialStateVersion: string;
  modelAdapter: string;
  modelIdentifier: string;
  modelParameters: Record<string, unknown>;
  randomSeed: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type ModelRun = {
  id: string;
  turnId: string;
  attempt: number;
  kind: ModelRunKind;
  adapter: string;
  modelIdentifier: string;
  promptVersion: string;
  rawInput: unknown;
  rawOutput: unknown;
  validationErrors: ValidationIssue[];
  startedAt: string;
  finishedAt: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
};

export type TurnRecord = {
  id: string;
  experimentId: string;
  cycle: number;
  residentId: ResidentId;
  status: TurnStatus;
  executionToken: string | null;
  claimedAt: string | null;
  updatedAt: string;
  inputSnapshot: TurnInput | null;
  refMapSnapshot: TurnRefMap | null;
  validatedOutputSnapshot: TurnOutput | null;
  validationErrors: ValidationIssue[];
  failureKind: "transport" | "validation" | null;
  committedAt: string | null;
  modelRuns: ModelRun[];
};

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ClaimResult =
  | {
      owner: true;
      turn: TurnRecord;
      retryPersistedResponse?: boolean;
    }
  | { owner: false; turn: TurnRecord };

export type FolksViewModel = {
  experiment: {
    name: string;
    kind: ExperimentKind;
    status: ExperimentStatus;
    committedCycle: number;
    totalCycles: number;
  };
  duty: {
    recentResidentName: string | null;
    nextResidentName: string | null;
  };
  world: {
    weather: string;
    places: Array<{
      description: string;
      objects: string[];
    }>;
  };
  journal: Array<{
    cycle: number;
    authorName: string;
    publicText: string;
    questionForNext: string | null;
  }>;
  drift: string | null;
};

export type LabViewModel = {
  experiment: Experiment;
  turns: TurnRecord[];
  state: CurrentState;
  residents: ResidentDefinition[];
  places: Place[];
  driftFixture: Array<{ cycle: number; text: string }>;
};
