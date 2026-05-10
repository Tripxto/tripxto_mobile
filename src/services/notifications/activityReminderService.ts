import AsyncStorage from '@react-native-async-storage/async-storage';

import { toYmd } from '../../utils/dateOnly';
import { loadItinerary } from '../trips/itineraryStore';
import { loadTrips } from '../trips/tripsStore';
import { appendNotifications } from './notificationsStore';

const FIRED_KEY_PREFIX = '@tripxto/activity_reminders_fired_v1_';

type FiredState = {
  dateYmd: string;
  keys: string[];
};

function firedKey(userId: string): string {
  return `${FIRED_KEY_PREFIX}${userId}`;
}

function isValidHm(v: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v.trim());
}

async function readFired(userId: string): Promise<FiredState> {
  try {
    const raw = await AsyncStorage.getItem(firedKey(userId));
    if (!raw) return { dateYmd: toYmd(new Date()), keys: [] };
    const parsed = JSON.parse(raw) as FiredState;
    if (!parsed?.dateYmd || !Array.isArray(parsed.keys)) {
      return { dateYmd: toYmd(new Date()), keys: [] };
    }
    return parsed;
  } catch {
    return { dateYmd: toYmd(new Date()), keys: [] };
  }
}

async function writeFired(userId: string, state: FiredState): Promise<void> {
  await AsyncStorage.setItem(firedKey(userId), JSON.stringify(state));
}

/**
 * Checks due itinerary activities for today and appends notification entries once.
 * Returns newly created reminder messages.
 */
export async function checkDueActivityReminders(userId: string): Promise<string[]> {
  const now = new Date();
  const nowYmd = toYmd(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let fired = await readFired(userId);
  if (fired.dateYmd !== nowYmd) {
    fired = { dateYmd: nowYmd, keys: [] };
  }
  const firedSet = new Set(fired.keys);

  const trips = await loadTrips(userId);
  const dueMessages: string[] = [];

  for (const trip of trips) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const today = new Date(nowYmd);
    today.setHours(0, 0, 0, 0);
    if (today < start || today > end) continue;

    const actualDayIdx = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const itinerary = await loadItinerary(userId, trip);
    const day = itinerary.days[actualDayIdx];
    if (!day) continue;

    day.plans.forEach((p, idx) => {
      if (!isValidHm(p.time)) return;
      const [hh, mm] = p.time.split(':').map(Number);
      const planMinutes = hh * 60 + mm;
      const delta = nowMinutes - planMinutes;
      if (delta < 0 || delta > 1) return; // trigger at due minute (+1 buffer)

      const k = `${nowYmd}|${trip.id}|${actualDayIdx}|${idx}|${p.time}|${p.text}`;
      if (firedSet.has(k)) return;
      firedSet.add(k);
      dueMessages.push(`${trip.destination}: ${p.text || 'Planned activity'} at ${p.time}`);
    });
  }

  if (dueMessages.length) {
    await appendNotifications(
      userId,
      dueMessages.map((body) => ({ title: 'Activity reminder', body })),
    );
  }
  await writeFired(userId, { dateYmd: nowYmd, keys: Array.from(firedSet) });
  return dueMessages;
}
