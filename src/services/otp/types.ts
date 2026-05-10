export type OtpSendResult =
  | { ok: true }
  | { ok: false; message: string };

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; message: string };

/** Swap implementations (e.g. Twilio) without changing screens */
export interface IOtpService {
  sendOtp(phoneE164: string): Promise<OtpSendResult>;
  verifyOtp(phoneE164: string, code: string): Promise<OtpVerifyResult>;
  /** Dev-only simulated OTP for the last send; real providers omit this. */
  peekDevSimulatedOtp?(phoneE164: string): string | undefined;
}
