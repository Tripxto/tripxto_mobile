# TripXto Mobile — Architecture

Reference for onboarding, backend integration, and scaling. Stack: **Expo (~55)**, **React Native**, **TypeScript**. Server: **`tripxto-api`** (Node, Express, **MongoDB** via Mongoose).

---

## 0. MongoDB backend (`../tripxto-api`)

The app currently persists to **AsyncStorage**. A companion **REST API** stores canonical data in **MongoDB** (users, OTP challenges with TTL, trips, itineraries).

| Piece | Role |
|--------|------|
| `tripxto-api/src/index.ts` | Express app, CORS, JSON body, connects Mongoose. |
| `tripxto-api/src/models/*.ts` | **User**, **Otp** (TTL on `createdAt`, 10 minutes), **Trip**, **Itinerary**. |
| `tripxto-api/src/routes/auth.ts` | Registration status, pending profile, send/verify OTP, JWT issuance, `/me`. |
| `tripxto-api/src/routes/trips.ts` | CRUD-style trips; `Trip.clientId` ↔ mobile `Trip.id`. |
| `tripxto-api/src/routes/itineraries.ts` | Get/put itinerary `document` per `userId` + trip id. |
| `tripxto-api/docker-compose.yml` | Local **MongoDB 7** on port `27017`. |
| `tripxto-api/.env.example` | `MONGODB_URI`, `JWT_SECRET`, optional `REDIS_URL` + TTL vars, `DEV_RETURN_OTP`. |

**Security:** Mobile clients use **`Authorization: Bearer <JWT>`** after `POST /api/v1/auth/verify-otp`. Do not embed MongoDB URIs in the app. Use **Atlas** or a private network in production.

**Next step for the repo:** Point `tripxto-mobile` at this API (fetch + secure token storage) and optionally implement `IOtpService` as a client of `send-otp` / `verify-otp`, or keep SMS on a third-party provider while still using MongoDB for users and trips.

Details and curl-friendly endpoint list: **`tripxto-api/README.md`**.

### Caching (client + server)

**Mobile**

- **AsyncStorage** is still the on-device source of truth (`tripsStore`, `itineraryStore`).
- **Warm memory** — `src/services/cache/warmTripCache.ts`, `warmItineraryCache.ts`: last trips / itinerary per user so **Trips** and **Itinerary** can paint **immediately** when revisiting (entries expire after ~30 minutes).
- **Stale-while-revalidate** — `src/services/sync/hydrateTripsList.ts`, `hydrateItinerary.ts`:
  1. Apply warm snapshot if present.
  2. Load **AsyncStorage** and update UI (durable offline data).
  3. If **`EXPO_PUBLIC_API_BASE`** is set and **`getApiJwt()`** (`src/services/api/sessionStore.ts`) returns a token, fetch the API **in the background**; on success **replace** local storage + warm cache (**server wins** when sync is on).
- **Pull-to-refresh** on Trips runs the same hydrate pipeline (including remote).
- **Sign-out** clears warm caches and clears the API JWT (`App.tsx`).

Until auth stores a JWT, step (3) is skipped and behavior stays offline-first.

**Optional MMKV:** The warm layer covers most “instant open” cases without `react-native-mmkv`; MMKV can still be added later for synchronous persistence if needed.

**API (`tripxto-api`)**

- **Redis** is optional (`REDIS_URL` in `.env`). If empty, every request hits MongoDB.
- **Keys:** `tx:v1:trips:list:{userId}`, `tx:v1:itinerary:{userId}:{tripClientId}` (`src/cache/cacheKeys.ts`).
- **TTL:** `REDIS_TRIPS_LIST_TTL_SEC` (default **45s**), `REDIS_ITINERARY_TTL_SEC` (default **90s**) — bounds staleness if a write slips past invalidation.
- **Invalidation:** `src/cache/invalidate.ts` — on **POST/PATCH/DELETE** trips and **PUT** itinerary, matching keys are **deleted** before/after writes.
- **Headers:** `X-Cache: HIT` | `MISS` on cached GETs.
- **Docker:** `docker compose` includes **Redis** on port **6379**.

---

## 1. Entry and navigation

| File | Role |
|------|------|
| `index.ts` | Registers the root component. |
| `App.tsx` | `SafeAreaProvider` → `AppRoot`: phase machine + main trip flow. |

### Phases (`AppRoot`)

1. **Bootstrap** — `loadSession()` from `sessionStore`; if verified user exists → `main`, else continue.
2. **`splash`** — branded view; after `SPLASH_VISIBLE_MS` → `login`.
3. **`login`** — phone entry; branches to register or OTP.
4. **`register`** — new-user profile before first OTP.
5. **`otp`** — 6-digit verification; then `finalizeLoginAfterOtp` → `main`.
6. **`main`** — signed-in UX with nested **`mainFlow`**: `trips` | `create` | `itinerary` (by `tripId`).

There is no React Navigation router; navigation is **React state** in `App.tsx`.

---

## 2. Directory map

| Area | Path | Purpose |
|------|------|---------|
| Screens | `src/screens/` | Splash, login, register, OTP, trips list, create trip, itinerary. |
| Auth persistence | `src/services/auth/sessionStore.ts` | Users + session (AsyncStorage v2 blob). |
| OTP | `src/services/otp/` | `IOtpService`, `SimulatedOtpService`, `getOtpService` / `setOtpService`. |
| Trips | `src/services/trips/tripsStore.ts` | Per-user trip arrays. |
| Itinerary | `src/services/trips/itineraryStore.ts` | Per user + trip itinerary documents. |
| Warm cache | `src/services/cache/` | In-memory snapshots for fast re-entry. |
| Sync / SWR | `src/services/sync/` | Hydrate trips & itineraries (local + optional API). |
| Remote API (optional) | `src/services/api/` | Base URL, JWT storage, fetch helpers. |
| Location | `src/services/location/indiaPostal.ts` | Pincode lookup (India Post API). |
| Types | `src/types/` | `Trip`, itinerary document shapes. |
| Utils | `src/utils/` | Phone, dates, trip category filters. |
| Theme | `src/theme/` | Colors, responsive scaling. |
| Components | `src/components/` | Shared UI (e.g. `DateField`). |
| Static data | `src/data/promoData.ts` | Promo carousel (aligned with web `trips.js`). |

---

## 3. Persistence (“database”)

There is **no SQL DB**. All durable data is **JSON strings** in **AsyncStorage**.

### 3.1 Auth — `@tripxto/auth_v2`

Single blob (`PersistedV2`):

- **`v`:** `2`
- **`usersByPhone`:** `Record<phoneE164, AuthUser>` — key is E.164 (e.g. `+91XXXXXXXXXX`).
- **`session`:** `{ userId: string; phoneE164: string } | null`

**`AuthUser`** includes: `id`, `phoneE164`, profile fields (`firstName`, `lastName`, `email`, `pincode`, `city`, `state`, `country`), `createdAt`, `updatedAt`, `status: 'active'`, **`phoneVerified`**.

**Migration:** If v2 key is empty, read **`@tripxto/auth_v1`**. If `v === 1`, run **`migrateV1ToV2`**, write v2, then use v2. Legacy users get placeholder profile and **`phoneVerified: true`**.

**Public API (conceptual behavior):**

| Function | Behavior |
|----------|----------|
| `checkRegistrationStatus(phone)` | No row → `new`; row & `!phoneVerified` → `pending_verification`; else `verified`. |
| `loadSession()` | Returns user only if `session` matches a **verified** user (same `userId` + `phoneE164`). |
| `savePendingUserProfile(phone, profile)` | Upsert user with `phoneVerified: false`. Fails with `ALREADY_VERIFIED` if that phone is already verified. |
| `finalizeLoginAfterOtp(phone)` | Requires existing user row; sets `phoneVerified: true`, sets `session`. Throws `USER_NOT_FOUND` if missing. |
| `signOut()` | Clears `session` only; **`usersByPhone` retained**. |

**ID generation:** `newId()` → `` `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` ``.

### 3.2 Trips — `@tripxto/trips_v1_{userId}`

- JSON **array** of `Trip` (`src/types/trip.ts`).
- **Sort:** By `startDate` ascending (parsed as `Date`).
- **New trip id:** `Date.now()` in `CreateTripScreen` (local-only; replace for multi-device/server).

### 3.3 Itinerary — `@tripxto/itinerary_v1_{userId}_{tripId}`

- JSON **`ItineraryDocument`** (`v: 1`, trip metadata, `days[]` with plans, packing, notes, `collapsed`).
- **Day count** from `inclusiveDayCount(startDate, endDate)` in `src/utils/dateOnly.ts`.
- **Load path:** `normalizeDoc` → `reconcileItineraryWithTrip` so trip date edits shrink/extend day buckets without losing data blindly.

---

## 4. Authentication and OTP flow

### Phone utilities (`src/utils/phone.ts`)

- Strip non-digits, max 10 digits.
- Valid if `/^\d{10}$/`.
- `toIndiaE164` → `+91` + digits.

### Screen flow

1. **Login:** Validate → `checkRegistrationStatus`.
   - **`new`** → Register screen (no OTP yet).
   - **`pending_verification` / `verified`** → `sendOtp` → OTP screen with contextual banner.
2. **Register:** Validate profile + pincode (optional `lookupIndiaPincode`) → `savePendingUserProfile` → `sendOtp` → OTP.
3. **OTP:** `verifyOtp` → `finalizeLoginAfterOtp` → `loadSession` in app → `main`.

### OTP module (`src/services/otp/`)

- **`IOtpService`:** `sendOtp`, `verifyOtp`, optional `peekDevSimulatedOtp` (dev-only hint).
- **`SimulatedOtpService` (default):**
  - Code: random integer in **[100000, 999999]** as string.
  - In-memory `Map<phoneE164, { code, expiresAt }>` with **TTL 10 minutes**.
  - Verify: strip non-digits; compare; on success clear pending entry.
  - Dev: `console.warn` banner + `peekDevSimulatedOtp` for on-screen hint (`OtpScreen`).

**Production:** Implement `IOtpService` with your provider; call `setOtpService(...)` at startup. Omit `peekDevSimulatedOtp`.

---

## 5. Algorithms and rules

### Trip categories (`src/utils/tripFilters.ts`)

Compare **local midnight** today to trip `startDate` / `endDate`:

- **Ongoing:** `today >= start && today <= end`
- **Upcoming:** `today < start`
- **Past:** `today > end`

### Calendar dates (`src/utils/dateOnly.ts`)

- **`YYYY-MM-DD`** via local calendar (`toYmd` / `parseYmdLocal`) to avoid UTC shifts from `toISOString()`.
- **`inclusiveDayCount`:** `ceil(|end - start| / 86400000) + 1` for valid ranges; else `0`.

### Itinerary resize (`itineraryStore.ts`)

- **`resizeItineraryDays`:** Preserve existing day objects when shortening; pad with empty days when lengthening.

---

## 6. External HTTP

- **`lookupIndiaPincode`:** `GET https://api.postalpincode.in/pincode/{pin}`  
  Prefer a **backend proxy** in production (rate limits, privacy, error shaping).

---

## 7. Backend migration checklist

- [ ] Run **`tripxto-api`** against MongoDB (see `tripxto-api/README.md`).
- [ ] Replace auth blob read/write with API + **secure token storage** (e.g. `expo-secure-store` for JWT).
- [ ] Map `phoneE164` / server user `id` consistently; align with **`/api/v1/auth/*`** flow.
- [ ] Swap local **`IOtpService`** for HTTP to **`send-otp` / `verify-otp`** or for Twilio/etc. while server remains source of truth for users.
- [ ] Sync trips/itinerary via **`/api/v1/trips`** and **`/api/v1/itineraries`** (or hybrid offline-first).
- [ ] Proxy pincode (and any future geocoding) through your API.

---

## 8. Related types (quick reference)

- **`Trip`:** `id`, `destination`, `startDate`, `endDate`, optional `about` / `title` / `description`.
- **`ItineraryDocument`:** `v`, `tripId`, `title`, `startDate`, `endDate`, `about`, `days[]`.
- **`TripCategory`:** `'Ongoing' | 'Upcoming' | 'Past'`.

---

*Last aligned with the `tripxto-mobile` tree as of this document’s addition.*
