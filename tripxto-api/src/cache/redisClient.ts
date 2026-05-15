import { Redis } from 'ioredis';
import { REDIS_URL } from '../config.js';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!REDIS_URL) return null;
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    client.on('error', (err: Error) => {
      console.warn('[redis]', err.message);
    });
  }
  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function redisSetex(key: string, ttlSec: number, value: string): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.setex(key, ttlSec, value);
  } catch {
    /* degrade without cache */
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  try {
    const r = getRedis();
    if (!r || keys.length === 0) return;
    await r.del(...keys);
  } catch {
    /* ignore */
  }
}
