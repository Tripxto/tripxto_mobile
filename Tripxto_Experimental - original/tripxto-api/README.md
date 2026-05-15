# TripXto API (MongoDB)

Express + Mongoose REST API. The mobile app does **not** talk to MongoDB directly; it should call this service over HTTPS in production.

## Quick start

1. Copy `.env.example` → `.env` and set `JWT_SECRET`.
2. Start **MongoDB** and (optional) **Redis** for response caching:

   ```bash
   docker compose up -d
   ```

   Set `REDIS_URL=redis://127.0.0.1:6379` in `.env`, or leave **`REDIS_URL` empty** to disable Redis (all reads go to MongoDB).

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Health: `GET http://localhost:4000/health`

## Endpoints (summary)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/auth/status?phoneE164=` | `new` \| `pending_verification` \| `verified` |
| POST | `/api/v1/auth/pending-profile` | Body: `{ phoneE164, profile }` |
| POST | `/api/v1/auth/send-otp` | Body: `{ phoneE164 }`; dev may return `devOtp` if `DEV_RETURN_OTP=true` |
| POST | `/api/v1/auth/verify-otp` | Body: `{ phoneE164, code }` → `{ token, user }` |
| GET | `/api/v1/auth/me` | `Authorization: Bearer <token>` |
| GET | `/api/v1/trips` | Bearer required |
| POST | `/api/v1/trips` | Bearer; body matches mobile `Trip` shape (`id` = numeric client id) |
| PATCH | `/api/v1/trips/:tripId` | Bearer |
| DELETE | `/api/v1/trips/:tripId` | Bearer; removes trip + itinerary row; busts Redis |
| GET | `/api/v1/itineraries/:tripClientId` | Bearer; cached when Redis enabled (`X-Cache`) |
| PUT | `/api/v1/itineraries/:tripClientId` | Bearer; body `{ document }`; invalidates itinerary cache |

## Redis caching

- **GET** `/api/v1/trips` and **GET** `/api/v1/itineraries/:id` may return **`X-Cache: HIT`** (serialized JSON from Redis) or **`MISS`** (loaded from MongoDB, then stored with TTL).
- **TTL** defaults: trips list **45s**, itinerary **90s** — override with `REDIS_TRIPS_LIST_TTL_SEC` / `REDIS_ITINERARY_TTL_SEC`.
- **Invalidation:** creating/updating/deleting a trip clears the user’s trips list cache (and the affected itinerary cache on update/delete). Saving an itinerary clears that itinerary’s cache. TTL is a safety net if invalidation is missed.

## Collections

- **users** — profile + `phoneVerified`, string `id` (app-facing), unique `phoneE164`.
- **otps** — TTL index (~10m) on `createdAt` for one-time codes.
- **trips** — `userId` + `clientId` (maps to mobile `Trip.id`).
- **itineraries** — `userId` + `tripClientId` + `document` (mixed).

See `../tripxto-mobile/docs/ARCHITECTURE.md` for how this relates to the app.
