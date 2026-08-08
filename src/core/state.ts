import { INITIAL_OBJECTS } from "./fixtures";
import { RESIDENT_IDS, RESIDENTS } from "./constants";
import type {
  CurrentState,
  RelationshipState,
  RelationshipValue,
  ResidentId,
} from "./types";

export function createInitialRelationships(): RelationshipState {
  const relationships = {} as RelationshipState;
  for (const residentId of RESIDENT_IDS) {
    relationships[residentId] = {};
    for (const targetId of RESIDENT_IDS) {
      if (residentId !== targetId) {
        relationships[residentId][targetId] = 0;
      }
    }
  }
  return relationships;
}

export function createInitialState(): CurrentState {
  return {
    objects: Object.fromEntries(
      INITIAL_OBJECTS.map((object) => [object.id, { ...object }]),
    ) as CurrentState["objects"],
    relationships: createInitialRelationships(),
    journal: [],
    privateNotes: [],
    worldEvents: [],
    relationshipEvents: [],
  };
}

export function cloneState(state: CurrentState): CurrentState {
  return structuredClone(state);
}

export function getRelationship(
  state: CurrentState,
  residentId: ResidentId,
  targetId: ResidentId,
): RelationshipValue {
  if (residentId === targetId) {
    throw new Error("Self relationships are not part of the domain.");
  }
  return state.relationships[residentId][targetId] ?? 0;
}

export function setRelationship(
  state: CurrentState,
  residentId: ResidentId,
  targetId: ResidentId,
  value: RelationshipValue,
): void {
  if (residentId === targetId) {
    throw new Error("Self relationships are not part of the domain.");
  }
  state.relationships[residentId][targetId] = value;
}

export function residentName(residentId: ResidentId): string {
  const resident = RESIDENTS.find((candidate) => candidate.id === residentId);
  if (!resident) {
    throw new Error("Unknown resident: " + residentId);
  }
  return resident.name;
}
