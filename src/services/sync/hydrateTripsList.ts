import { API_BASE, isApiSyncEnabled } from '../api/config';
import { getApiJwt } from '../api/sessionStore';
import { fetchTripsRemote } from '../api/tripsRemote';
import { peekWarmTrips, touchWarmTrips } from '../cache/warmTripCache';
import { loadTrips, saveTrips } from '../trips/tripsStore';
import type { Trip } from '../../types/trip';

export type TripsHydratePass = 'warm' | 'disk' | 'remote';

export type TripsHydrateOptions = {
  onUpdate: (trips: Trip[], meta: { pass: TripsHydratePass }) => void;
};

/**
 * 1) Emit warm memory (instant UI if user visited before).
 * 2) Load AsyncStorage and emit (durable local source of truth).
 * 3) If API_BASE + JWT: fetch server list in background; on success replace local (server wins for sync mode).
 */
export async function hydrateTripsList(userId: string, opts: TripsHydrateOptions): Promise<void> {
  const warm = peekWarmTrips(userId);
  if (warm) opts.onUpdate(warm, { pass: 'warm' });

  const disk = await loadTrips(userId);
  touchWarmTrips(userId, disk);
  opts.onUpdate(disk, { pass: 'disk' });

  if (!isApiSyncEnabled()) return;
  const jwt = await getApiJwt();
  if (!jwt) return;

  try {
    const remote = await fetchTripsRemote(API_BASE, jwt);
    await saveTrips(userId, remote);
    touchWarmTrips(userId, remote);
    opts.onUpdate(remote, { pass: 'remote' });
  } catch {
    /* keep disk — offline / stale acceptable */
  }
}
