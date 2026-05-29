---
name: bfsi-test-pattern
description: Reference for BFSI testing patterns — security scenarios (auth bypass, injection, race conditions), accessibility tests, PII masking checks, and form validation edge cases. Auto-loads when the user asks about writing tests, test coverage, security tests, a11y tests, or BFSI-specific test patterns.
---

# BFSI Testing Patterns

Reference for what to test in a BFSI project. Goes beyond happy-path unit tests.

## Tools

- **Vitest** for unit + integration tests
- **@testing-library/react** for component tests
- **@axe-core/react** for a11y assertions
- **MSW (Mock Service Worker)** for network mocking
- **Playwright** for E2E

## The BFSI test pyramid

```
                  /\
                 /  \   Playwright E2E (few)
                /____\
               /      \
              / RTL +  \  Integration (some)
             / MSW      \
            /____________\
           /              \
          /  Vitest unit   \  Unit (many)
         /__________________\
```

## Required test categories per feature

For every feature, you need:

### 1. Schema tests (Zod)

```ts
// src/features/Kyc/__tests__/schema.test.ts
import { describe, expect, it } from 'vitest';
import { kycSubmissionSchema } from '../schema';

describe('kycSubmissionSchema', () => {
  it('accepts valid PAN', () => {
    expect(() => kycSubmissionSchema.parse({ pan: 'ABCDE1234F', ... })).not.toThrow();
  });
  it('rejects malformed PAN', () => {
    expect(() => kycSubmissionSchema.parse({ pan: 'abcd', ... })).toThrow(/invalid/i);
  });
  it('rejects Aadhaar with wrong checksum', () => {
    expect(() => kycSubmissionSchema.parse({ aadhaar: '123456789012', ... })).toThrow();
  });
  it('strips unknown fields (whitelist)', () => {
    const parsed = kycSubmissionSchema.parse({ pan: 'ABCDE1234F', extra: 'evil', ... });
    expect(parsed).not.toHaveProperty('extra');
  });
});
```

### 2. Container tests (RTL + MSW)

```ts
// src/features/Kyc/__tests__/containers.test.tsx
describe('KycList container', () => {
  it('renders empty state when no records', async () => { /* ... */ });
  it('masks PAN in the table by default', async () => {
    render(<KycList />);
    await screen.findByText(/loaded/i);
    // PIIMaskedDisplay shows masked value
    expect(screen.getByText('ABCDE****F')).toBeInTheDocument();
    expect(screen.queryByText('ABCDE1234F')).not.toBeInTheDocument();
  });
  it('reveals PAN on click', async () => {
    render(<KycList />);
    await userEvent.click(screen.getByRole('button', { name: /reveal pan/i }));
    expect(screen.getByText('ABCDE1234F')).toBeInTheDocument();
  });
});
```

### 3. Permission tests

```ts
describe('KycList route', () => {
  it('redirects to /login when unauthenticated', () => {
    /* ... */
  });
  it('shows 403 when authenticated but lacks kyc.view permission', () => {
    /* ... */
  });
  it('renders for users with kyc.view', () => {
    /* ... */
  });
});
```

### 4. Idempotency tests

```ts
describe('submitKyc mutation', () => {
  it('includes Idempotency-Key header', async () => {
    const spy = vi.spyOn(http, 'post');
    await store.dispatch(api.endpoints.submitKyc.initiate(payload));
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      }),
    );
  });
  it('uses the same key on retry', async () => {
    /* ... */
  });
});
```

### 5. A11y tests

```ts
import { axe } from 'jest-axe';

describe('KycForm a11y', () => {
  it('has no a11y violations', async () => {
    const { container } = render(<KycForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
  it('all inputs have labels', () => {
    render(<KycForm />);
    expect(screen.getByLabelText(/pan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aadhaar/i)).toBeInTheDocument();
  });
  it('error messages are announced (aria-live)', async () => { /* ... */ });
});
```

### 6. Security tests

```ts
describe('KycList security', () => {
  it('does not log PAN to console', async () => {
    const logSpy = vi.spyOn(console, 'log');
    render(<KycList />);
    await screen.findByText(/loaded/i);
    const allLogArgs = logSpy.mock.calls.flat().join(' ');
    expect(allLogArgs).not.toMatch(/[A-Z]{5}\d{4}[A-Z]/); // PAN pattern
  });
  it('does not store PAN in localStorage', async () => {
    render(<KycList />);
    await screen.findByText(/loaded/i);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const value = localStorage.getItem(key) || '';
      expect(value).not.toMatch(/[A-Z]{5}\d{4}[A-Z]/);
    }
  });
  it('does not include PAN in URLs (query / hash)', () => {
    expect(window.location.search).not.toMatch(/[A-Z]{5}\d{4}[A-Z]/);
    expect(window.location.hash).not.toMatch(/[A-Z]{5}\d{4}[A-Z]/);
  });
});
```

### 7. E2E (Playwright)

For each route, one E2E that:

- Logs in
- Navigates to the route
- Performs the primary user action
- Asserts the success state

## Patterns to copy

When unsure, copy patterns from `src/features/_example/__tests__/`. The example feature is intentionally well-tested as a reference.

## Coverage targets

- Container components: 80%+ statement coverage
- Schemas (Zod): 100% (cheap and high-value)
- Pure components: 60%+ (style edge cases caught visually)
- E2E: one per route
- Security: every PII-handling component must have category 5 + 6 tests
