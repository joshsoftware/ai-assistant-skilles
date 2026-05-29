/**
 * PBKDF2-SHA256 key derivation from passwords.
 *
 * Use for: deriving an encryption key from a user-supplied passphrase.
 * Do NOT use for: server-side password storage (use bcrypt/argon2 on backend).
 *
 * Iteration count: 600,000 per OWASP 2025 recommendation for PBKDF2-SHA256.
 */
import { toBytes } from './util.js';

const DEFAULT_ITERATIONS = 600_000;

export interface DeriveKeyOptions {
  iterations?: number;
  /** Output length in bits. Default 256 (32 bytes). */
  outputLengthBits?: number;
  /** Algorithm key will be used for. Default AES-GCM 256. */
  algorithm?: 'AES-GCM' | 'HMAC';
}

/**
 * Derive an AES-GCM key from a password and salt.
 * Salt must be stored alongside the ciphertext (it's not secret, but it's per-record).
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  opts: DeriveKeyOptions = {},
): Promise<CryptoKey> {
  if (salt.length < 16) {
    throw new Error(`salt must be >= 16 bytes, got ${salt.length}`);
  }
  const iterations = opts.iterations ?? DEFAULT_ITERATIONS;
  const outputBits = opts.outputLengthBits ?? 256;
  const algorithm = opts.algorithm ?? 'AES-GCM';

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    toBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    passwordKey,
    { name: algorithm, length: outputBits },
    true,
    algorithm === 'AES-GCM' ? ['encrypt', 'decrypt'] : ['sign', 'verify'],
  );
}

/**
 * Derive raw bytes (not a CryptoKey) — useful when you need to interoperate
 * with code expecting a raw byte string.
 */
export async function deriveBytes(
  password: string,
  salt: Uint8Array,
  opts: { iterations?: number; outputLengthBits?: number } = {},
): Promise<Uint8Array> {
  if (salt.length < 16) {
    throw new Error(`salt must be >= 16 bytes, got ${salt.length}`);
  }
  const iterations = opts.iterations ?? DEFAULT_ITERATIONS;
  const outputBits = opts.outputLengthBits ?? 256;

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    toBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations,
      },
      passwordKey,
      outputBits,
    ),
  );
}
