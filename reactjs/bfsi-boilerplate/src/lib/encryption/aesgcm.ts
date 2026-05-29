/**
 * AES-GCM 256 symmetric encryption.
 *
 * Output format: base64( IV || ciphertext || authTag )
 * IV is 12 bytes (96 bits, GCM standard).
 * AuthTag is appended by Web Crypto (16 bytes).
 *
 * Decryption verifies the authTag — tampering produces a thrown error.
 */
import { toBase64, fromBase64, toBytes, fromBytes, randomBytes, concatBytes } from './util.js';

const ALGO = { name: 'AES-GCM' as const, length: 256 as const };
const IV_LENGTH = 12;

export type AesGcmKey = CryptoKey;

export async function generateKey(): Promise<AesGcmKey> {
  return crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt']);
}

/**
 * Import a raw 32-byte key. Use when you've derived a key (e.g. from PBKDF2)
 * or received one securely from the backend.
 */
export async function importRawKey(rawBytes: Uint8Array): Promise<AesGcmKey> {
  if (rawBytes.length !== 32) {
    throw new Error(`AES-GCM 256 requires 32 bytes, got ${rawBytes.length}`);
  }
  return crypto.subtle.importKey('raw', rawBytes, ALGO, true, ['encrypt', 'decrypt']);
}

export async function exportRawKey(key: AesGcmKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}

/**
 * Encrypt a string. Returns base64( IV || ciphertext+tag ).
 */
export async function encrypt(key: AesGcmKey, plaintext: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toBytes(plaintext)),
  );
  return toBase64(concatBytes(iv, ciphertext));
}

/**
 * Decrypt a base64 string produced by `encrypt`. Throws on tamper.
 */
export async function decrypt(key: AesGcmKey, blob: string): Promise<string> {
  const bytes = fromBase64(blob);
  if (bytes.length < IV_LENGTH + 16) {
    throw new Error('ciphertext too short');
  }
  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext),
  );
  return fromBytes(plaintext);
}

/**
 * Encrypt arbitrary bytes (e.g. another key, file content).
 */
export async function encryptBytes(key: AesGcmKey, plaintext: Uint8Array): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );
  return toBase64(concatBytes(iv, ciphertext));
}

export async function decryptBytes(key: AesGcmKey, blob: string): Promise<Uint8Array> {
  const bytes = fromBase64(blob);
  if (bytes.length < IV_LENGTH + 16) {
    throw new Error('ciphertext too short');
  }
  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
}
