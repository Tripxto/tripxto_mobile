import AsyncStorage from '@react-native-async-storage/async-storage';

import { touchWarmItinerary } from '../cache/warmItineraryCache';
import type { ItineraryDay, ItineraryDocument } from '../../types/itinerary';
import type { Trip } from '../../types/trip';
import { inclusiveDayCount } from '../../utils/dateOnly';

function key(userId: string, tripId: number): string {
  return `@tripxto/itinerary_v1_${userId}_${tripId}`;
}

function emptyDays(count: number): ItineraryDay[] {
  return Array.from({ length: count }, (): ItineraryDay => ({
    plans: [],
    packing: [],
    notes: '',
    collapsed: false,
  }));
}

export function resizeItineraryDays(prev: ItineraryDay[], nextLen: number): ItineraryDay[] {
  const out: ItineraryDay[] = [];
  for (let i = 0; i < nextLen; i++) {
    out.push(prev[i] ?? { plans: [], packing: [], notes: '', collapsed: false });
  }
  return out;
}

export function buildDefaultItinerary(trip: Trip): ItineraryDocument {
  const n = inclusiveDayCount(trip.startDate, trip.endDate);
  const count = n > 0 ? n : 1;
  return {
    v: 1,
    tripId: trip.id,
    title: trip.title ?? `${trip.destination} Trip`,
    startDate: trip.startDate,
    endDate: trip.endDate,
    about:
      trip.about?.trim() ||
      'A high-level overview of your upcoming trip itinerary and essentials.',
    days: emptyDays(count),
  };
}

function normalizeDoc(raw: unknown, trip: Trip): ItineraryDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || o.tripId !== trip.id || !Array.isArray(o.days)) return null;
  const base = buildDefaultItinerary(trip);
  const rawDays = (o.days as ItineraryDay[]) ?? [];
  const days = resizeItineraryDays(rawDays, base.days.length);
  return {
    v: 1,
    tripId: trip.id,
    title: typeof o.title === 'string' ? o.title : base.title,
    startDate: typeof o.startDate === 'string' ? o.startDate : base.startDate,
    endDate: typeof o.endDate === 'string' ? o.endDate : base.endDate,
    about: typeof o.about === 'string' ? o.about : base.about,
    days: days.map((d, i) => {
      const p = rawDays[i];
      return {
        plans: Array.isArray(p?.plans) ? p.plans : d.plans,
        packing: Array.isArray(p?.packing) ? p.packing : d.packing,
        notes: typeof p?.notes === 'string' ? p.notes : d.notes,
        collapsed: typeof p?.collapsed === 'boolean' ? p.collapsed : d.collapsed,
      };
    }),
  };
}

/** Reconcile stored doc with current trip dates (trim/extend day buckets). */
export function reconcileItineraryWithTrip(doc: ItineraryDocument, trip: Trip): ItineraryDocument {
  const n = inclusiveDayCount(trip.startDate, trip.endDate);
  const count = n > 0 ? n : doc.days.length || 1;
  return {
    ...doc,
    tripId: trip.id,
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: resizeItineraryDays(doc.days, count),
  };
}

export async function loadItinerary(userId: string, trip: Trip): Promise<ItineraryDocument> {
  try {
    const raw = await AsyncStorage.getItem(key(userId, trip.id));
    if (!raw) {
      const built = buildDefaultItinerary(trip);
      touchWarmItinerary(userId, trip.id, built);
      return built;
    }
    const parsed = JSON.parse(raw) as unknown;
    const doc = normalizeDoc(parsed, trip);
    if (!doc) {
      const built = buildDefaultItinerary(trip);
      touchWarmItinerary(userId, trip.id, built);
      return built;
    }
    const out = reconcileItineraryWithTrip(doc, trip);
    touchWarmItinerary(userId, trip.id, out);
    return out;
  } catch {
    const built = buildDefaultItinerary(trip);
    touchWarmItinerary(userId, trip.id, built);
    return built;
  }
}

export async function saveItinerary(userId: string, doc: ItineraryDocument): Promise<void> {
  touchWarmItinerary(userId, doc.tripId, doc);
  await AsyncStorage.setItem(key(userId, doc.tripId), JSON.stringify(doc));
}
