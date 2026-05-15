/** Versioned keys so schema changes can bump prefix without stale shape conflicts. */
export function keyTripsList(userId: string): string {
  return `tx:v1:trips:list:${userId}`;
}

export function keyItinerary(userId: string, tripClientId: number): string {
  return `tx:v1:itinerary:${userId}:${tripClientId}`;
}
