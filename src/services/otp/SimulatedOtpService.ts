import type { IOtpService, OtpSendResult, OtpVerifyResult } from './types';

const TTL_MS = 10 * 60 * 1000;

type Pending = { code: string; expiresAt: number };

function randomSixDigit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Dev/demo OTP: stores codes in memory. Replace with a real provider via `setOtpService`.
 */
export class SimulatedOtpService implements IOtpService {
  private readonly pending = new Map<string, Pending>();
  /** Last code issued per phone (dev UX + Metro visibility). */
  private readonly lastDevCodeByPhone = new Map<string, string>();

  private logDevOtpToMetro(normalized: string, code: string): void {
    if (!__DEV__) return;
    this.lastDevCodeByPhone.set(normalized, code);
    // console.warn is more likely to show in the Metro / Expo terminal than console.log
    const bar = '═'.repeat(44);
    console.warn(
      `\n${bar}\n  SIMULATED OTP (dev only):  ${code}\n  Phone: ${normalized}\n${bar}\n`,
    );
  }

  peekDevSimulatedOtp(phoneE164: string): string | undefined {
    if (!__DEV__) return undefined;
    return this.lastDevCodeByPhone.get(phoneE164.trim());
  }

  async sendOtp(phoneE164: string): Promise<OtpSendResult> {
    const normalized = phoneE164.trim();
    if (!normalized) {
      return { ok: false, message: 'Phone number is required.' };
    }
    const code = randomSixDigit();
    this.pending.set(normalized, { code, expiresAt: Date.now() + TTL_MS });
    this.logDevOtpToMetro(normalized, code);
    return { ok: true };
  }

  async verifyOtp(phoneE164: string, rawCode: string): Promise<OtpVerifyResult> {
    const normalized = phoneE164.trim();
    const code = rawCode.replace(/\D/g, '');
    const entry = this.pending.get(normalized);
    if (!entry) {
      return { ok: false, message: 'Request a new code.' };
    }
    if (Date.now() > entry.expiresAt) {
      this.pending.delete(normalized);
      return { ok: false, message: 'Code expired. Resend OTP.' };
    }
    if (entry.code !== code) {
      return { ok: false, message: 'Invalid code.' };
    }
    this.pending.delete(normalized);
    if (__DEV__) {
      this.lastDevCodeByPhone.delete(normalized);
    }
    return { ok: true };
  }
}
