import { SimulatedOtpService } from './SimulatedOtpService';
import type { IOtpService } from './types';

export type { IOtpService, OtpSendResult, OtpVerifyResult } from './types';
export { SimulatedOtpService } from './SimulatedOtpService';

let instance: IOtpService = new SimulatedOtpService();

export function getOtpService(): IOtpService {
  return instance;
}

/** Dev-only hint for simulated OTP; undefined when using a real provider. */
export function peekDevSimulatedOtp(phoneE164: string): string | undefined {
  return instance.peekDevSimulatedOtp?.(phoneE164);
}

/** Tests or production wiring */
export function setOtpService(next: IOtpService): void {
  instance = next;
}
