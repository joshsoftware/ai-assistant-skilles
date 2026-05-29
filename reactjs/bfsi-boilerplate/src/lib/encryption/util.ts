/**
 * Encoding utilities. All ciphertext is transported as base64 strings.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBytes(text: string): Uint8Array {
  return enc.encode(text);
}

export function fromBytes(bytes: Uint8Array): string {
  return dec.decode(bytes);
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {binary += String.fromCharCode(b);}
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {bytes[i] = binary.charCodeAt(i);}
  return bytes;
}

/**
 * Cryptographically secure random bytes.
 * NEVER use Math.random() — see references/bfsi-encrypt-helper.
 */
export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

/**
 * Concat byte arrays. Useful for IV-prefixed ciphertext.
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}
