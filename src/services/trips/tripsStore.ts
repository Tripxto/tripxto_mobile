import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE, isApiSyncEnabled } from '../api/config';
import { getApiJwt } from '../api/sessionStore';
import { createTripRemote, deleteTripRemote, updateTripRemote } from '../api/tripsRemote';
import { touchWarmTrips } from '../cache/warmTripCache';
import type { Trip } from '../../types/trip';

function storageKey(userId: string): string {
  return `@tripxto/trips_v1_${userId}`;
}

function sortTrips(list: Trip[]): Trip[] {
  return [...list].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function loadTrips(userId: string): Promise<Trip[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const list = sortTrips(parsed as Trip[]);
    touchWarmTrips(userId, list);
    return list;
  } catch {
    return [];
  }
}

export async function saveTrips(userId: string, trips: Trip[]): Promise<void> {
  const sorted = sortTrips(trips);
  touchWarmTrips(userId, sorted);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(sorted));
}

export async function getTripById(userId: string, tripId: number): Promise<Trip | null> {
  const trips = await loadTrips(userId);
  return trips.find((t) => t.id === tripId) ?? null;
}

export async function addTrip(userId: string, trip: Trip): Promise<void> {
  const trips = await loadTrips(userId);
  trips.push(trip);
  await saveTrips(userId, trips);
  if (!isApiSyncEnabled()) return;
  const jwt = await getApiJwt();
  if (!jwt) return;
  await createTripRemote(API_BASE, jwt, trip);
}

export async function updateTrip(userId: string, updated: Trip): Promise<void> {
  const trips = await loadTrips(userId);
  const i = trips.findIndex((t) => t.id === updated.id);
  if (i === -1) return;
  trips[i] = updated;
  await saveTrips(userId, trips);
  if (!isApiSyncEnabled()) return;
  const jwt = await getApiJwt();
  if (!jwt) return;
  await updateTripRemote(API_BASE, jwt, updated);
}

export async function removeTrip(userId: string, tripId: number): Promise<void> {
  const trips = await loadTrips(userId);
  const next = trips.filter((t) => t.id !== tripId);
  await saveTrips(userId, next);
  if (!isApiSyncEnabled()) return;
  const jwt = await getApiJwt();
  if (!jwt) return;
  await deleteTripRemote(API_BASE, jwt, tripId);
}
