import {
  JOURNAL_WINDOW,
  RELATIONSHIP_LABELS,
  RESIDENTS,
  nextResidentForCycle,
  residentForCycle,
} from "./constants";
import { driftForCycle, weatherForCycle, PLACES } from "./fixtures";
import { getRelationship } from "./state";
import type {
  CurrentState,
  Experiment,
  ObjectId,
  ResidentObjectRef,
  ResidentPlaceRef,
  ResidentRef,
  ResidentId,
  TurnInput,
  TurnRefMap,
} from "./types";

function refFor(prefix: string, index: number, turnNonce: string): string {
  return (
    prefix +
    ":" +
    String.fromCharCode("a".charCodeAt(0) + index) +
    turnNonce
  );
}

export function buildTurnRefMap(turnNonce = "0"): TurnRefMap {
  const safeNonce = String(turnNonce).replace(/[^a-z0-9]/gi, "") || "0";
  const residents = {} as TurnRefMap["residents"];
  RESIDENTS.forEach((resident, index) => {
    residents[refFor("resident", index, safeNonce)] = resident.id;
  });

  const places = {} as TurnRefMap["places"];
  PLACES.forEach((place, index) => {
    places[refFor("place", index, safeNonce)] = place.id;
  });

  const objects = {} as TurnRefMap["objects"];
  (["object_01", "object_02", "object_03"] as ObjectId[]).forEach(
    (objectId, index) => {
      objects[refFor("object", index, safeNonce)] = objectId;
    },
  );

  return {
    residents,
    places,
    objects: objects as TurnRefMap["objects"],
  };
}

export function buildTurnInput(
  experiment: Experiment,
  state: CurrentState,
  cycle = experiment.committedCycle + 1,
): { input: TurnInput; refMap: TurnRefMap } {
  if (cycle < 1 || cycle > experiment.totalCycles) {
    throw new Error("Cycle is outside this experiment.");
  }

  const residentId = residentForCycle(cycle);
  const nextResidentId = nextResidentForCycle(cycle);
  const refMap = buildTurnRefMap(cycle.toString(36));
  const residentRef = Object.entries(refMap.residents).find(
    ([, value]) => value === residentId,
  )?.[0] as ResidentRef;
  const nextResidentRef = Object.entries(refMap.residents).find(
    ([, value]) => value === nextResidentId,
  )?.[0] as ResidentRef;
  const resident = RESIDENTS.find((candidate) => candidate.id === residentId);
  if (!resident) {
    throw new Error("Resident definition is missing.");
  }

  const relationships = RESIDENTS.filter(
    (candidate) => candidate.id !== residentId,
  ).map((candidate) => {
    const targetRef = Object.entries(refMap.residents).find(
      ([, value]) => value === candidate.id,
    )?.[0] as ResidentRef;
    return {
      residentRef: targetRef,
      residentName: candidate.name,
      state: RELATIONSHIP_LABELS[
        getRelationship(state, residentId, candidate.id)
      ],
    };
  });

  const places = PLACES.map((place) => ({
    ref: (Object.entries(refMap.places).find(
      ([, value]) => value === place.id,
    )?.[0] ?? "") as ResidentPlaceRef,
    description: place.descriptionJa,
  }));
  const objects = Object.values(state.objects).map((object) => ({
    ref: (Object.entries(refMap.objects).find(
      ([, value]) => value === object.id,
    )?.[0] ?? "") as ResidentObjectRef,
    description: object.descriptionJa,
    locationRef: (Object.entries(refMap.places).find(
      ([, value]) => value === object.locationId,
    )?.[0] ?? "") as ResidentPlaceRef,
  }));

  const recentJournal = state.journal
    .slice(-JOURNAL_WINDOW)
    .map((entry) => ({
      cycle: entry.cycle,
      authorName:
        RESIDENTS.find((candidate) => candidate.id === entry.authorId)?.name ??
        entry.authorId,
      publicText: entry.publicText,
      questionForNext: entry.questionForNext,
    }));

  const privateNotes = state.privateNotes
    .filter((note) => note.residentId === residentId)
    .sort((a, b) => a.cycle - b.cycle)
    .map((note) => ({ cycle: note.cycle, text: note.text }));

  return {
    input: {
      cycle,
      resident: {
        ref: residentRef,
        name: resident.name,
        attentionBiases: [...resident.attentionBiasesJa],
        privateNotes,
        relationships,
      },
      nextResident: {
        ref: nextResidentRef,
        name:
          RESIDENTS.find((candidate) => candidate.id === nextResidentId)?.name ??
          nextResidentId,
      },
      world: {
        places,
        objects,
        weather: weatherForCycle(cycle),
      },
      recentJournal,
      drift: { text: driftForCycle(cycle, "neutral") },
      allowedActions: ["move_object"],
    },
    refMap,
  };
}

export function resolveResidentRef(
  refMap: TurnRefMap,
  ref: ResidentRef,
): ResidentId | undefined {
  return refMap.residents[ref];
}
