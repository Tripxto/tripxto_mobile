import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '../../types/trip';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

function key(userId: string): string {
  return `@tripxto/notifications_v1_${userId}`;
}

async function read(userId: string): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as AppNotification[]).map((n) => ({
      ...n,
      readAt: n.readAt ?? null,
    }));
  } catch {
    return [];
  }
}

async function write(userId: string, list: AppNotification[]): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(list));
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addMonthsCovered(start: Date, end: Date): Set<number> {
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  const out = new Set<number>();
  while (s <= e) {
    out.add(s.getMonth() + 1);
    s.setMonth(s.getMonth() + 1);
  }
  return out;
}

function weatherTipForTrip(trip: Trip): string | null {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const months = addMonthsCovered(start, end);
  const inMonsoon = [6, 7, 8, 9].some((m) => months.has(m));
  const inSummer = [4, 5, 6].some((m) => months.has(m));
  const inWinter = [12, 1, 2].some((m) => months.has(m));

  if (inMonsoon) return 'Rain expected. Better carry an umbrella or raincoat and add them to your packlist.';
  if (inSummer) return 'Warm weather expected. Carry water bottle, cap and light cotton outfits.';
  if (inWinter) return 'Cool weather expected. Add a light jacket/hoodie to your packlist.';
  return null;
}

function tripPhaseMessage(trip: Trip): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (today < start) return `Upcoming trip: ${trip.destination}. Start preparing your essentials.`;
  if (today > end) return `Past trip saved: ${trip.destination}. Memories archived in your trips.`;
  return `Ongoing trip: ${trip.destination}. Stay hydrated and keep your itinerary updated.`;
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const all = await read(userId);
  return [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function appendNotifications(
  userId: string,
  notifications: Array<{ title: string; body: string }>,
): Promise<void> {
  const current = await read(userId);
  const withMeta: AppNotification[] = notifications.map((n) => ({
    id: makeId(),
    title: n.title,
    body: n.body,
    createdAt: nowIso(),
    readAt: null,
  }));
  await write(userId, [...withMeta, ...current].slice(0, 100));
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const current = await read(userId);
  const next = current.map((n) =>
    n.id === notificationId && !n.readAt ? { ...n, readAt: nowIso() } : n,
  );
  await write(userId, next);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const current = await read(userId);
  const ts = nowIso();
  const next = current.map((n) => (n.readAt ? n : { ...n, readAt: ts }));
  await write(userId, next);
}

export async function ensureWelcomeNotifications(userId: string, firstName?: string): Promise<void> {
  const current = await read(userId);
  if (current.length > 0) return;
  const name = firstName?.trim() || 'Traveler';
  await appendNotifications(userId, [
    { title: 'Welcome to TripXto', body: `Hi ${name}, your smart travel planner is ready.` },
    { title: 'Tip', body: 'Create a trip to get smart alerts, weather packing tips, and AI itinerary updates.' },
  ]);
}

export async function notifyTripCreated(userId: string, trip: Trip): Promise<void> {
  const msgs: Array<{ title: string; body: string }> = [
    { title: 'Trip created', body: `${trip.destination} has been added successfully.` },
    { title: 'Trip status', body: tripPhaseMessage(trip) },
    { title: 'AI itinerary', body: `AI itinerary generated for ${trip.destination}. You can edit it anytime.` },
  ];
  const w = weatherTipForTrip(trip);
  if (w) msgs.push({ title: 'Weather pack tip', body: w });
  await appendNotifications(userId, msgs);
}
