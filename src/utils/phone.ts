export const INDIA_E164_PREFIX = '+91';

export function sanitizeIndiaMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  // Accept pastes like +91XXXXXXXXXX / 91XXXXXXXXXX / 0XXXXXXXXXX.
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

export function isValidIndiaMobile(digits: string): boolean {
  return /^\d{10}$/.test(digits);
}

export function toIndiaE164(tenDigits: string): string {
  return `${INDIA_E164_PREFIX}${tenDigits}`;
}
