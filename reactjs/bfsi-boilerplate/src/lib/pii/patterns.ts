/**
 * PII regex patterns. Mirror of packages/claude-toolkit/skills/bfsi-form/references/validation-regex.md.
 * Keep this file as the single source of truth — Zod schemas import from here.
 */
export const PII_PATTERNS = {
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  aadhaar: /^\d{12}$/,
  mobileIndia: /^[6-9]\d{9}$/,
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  pincodeIndia: /^\d{6}$/,
  accountNumber: /^\d{9,18}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  micr: /^\d{9}$/,
  upiVpa: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
  swiftBic: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]$/,
  passportIndia: /^[A-Z][0-9]{7}$/,
} as const;

export type PiiPatternKey = keyof typeof PII_PATTERNS;
