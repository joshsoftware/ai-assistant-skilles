---
name: bfsi-encrypt-helper
description: Reference for encrypting and decrypting sensitive data using @/lib/encryption. Covers AES-GCM (symmetric), RSA-OAEP (asymmetric), PBKDF2 (key derivation), and envelope encryption patterns. Auto-loads when the user asks about encrypting data, decrypting data, key derivation, key rotation, Web Crypto API usage, securing sensitive fields, or implementing envelope encryption.
---

# BFSI Encryption Helper

Reference for `@/lib/encryption`. Uses the browser's Web Crypto API — no external dependencies, no key material crosses package boundaries unprotected.

## Algorithms

| Algorithm       | Use                           | Module                               |
| --------------- | ----------------------------- | ------------------------------------ |
| AES-GCM 256     | Symmetric encryption of data  | `aesgcm.encrypt`, `aesgcm.decrypt`   |
| RSA-OAEP-SHA256 | Asymmetric encryption of keys | `rsaoaep.encrypt`, `rsaoaep.decrypt` |
| PBKDF2-SHA256   | Derive key from password      | `pbkdf2.deriveKey`                   |

## Common patterns

### Encrypt a string with a known symmetric key

```ts
import { aesgcm } from '@/lib/encryption';

const key = await aesgcm.generateKey();
const ciphertext = await aesgcm.encrypt(key, 'sensitive value');
const plaintext = await aesgcm.decrypt(key, ciphertext);
```

`encrypt` returns a base64 blob containing IV + ciphertext + auth tag. Don't try to compose this yourself — it's not interchangeable with raw Web Crypto output without the framing.

### Derive a key from a password

```ts
import { pbkdf2 } from '@/lib/encryption';

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await pbkdf2.deriveKey(password, salt, { iterations: 600_000 });
// Use the key for AES-GCM. Store salt alongside ciphertext.
```

600k iterations is OWASP 2025 recommendation for PBKDF2-SHA256. Don't lower it.

### Envelope encryption (BFSI standard)

This is the right pattern for storing many fields with one key, with key rotation:

```ts
import { envelope } from '@/lib/encryption';

// Setup: backend provides a public KEK (key-encrypting-key).
const masterPublicKey = await rsaoaep.importPublicKey(masterPublicKeyPem);

// Encrypt: generate a per-record DEK, encrypt data with DEK,
// then encrypt DEK with the master KEK.
const { ciphertext, encryptedDek } = await envelope.encrypt(
  masterPublicKey,
  JSON.stringify({ pan: '...', aadhaar: '...' }),
);

// Store: { ciphertext, encryptedDek } alongside the record.
// Decrypt: backend decrypts DEK with master private key, sends DEK to client,
// client decrypts ciphertext with DEK.
```

Key rotation: rotate the KEK on the backend; re-encrypt only the small `encryptedDek` per record. The large `ciphertext` doesn't need to be touched.

## Where NOT to use

- **Passwords**: never encrypt — hash with bcrypt/argon2 on the BACKEND. Client-side hashing helps you nothing.
- **Card numbers**: never encrypt yourself. Use `<PCITokenizedCardInput>`. Real card data should never reach your app.
- **Auth tokens**: don't encrypt — protect via secure storage (memory-first, see `@react-vault/core/storage`).
- **Session cookies**: server's job, not yours.

## Anti-patterns

```ts
// ❌ Don't roll your own crypto
const encrypted = btoa(JSON.stringify(data)); // NOT encryption

// ❌ Don't use Math.random() for keys / IVs
const iv = new Uint8Array(12).map(() => Math.random() * 256); // INSECURE

// ❌ Don't reuse IV across messages
const fixedIv = new Uint8Array(12); // CATASTROPHIC for GCM

// ❌ Don't store keys in localStorage
localStorage.setItem('encryption_key', exportedKey); // Defeats the point

// ❌ Don't use SHA-1 for anything security-related
const hash = crypto.subtle.digest('SHA-1', data); // Use SHA-256 minimum
```

## Verification

After implementing encryption, verify with:

```ts
import { aesgcm } from '@/lib/encryption';
import { describe, expect, it } from 'vitest';

describe('encryption round-trip', () => {
  it('produces different ciphertext each time (IV randomness)', async () => {
    const key = await aesgcm.generateKey();
    const a = await aesgcm.encrypt(key, 'test');
    const b = await aesgcm.encrypt(key, 'test');
    expect(a).not.toBe(b);
  });

  it('decrypts to the original', async () => {
    const key = await aesgcm.generateKey();
    const ciphertext = await aesgcm.encrypt(key, 'test');
    expect(await aesgcm.decrypt(key, ciphertext)).toBe('test');
  });

  it('throws on tampered ciphertext', async () => {
    const key = await aesgcm.generateKey();
    const ciphertext = await aesgcm.encrypt(key, 'test');
    const tampered = ciphertext.slice(0, -2) + 'XX';
    await expect(aesgcm.decrypt(key, tampered)).rejects.toThrow();
  });
});
```

These three tests catch 95% of misuses.
