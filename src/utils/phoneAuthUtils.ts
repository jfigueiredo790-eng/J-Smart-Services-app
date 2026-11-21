import { computeSha256Hex } from './securityUtils';

export const PHONE_AUTH_DOMAIN = 'phone.jsmartservices.com';
export const OFFICIAL_ADMIN_EMAIL = 'jfigueiredo790@gmail.com';
export const ANGOLA_COUNTRY_CODE = '+244';
export const ANGOLA_PHONE_NATIONAL_LENGTH = 9;
export const ANGOLA_PHONE_STRICT_REGEX = /^\+244[0-9]{9}$/;
export const INVALID_ANGOLA_PHONE_MESSAGE = 'Introduza um número de telefone válido de Angola.';

export const OFFICIAL_ADMIN_PRIMARY_PHONE_DISPLAY = '+244956011985';
export const OFFICIAL_ADMIN_PHONES_CANONICAL: readonly string[] = [
  '244956011985',
  '244924835279'
];

export interface NormalizedPhoneResult {
  isValid: boolean;
  digits: string;
  e164: string;
  display: string;
  national9?: string;
  error?: string;
}

/**
 * Sanitizes live user input for the 9-digit Angolan local number field (after the fixed +244 prefix).
 * Blocks letters, spaces, and invalid symbols, and gracefully extracts the 9 digits if a user
 * pastes a full "+244XXXXXXXXX" or "00244XXXXXXXXX" number.
 */
export function sanitizeAngolaPhoneDigitsInput(rawInput: string | undefined | null): string {
  const raw = rawInput || '';
  let digitsOnly = raw.replace(/\D/g, '');

  // If user pastes full "+244923456789" or "00244923456789", strip the country prefix
  if (digitsOnly.startsWith('00244') && digitsOnly.length > ANGOLA_PHONE_NATIONAL_LENGTH) {
    digitsOnly = digitsOnly.slice(5);
  } else if (
    digitsOnly.startsWith('244') &&
    (raw.trim().startsWith('+244') || raw.trim().startsWith('244')) &&
    digitsOnly.length > ANGOLA_PHONE_NATIONAL_LENGTH
  ) {
    digitsOnly = digitsOnly.slice(3);
  }

  return digitsOnly.slice(0, ANGOLA_PHONE_NATIONAL_LENGTH);
}

/**
 * Extracts up to 9 Angolan national digits from an existing stored phone string (e.g. "+244923456789" or "+244 923 456 789")
 * to pre-fill UI inputs that display a fixed "+244" prefix.
 */
export function extractAngolaNineDigits(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('00244')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('244') && digits.length >= 12) {
    digits = digits.slice(3);
  }
  return digits.slice(0, ANGOLA_PHONE_NATIONAL_LENGTH);
}

/**
 * Combines the mandatory Angola country code (+244) with the 9-digit local input.
 */
export function buildFullAngolaPhone(nineDigits: string): string {
  const cleanDigits = (nineDigits || '').replace(/\D/g, '');
  return `${ANGOLA_COUNTRY_CODE}${cleanDigits}`;
}

/**
 * Strictly validates an Angolan phone number in the mandatory official format: +244XXXXXXXXX
 * - Must start with "+244"
 * - Must contain exactly 9 numeric digits after "+244"
 * - Rejects letters, spaces, symbols, 8 digits, 10 digits, or non-Angolan prefixes
 */
export function validateStrictAngolaPhone(rawInput: string | undefined | null): NormalizedPhoneResult {
  if (typeof rawInput !== 'string') {
    return {
      isValid: false,
      digits: '',
      e164: '',
      display: '',
      error: INVALID_ANGOLA_PHONE_MESSAGE
    };
  }

  // Strictly reject any whitespace, letters, or invalid characters (do not silently strip spaces)
  if (!ANGOLA_PHONE_STRICT_REGEX.test(rawInput)) {
    return {
      isValid: false,
      digits: '',
      e164: '',
      display: '',
      error: INVALID_ANGOLA_PHONE_MESSAGE
    };
  }

  const national9 = rawInput.slice(4);
  const canonicalDigits = `244${national9}`;
  return {
    isValid: true,
    digits: canonicalDigits,
    e164: rawInput,
    display: rawInput,
    national9
  };
}

/**
 * Normalizes Angolan (+244) phone numbers to the official canonical format "+244XXXXXXXXX".
 * Preserves backward compatibility when reading or migrating legacy stored records
 * (e.g. "+244 956 011 985", "956 011 985", "00244 912345678") without breaking existing accounts.
 *
 * Examples:
 * - "+244923456789"      -> { isValid: true, e164: "+244923456789", display: "+244923456789", digits: "244923456789", national9: "923456789" }
 * - "956 011 985"        -> { isValid: true, e164: "+244956011985", display: "+244956011985", digits: "244956011985", national9: "956011985" }
 * - "+24492345678"       -> { isValid: false, error: "Introduza um número de telefone válido de Angola." }
 * - "+2449234567890"     -> { isValid: false, error: "Introduza um número de telefone válido de Angola." }
 */
export function normalizePhoneNumber(rawInput: string | undefined | null): NormalizedPhoneResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      digits: '',
      e164: '',
      display: '',
      error: INVALID_ANGOLA_PHONE_MESSAGE
    };
  }

  // Fast path for strict official format (+244XXXXXXXXX)
  if (ANGOLA_PHONE_STRICT_REGEX.test(trimmed)) {
    return validateStrictAngolaPhone(trimmed);
  }

  // Reject emails, letters, or disallowed characters
  if (/[a-zA-Z@]/.test(trimmed)) {
    return {
      isValid: false,
      digits: '',
      e164: '',
      display: '',
      error: INVALID_ANGOLA_PHONE_MESSAGE
    };
  }

  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // 1. Legacy 9-digit Angolan number without country prefix (XXXXXXXXX)
  if (digits.length === ANGOLA_PHONE_NATIONAL_LENGTH) {
    const e164 = `+244${digits}`;
    return {
      isValid: true,
      digits: `244${digits}`,
      e164,
      display: e164,
      national9: digits
    };
  }

  // 2. Angolan 12-digit number with country code (244 + 9 digits)
  if (digits.length === 12 && digits.startsWith('244')) {
    const national9 = digits.slice(3);
    const e164 = `+${digits}`;
    return {
      isValid: true,
      digits,
      e164,
      display: e164,
      national9
    };
  }

  return {
    isValid: false,
    digits,
    e164: '',
    display: '',
    error: INVALID_ANGOLA_PHONE_MESSAGE
  };
}

/**
 * Generates the internal, deterministic Firebase Auth login identifier for a phone number.
 * Users never need to know or type this synthetic identifier — they always enter their phone number.
 */
export function phoneToSyntheticAuthEmail(rawPhone: string): string | null {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized.isValid || !normalized.digits) return null;
  return `u_${normalized.digits}@${PHONE_AUTH_DOMAIN}`;
}

/**
 * Checks whether an email address is an internal synthetic phone-login identifier.
 */
export function isSyntheticPhoneAuthEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${PHONE_AUTH_DOMAIN}`);
}

/**
 * Returns a clean user-facing email (hiding synthetic phone auth identifiers).
 */
export function getPublicUserEmail(email?: string | null): string {
  if (!email) return '';
  const trimmed = email.trim();
  return isSyntheticPhoneAuthEmail(trimmed) ? '' : trimmed;
}

/**
 * Computes the privacy-preserving deterministic Firestore document ID for phone_login_index.
 * Format: "ph_<64-hex-sha256>" (no raw phone number exposed in document IDs).
 */
export async function computePhoneIndexId(rawPhone: string): Promise<string | null> {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized.isValid || !normalized.digits) return null;
  const digest = await computeSha256Hex(`jsmart-phone-login-v1:${normalized.digits}`);
  if (!digest) return null;
  return `ph_${digest}`;
}

/**
 * Checks if two phone strings represent the exact same normalized Angolan phone number.
 */
export function areSamePhoneNumber(phoneA?: string | null, phoneB?: string | null): boolean {
  const a = normalizePhoneNumber(phoneA);
  const b = normalizePhoneNumber(phoneB);
  if (a.isValid && b.isValid) {
    return a.digits === b.digits;
  }
  const dA = (phoneA || '').replace(/\D/g, '');
  const dB = (phoneB || '').replace(/\D/g, '');
  if (dA.length >= 9 && dB.length >= 9) {
    return dA.slice(-9) === dB.slice(-9);
  }
  return false;
}

/**
 * Checks if a phone number matches the official Super Administrator's registered phone.
 */
export function isOfficialAdminPhone(rawPhone?: string | null): boolean {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized.isValid) return false;
  return OFFICIAL_ADMIN_PHONES_CANONICAL.includes(normalized.digits);
}
