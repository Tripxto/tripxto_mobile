/**
 * Set in `.env` for Expo: EXPO_PUBLIC_API_BASE=http://192.168.x.x:4000
 * When empty, remote stale-while-revalidate is skipped (local AsyncStorage only).
 */
export const API_BASE =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE
    ? String(process.env.EXPO_PUBLIC_API_BASE).replace(/\/$/, '')
    : '';

export function isApiSyncEnabled(): boolean {
  return API_BASE.length > 0;
}
