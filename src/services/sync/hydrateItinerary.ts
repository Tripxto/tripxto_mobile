import { API_BASE, isApiSyncEnabled } from '../api/config';
import { getApiJwt } from '../api/sessionStore';
import { fetchItineraryRemote } from '../api/itineraryRemote';
import type { Trip } from '../../types/trip';
import type { ItineraryDocument } from '../../types/itinerary';
import { loadItinerary, reconcileItineraryWithTrip, saveItinerary } from '../trips/itineraryStore';
import { peekWarmItinerary, touchWarmItinerary } from '../cache/warmItineraryCache';

export type ItineraryHydratePass = 'warm' | 'disk' | 'remote';

export type ItineraryHydrateOptions = {
  onUpdate: (doc: ItineraryDocument, meta: { pass: ItineraryHydratePass }) => void;
};

/**
 * Warm → disk → optional remote merge. Remote document is reconciled to current trip dates.
 * On remote success, persists to AsyncStorage so next launch is fast.
 */
export async function hydrateItinerary(
  userId: string,
  trip: Trip,
  opts: ItineraryHydrateOptions,
): Promise<void> {
  const warm = peekWarmItinerary(userId, trip.id);
  if (warm) {
    opts.onUpdate(reconcileItineraryWithTrip(warm, trip), { pass: 'warm' });
  }

  const disk = await loadItinerary(userId, trip);
  touchWarmItinerary(userId, trip.id, disk);
  opts.onUpdate(disk, { pass: 'disk' });

  if (!isApiSyncEnabled()) return;
  const jwt = await getApiJwt();
  if (!jwt) return;

  try {
    const remote = await fetchItineraryRemote(API_BASE, jwt, trip.id);
    if (!remote) return;
    const merged = reconcileItineraryWithTrip(remote, trip);
    await saveItinerary(userId, merged);
    touchWarmItinerary(userId, trip.id, merged);
    opts.onUpdate(merged, { pass: 'remote' });
  } catch {
    /* keep disk */
  }
}
