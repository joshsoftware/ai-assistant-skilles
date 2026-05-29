/**
 * Envelope encryption: encrypt data with a per-record DEK, then encrypt
 * the DEK with a master KEK (RSA-OAEP). This is the BFSI-standard pattern
 * because:
 *   - Rotating the KEK only requires re-encrypting tiny DEKs, not large data
 *   - Each record has its own data key — compromise of one doesn't expose others
 *   - The master private KEK never leaves the HSM/KMS on the backend
 */
import * as aesgcm from './aesgcm.js';
import * as rsaoaep from './rsaoaep.js';
import type { RsaPublicKey, RsaPrivateKey } from './rsaoaep.js';

export interface EnvelopeCiphertext {
  /** AES-GCM ciphertext of the data, base64. */
  ciphertext: string;
  /** RSA-OAEP-encrypted DEK, base64. */
  encryptedDek: string;
}

/**
 * Encrypt plaintext with envelope encryption.
 *
 * Flow:
 *   1. Generate a fresh AES-GCM key (the DEK)
 *   2. Encrypt the plaintext with the DEK
 *   3. Export the DEK as raw bytes
 *   4. Encrypt the DEK bytes with the master RSA public key (the KEK)
 *   5. Return both ciphertexts; throw away the DEK
 */
export async function encrypt(
  masterPublicKey: RsaPublicKey,
  plaintext: string,
): Promise<EnvelopeCiphertext> {
  const dek = await aesgcm.generateKey();
  const ciphertext = await aesgcm.encrypt(dek, plaintext);
  const dekBytes = await aesgcm.exportRawKey(dek);
  const encryptedDek = await rsaoaep.encrypt(masterPublicKey, dekBytes);
  return { ciphertext, encryptedDek };
}

/**
 * Decrypt envelope ciphertext. Requires the master private key.
 * In production, this typically happens on the backend (HSM); the client
 * gets either the decrypted plaintext or a temporarily-issued DEK.
 */
export async function decrypt(
  masterPrivateKey: RsaPrivateKey,
  envelope: EnvelopeCiphertext,
): Promise<string> {
  const dekBytes = await rsaoaep.decrypt(masterPrivateKey, envelope.encryptedDek);
  const dek = await aesgcm.importRawKey(dekBytes);
  return aesgcm.decrypt(dek, envelope.ciphertext);
}

/**
 * Decrypt with a pre-unwrapped DEK (when the backend has unwrapped the DEK
 * and given it to the client to do bulk decryption locally).
 */
export async function decryptWithDek(
  dekBytes: Uint8Array,
  ciphertext: string,
): Promise<string> {
  const dek = await aesgcm.importRawKey(dekBytes);
  return aesgcm.decrypt(dek, ciphertext);
}
