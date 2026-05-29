/**
 * RSA-OAEP encryption (for key-wrapping, not bulk data).
 * Use AES-GCM for the data; RSA-OAEP for the key.
 */
import { toBase64, fromBase64 } from './util.js';

const ALGO = { name: 'RSA-OAEP' as const, hash: 'SHA-256' as const };

export type RsaPublicKey = CryptoKey;
export type RsaPrivateKey = CryptoKey;

export async function generateKeyPair(modulusBits: 2048 | 3072 | 4096 = 2048): Promise<{
  publicKey: RsaPublicKey;
  privateKey: RsaPrivateKey;
}> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: modulusBits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );
  return { publicKey, privateKey };
}

/**
 * Import a public key from SPKI (DER, base64) — common backend format.
 */
export async function importPublicKey(spkiBase64: string): Promise<RsaPublicKey> {
  return crypto.subtle.importKey('spki', fromBase64(spkiBase64), ALGO, true, ['encrypt']);
}

/**
 * Import a public key from PEM format (`-----BEGIN PUBLIC KEY-----...`).
 */
export async function importPublicKeyPem(pem: string): Promise<RsaPublicKey> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return importPublicKey(body);
}

/**
 * Encrypt a small payload (e.g. an AES key — 32 bytes). For 2048-bit RSA-OAEP-SHA256,
 * max plaintext is 190 bytes. Don't try to bulk-encrypt with this.
 */
export async function encrypt(pub: RsaPublicKey, bytes: Uint8Array): Promise<string> {
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(ALGO, pub, bytes));
  return toBase64(ciphertext);
}

export async function decrypt(priv: RsaPrivateKey, blob: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt(ALGO, priv, fromBase64(blob)));
}
