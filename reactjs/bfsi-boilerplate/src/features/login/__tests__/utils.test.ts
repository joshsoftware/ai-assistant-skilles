/**
 * Schema unit tests. Run against the Zod schema directly — no React, no
 * axios, no providers. These are the fastest tests in the suite; favour
 * them for validation coverage.
 */
import { describe, expect, it } from 'vitest';

import { LOGIN_FORM_DEFAULT_VALUES, MIN_USERNAME_LENGTH, loginSchema } from '../utils';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ username: 'amar.j', password: 'sekrit' });
    expect(result.success).toBe(true);
  });

  it('rejects usernames shorter than the minimum', () => {
    const result = loginSchema.safeParse({ username: 'a', password: 'sekrit' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['username']);
      expect(result.error.issues[0]?.message).toContain(String(MIN_USERNAME_LENGTH));
    }
  });

  it('rejects empty passwords (after trim)', () => {
    const result = loginSchema.safeParse({ username: 'amar.j', password: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['password']);
    }
  });

  it('exposes safe defaults that pass the schema only when filled in', () => {
    expect(loginSchema.safeParse(LOGIN_FORM_DEFAULT_VALUES).success).toBe(false);
  });
});
