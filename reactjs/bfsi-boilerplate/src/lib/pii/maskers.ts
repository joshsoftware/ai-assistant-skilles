/**
 * PII maskers.
 *
 * Each masker takes a value (possibly null/undefined) and returns a string safe
 * for display. Maskers are PURE — same input always produces same output.
 *
 * For interactive click-to-reveal, use the UI component <PIIMaskedDisplay>
 * from `@/components/bfsi`, which uses these maskers internally.
 */

/**
 * Mask a PAN. `ABCDE1234F` → `ABCDE****F`.
 * Returns the input unchanged if it doesn't match PAN shape (defensive).
 */
export function maskPan(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (value.length !== 10) {
    return value;
  }
  return `${value.slice(0, 5)}****${value.slice(9, 10)}`;
}

/**
 * Mask an Aadhaar. `123456789012` → `XXXX XXXX 9012`.
 */
export function maskAadhaar(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) {
    return value;
  }
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/**
 * Mask an account number. Shows last 4 digits, masks the rest.
 * `123456789012345` → `***********2345`.
 */
export function maskAccountNumber(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 5) {
    return value;
  }
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/**
 * Mask a card number. Shows last 4 digits in PCI-DSS-friendly format.
 * `4111111111111234` → `**** **** **** 1234`.
 */
export function maskCardLast4(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) {
    return value;
  }
  return `**** **** **** ${digits.slice(-4)}`;
}

/**
 * Mask an Indian mobile number. `+91 9876543210` or `9876543210` → `+91 ******3210`.
 */
export function maskMobile(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) {
    return value;
  }
  return `+91 ******${digits.slice(-4)}`;
}

/**
 * Mask an email. `john.doe@example.com` → `j***@example.com`.
 * If the local part is single-char, masks to `*@domain.com`.
 */
export function maskEmail(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const at = value.indexOf('@');
  if (at < 1) {
    return value;
  }
  const local = value.slice(0, at);
  const domain = value.slice(at);
  if (local.length === 1) {
    return `*${domain}`;
  }
  return `${local[0]}***${domain}`;
}

/**
 * Mask a name to show initials only. `John Smith Doe` → `J. S. D.`.
 */
export function maskName(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .trim()
    .split(/\s+/)
    .map((part) => `${(part[0] ?? '').toUpperCase()}.`)
    .join(' ');
}

/**
 * Mask an address. Shows first line + city; masks the rest.
 * Useful when display needs *some* address context (locality) but not full.
 */
export function maskAddress(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const lines = value
    .split(/[,\n]/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return '';
  }
  if (lines.length === 1) {
    return `${lines[0]}…`;
  }
  const first = lines[0]!;
  return `${first}, …`;
}

/**
 * Mask a date of birth — show age range instead of date.
 * Returns `25-30 yrs` style bucket. Useful for "I need to know roughly,
 * but not exact DOB".
 */
export function maskDobAsAgeRange(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  const dob = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dob.getTime())) {
    return '';
  }
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const bucketLo = Math.floor(age / 5) * 5;
  const bucketHi = bucketLo + 4;
  return `${bucketLo}-${bucketHi} yrs`;
}

/**
 * Mask a generic string. Replaces all but first and last char with `*`.
 * Fallback when no specialised masker fits.
 */
export function maskGeneric(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (value.length <= 2) {
    return '*'.repeat(value.length);
  }
  return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
}

/**
 * Convenience dispatcher. Pick a masker by name.
 */
export type MaskerType =
  | 'pan'
  | 'aadhaar'
  | 'account_number'
  | 'card_last4'
  | 'mobile'
  | 'email'
  | 'name'
  | 'address'
  | 'dob'
  | 'generic';

export function mask(type: MaskerType, value: string | null | undefined): string {
  switch (type) {
    case 'pan':
      return maskPan(value);
    case 'aadhaar':
      return maskAadhaar(value);
    case 'account_number':
      return maskAccountNumber(value);
    case 'card_last4':
      return maskCardLast4(value);
    case 'mobile':
      return maskMobile(value);
    case 'email':
      return maskEmail(value);
    case 'name':
      return maskName(value);
    case 'address':
      return maskAddress(value);
    case 'dob':
      return maskDobAsAgeRange(value);
    case 'generic':
    default:
      return maskGeneric(value);
  }
}
