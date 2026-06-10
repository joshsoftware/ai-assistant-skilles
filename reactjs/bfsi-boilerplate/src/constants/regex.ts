/**
 * Centralised validation regex. Reusable across schemas, forms, and inputs —
 * never inline these patterns at the call site.
 *
 * PII patterns re-export from `@/lib/pii` (the single source of truth for
 * Indian-format identifiers). Non-PII patterns (password, OTP, …) live
 * inline here.
 *
 * Full reference: `.claude/skills/bfsi-form/references/validation-regex.md`.
 *
 * NEVER add regex for card numbers / CVV / expiry — card data flows through
 * the tokenised card input only (PCI-DSS scope avoidance).
 */
import { PII_PATTERNS } from '@/lib/pii';

// --- Identity (re-exported from @/lib/pii) ---
export const PAN_REGEX = PII_PATTERNS.pan;
export const AADHAAR_REGEX = PII_PATTERNS.aadhaar;
export const PASSPORT_REGEX = PII_PATTERNS.passportIndia;

// --- Contact (re-exported from @/lib/pii) ---
export const MOBILE_REGEX = PII_PATTERNS.mobileIndia;
export const EMAIL_REGEX = PII_PATTERNS.email;
export const PINCODE_REGEX = PII_PATTERNS.pincodeIndia;

// --- Banking (re-exported from @/lib/pii) ---
export const ACCOUNT_NUMBER_REGEX = PII_PATTERNS.accountNumber;
export const IFSC_REGEX = PII_PATTERNS.ifsc;
export const MICR_REGEX = PII_PATTERNS.micr;
export const UPI_VPA_REGEX = PII_PATTERNS.upiVpa;
export const SWIFT_BIC_REGEX = PII_PATTERNS.swiftBic;
export const GSTIN_REGEX = PII_PATTERNS.gstin;

// --- Credentials (inline — NOT in @/lib/pii because they aren't PII) ---

/**
 * Password: 8+ chars, at least one uppercase, lowercase, digit, special char.
 * This is the project's frontend default — the backend's policy is authoritative.
 * Tighten per your org's policy (length, banned-list, history) before launch.
 */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]).{8,}$/;

/** Numeric OTP — 6 digits is the BFSI standard. */
export const OTP_REGEX = /^\d{6}$/;
