import { INITIAL_OBJECTS } from "./fixtures";
import { createInitialRelationships } from "./state";
import type {
  CurrentState,
  ObjectId,
  PlaceId,
  RelationshipState,
  RelationshipValue,
} from "./types";

export function rebuildWorldProjection(
  events: CurrentState["worldEvents"],
): Record<ObjectId, PlaceId> {
  const locations = Object.fromEntries(
    INITIAL_OBJECTS.map((object) => [object.id, object.locationId]),
  ) as Record<ObjectId, PlaceId>;
  for (const event of [...events].sort((a, b) => a.cycle - b.cycle)) {
    if (event.type === "object_moved") {
      locations[event.payload.objectId] = event.payload.toPlaceId;
    }
  }
  return locations;
}

export function rebuildRelationshipProjection(
  events: CurrentState["relationshipEvents"],
): RelationshipState {
  const relationships = createInitialRelationships();
  for (const event of [...events].sort((a, b) => a.cycle - b.cycle)) {
    relationships[event.actorId][event.targetId] = event.after;
  }
  return relationships;
}

export function projectionMatchesHistory(state: CurrentState): boolean {
  const worldLocations = rebuildWorldProjection(state.worldEvents);
  const relationshipState = rebuildRelationshipProjection(
    state.relationshipEvents,
  );
  const currentWorldLocations = Object.fromEntries(
    Object.entries(state.objects).map(([id, object]) => [id, object.locationId]),
  ) as Record<ObjectId, PlaceId>;
  return (
    JSON.stringify(worldLocations) === JSON.stringify(currentWorldLocations) &&
    JSON.stringify(relationshipState) === JSON.stringify(state.relationships)
  );
}

export function relationshipValueFromEvents(
  events: CurrentState["relationshipEvents"],
  actorId: keyof RelationshipState,
  targetId: keyof RelationshipState,
): RelationshipValue {
  const event = [...events]
    .filter(
      (candidate) =>
        candidate.actorId === actorId && candidate.targetId === targetId,
    )
    .sort((a, b) => b.cycle - a.cycle)[0];
  return event?.after ?? 0;
}
