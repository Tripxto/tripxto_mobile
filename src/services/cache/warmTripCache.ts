import type { Trip } from '../../types/trip';

/** In-memory warm cache for instant Trips list paint (survives re-navigation). */
const byUser = new Map<string, { trips: Trip[]; at: number }>();

/** Max age before warm entry is ignored (still overwritten by disk/remote). */
const MAX_AGE_MS = 1000 * 60 * 30;

export function peekWarmTrips(userId: string): Trip[] | null {
  const row = byUser.get(userId);
  if (!row) return null;
  if (Date.now() - row.at > MAX_AGE_MS) {
    byUser.delete(userId);
    return null;
  }
  return row.trips;
}

export function touchWarmTrips(userId: string, trips: Trip[]): void {
  byUser.set(userId, { trips, at: Date.now() });
}

export function clearWarmTripCache(userId?: string): void {
  if (userId) byUser.delete(userId);
  else byUser.clear();
}
