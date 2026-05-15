import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 4000;
export const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tripxto';
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me';
export const DEV_RETURN_OTP = process.env.DEV_RETURN_OTP === 'true';

/** When unset, API skips Redis and hits MongoDB every time. */
export const REDIS_URL = process.env.REDIS_URL?.trim() || '';

/** Short TTL: list changes often; invalidated on writes anyway. */
export const REDIS_TRIPS_LIST_TTL_SEC = Number(process.env.REDIS_TRIPS_LIST_TTL_SEC) || 45;

/** Itinerary documents are larger; slightly longer TTL with PUT invalidation. */
export const REDIS_ITINERARY_TTL_SEC = Number(process.env.REDIS_ITINERARY_TTL_SEC) || 90;
