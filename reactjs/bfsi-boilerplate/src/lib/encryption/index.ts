/**
 * Encryption module — Web Crypto wrappers for AES-GCM, RSA-OAEP, PBKDF2.
 *
 * Always use these wrappers rather than calling `crypto.subtle` directly.
 * They handle IV/nonce generation, framing, and base64 transport correctly.
 *
 * Anti-patterns to avoid (see references/bfsi-encrypt-helper):
 *   - Math.random() for IVs / keys
 *   - Reusing IVs across messages
 *   - AES-ECB
 *   - md5 / sha1 for security
 *   - btoa() / XOR / custom "scrambling" as encryption
 */
export * as aesgcm from './aesgcm.js';
export * as rsaoaep from './rsaoaep.js';
export * as pbkdf2 from './pbkdf2.js';
export * as envelope from './envelope.js';
export * from './util.js';
