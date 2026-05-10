import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tripxto/auth_v2';

export type AuthUser = {
  id: string;
  phoneE164: string;
  firstName: string;
  lastName: string;
  email: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  status: 'active';
  phoneVerified: boolean;
};

export type RegistrationStatus = 'new' | 'pending_verification' | 'verified';

export type PendingProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
};

type PersistedV2 = {
  v: 2;
  usersByPhone: Record<string, AuthUser>;
  session: { userId: string; phoneE164: string } | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyState(): PersistedV2 {
  return { v: 2, usersByPhone: {}, session: null };
}

function migrateV1ToV2(raw: Record<string, unknown>): PersistedV2 {
  const users: Record<string, AuthUser> = {};
  const oldUsers = (raw.usersByPhone as Record<string, Record<string, unknown>>) || {};
  for (const [phone, u] of Object.entries(oldUsers)) {
    if (!u?.id) continue;
    const ts = (u.updatedAt as string) || (u.createdAt as string) || nowIso();
    users[phone] = {
      id: String(u.id),
      phoneE164: String(u.phoneE164 || phone),
      firstName: 'Traveler',
      lastName: '',
      email: '',
      pincode: '',
      city: '',
      state: '',
      country: 'India',
      createdAt: String(u.createdAt || ts),
      updatedAt: ts,
      status: 'active',
      phoneVerified: true,
    };
  }
  const sess = raw.session as { userId: string; phoneE164: string } | null;
  return { v: 2, usersByPhone: users, session: sess && sess.userId ? sess : null };
}

async function readBlob(): Promise<PersistedV2> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = await AsyncStorage.getItem('@tripxto/auth_v1');
      if (legacy) {
        try {
          const p = JSON.parse(legacy) as Record<string, unknown>;
          if (p?.v === 1) {
            const m = migrateV1ToV2(p);
            await writeBlob(m);
            return m;
          }
        } catch {
          /* fall through */
        }
      }
      return emptyState();
    }
    const parsed = JSON.parse(raw) as PersistedV2 & { v?: number };
    if (parsed?.v === 2 && typeof parsed.usersByPhone === 'object') {
      return {
        v: 2,
        usersByPhone: parsed.usersByPhone ?? {},
        session: parsed.session ?? null,
      };
    }
    if ((parsed as { v?: number }).v === 1) {
      return migrateV1ToV2(parsed as unknown as Record<string, unknown>);
    }
    return emptyState();
  } catch {
    return emptyState();
  }
}

async function writeBlob(state: PersistedV2): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function checkRegistrationStatus(phoneE164: string): Promise<RegistrationStatus> {
  const normalized = phoneE164.trim();
  const blob = await readBlob();
  const u = blob.usersByPhone[normalized];
  if (!u) return 'new';
  if (!u.phoneVerified) return 'pending_verification';
  return 'verified';
}

export async function loadSession(): Promise<AuthUser | null> {
  const blob = await readBlob();
  if (!blob.session) return null;
  const user = blob.usersByPhone[blob.session.phoneE164];
  if (!user || user.id !== blob.session.userId) return null;
  if (!user.phoneVerified) return null;
  return user;
}

/**
 * Create or update an unverified user profile (before OTP). Fails if phone already verified.
 */
export async function savePendingUserProfile(
  phoneE164: string,
  profile: PendingProfileInput,
): Promise<{ ok: true } | { ok: false; code: 'ALREADY_VERIFIED' }> {
  const normalized = phoneE164.trim();
  const blob = await readBlob();
  const existing = blob.usersByPhone[normalized];
  if (existing?.phoneVerified) {
    return { ok: false, code: 'ALREADY_VERIFIED' };
  }
  const ts = nowIso();
  const id = existing?.id ?? newId();
  blob.usersByPhone[normalized] = {
    id,
    phoneE164: normalized,
    firstName: profile.firstName.trim(),
    lastName: profile.lastName.trim(),
    email: profile.email.trim().toLowerCase(),
    pincode: profile.pincode.trim(),
    city: profile.city.trim(),
    state: profile.state.trim(),
    country: profile.country.trim() || 'India',
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
    status: 'active',
    phoneVerified: false,
  };
  await writeBlob(blob);
  return { ok: true };
}

/**
 * After successful OTP: mark verified and open session. User row must exist.
 */
export async function finalizeLoginAfterOtp(phoneE164: string): Promise<AuthUser> {
  const normalized = phoneE164.trim();
  const blob = await readBlob();
  const user = blob.usersByPhone[normalized];
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  const ts = nowIso();
  const next: AuthUser = { ...user, phoneVerified: true, updatedAt: ts };
  blob.usersByPhone[normalized] = next;
  blob.session = { userId: next.id, phoneE164: normalized };
  await writeBlob(blob);
  return next;
}

export async function signOut(): Promise<void> {
  const blob = await readBlob();
  blob.session = null;
  await writeBlob(blob);
}

export async function updateSessionProfileNames(firstName: string, lastName: string): Promise<AuthUser | null> {
  const blob = await readBlob();
  if (!blob.session) return null;
  const user = blob.usersByPhone[blob.session.phoneE164];
  if (!user || user.id !== blob.session.userId) return null;
  const next: AuthUser = {
    ...user,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    updatedAt: nowIso(),
  };
  blob.usersByPhone[blob.session.phoneE164] = next;
  await writeBlob(blob);
  return next;
}
