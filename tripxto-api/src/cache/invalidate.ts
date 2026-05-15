import { keyItinerary, keyTripsList } from './cacheKeys.js';
import { redisDel } from './redisClient.js';

export async function bustTripsList(userId: string): Promise<void> {
  await redisDel(keyTripsList(userId));
}

export async function bustItinerary(userId: string, tripClientId: number): Promise<void> {
  await redisDel(keyItinerary(userId, tripClientId));
}

export async function bustTripsListAndItinerary(userId: string, tripClientId: number): Promise<void> {
  await redisDel(keyTripsList(userId), keyItinerary(userId, tripClientId));
}
