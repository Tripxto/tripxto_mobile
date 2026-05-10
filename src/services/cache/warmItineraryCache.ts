import type { ItineraryDocument } from '../../types/itinerary';

const key = (userId: string, tripId: number) => `${userId}:${tripId}`;

const map = new Map<string, { doc: ItineraryDocument; at: number }>();

const MAX_AGE_MS = 1000 * 60 * 30;

export function peekWarmItinerary(userId: string, tripId: number): ItineraryDocument | null {
  const row = map.get(key(userId, tripId));
  if (!row) return null;
  if (Date.now() - row.at > MAX_AGE_MS) {
    map.delete(key(userId, tripId));
    return null;
  }
  return row.doc;
}

export function touchWarmItinerary(userId: string, tripId: number, doc: ItineraryDocument): void {
  map.set(key(userId, tripId), { doc, at: Date.now() });
}

export function clearWarmItineraryCache(userId?: string, tripId?: number): void {
  if (userId != null && tripId != null) {
    map.delete(key(userId, tripId));
    return;
  }
  if (userId != null) {
    for (const k of map.keys()) {
      if (k.startsWith(`${userId}:`)) map.delete(k);
    }
    return;
  }
  map.clear();
}
