/**
 * PII validators. Used by Zod schemas (via `.refine()`) and standalone.
 */
import { PII_PATTERNS } from './patterns.js';

/**
 * Verhoeff checksum verification for Aadhaar.
 * Aadhaar's 12th digit is a Verhoeff check digit.
 */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function aadhaarVerhoeff(value: string): boolean {
  if (!PII_PATTERNS.aadhaar.test(value)) {return false;}
  let c = 0;
  const reversed = value.split('').reverse().map(Number);
  for (let i = 0; i < reversed.length; i++) {
    const digit = reversed[i]!;
    c = VERHOEFF_D[c]![VERHOEFF_P[i % 8]![digit]!]!;
  }
  return c === 0;
}

export function isValidPan(value: string): boolean {
  return PII_PATTERNS.pan.test(value);
}

export function isValidAadhaar(value: string): boolean {
  return PII_PATTERNS.aadhaar.test(value) && aadhaarVerhoeff(value);
}

export function isValidIndianMobile(value: string): boolean {
  return PII_PATTERNS.mobileIndia.test(value);
}

export function isValidIfsc(value: string): boolean {
  return PII_PATTERNS.ifsc.test(value);
}

export function isValidAccountNumber(value: string): boolean {
  return PII_PATTERNS.accountNumber.test(value);
}

export function isValidEmail(value: string): boolean {
  return PII_PATTERNS.email.test(value);
}

export function isValidUpiVpa(value: string): boolean {
  return PII_PATTERNS.upiVpa.test(value);
}

export function isValidGstin(value: string): boolean {
  return PII_PATTERNS.gstin.test(value);
}
