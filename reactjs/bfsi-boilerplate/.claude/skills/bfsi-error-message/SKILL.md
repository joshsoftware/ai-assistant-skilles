---
name: bfsi-error-message
description: Reference for writing safe error messages — what users see, what gets logged, what gets sent to telemetry. Prevents stack traces, SQL, request IDs, or PII from leaking to UI or third-party services. Auto-loads when the user asks about error messages, error handling, exception messages, error boundaries, or Sentry/observability config.
---

# Safe Error Messages

Reference for what's safe to show users, log to console, and send to telemetry.

## The three-tier model

Every error has three audiences:

| Tier          | Audience         | What they should see                                       |
| ------------- | ---------------- | ---------------------------------------------------------- |
| **UI**        | End user         | Friendly, actionable, generic. NO technical detail.        |
| **Logs**      | Developers       | Full technical detail, structured. PII scrubbed.           |
| **Telemetry** | Sentry / Datadog | Anonymised stack + breadcrumbs. NO PII, NO request bodies. |

A single error gives different content to each tier.

## UI messages

### What users SHOULD see

- ✅ "Something went wrong. Please try again."
- ✅ "We couldn't process your transaction. Please check your details and try again. (Ref: ERR-A7K2)"
- ✅ "This PAN is already registered with another account."
- ✅ "Your session has expired. Please log in again."

### What users SHOULD NEVER see

- ❌ `TypeError: Cannot read properties of undefined (reading 'data')`
- ❌ `Failed to fetch: HTTP 500 from /api/v1/users/12345/kyc`
- ❌ `Connection refused: postgres://prod-db.internal:5432`
- ❌ `SQL syntax error near "DROP TABLE users"`
- ❌ Any raw error from the backend
- ❌ Stack traces
- ❌ Internal IDs (user IDs, session IDs — except a short ref code)

### Reference codes

Generate a short alphanumeric code (e.g. `ERR-A7K2`) that maps to the full error in logs. The user reads this to support; support looks it up. The user sees ONLY the code, never the underlying ID or message.

```ts
import { generateErrorRef, recordError } from '@react-vault/core/audit';

try {
  // ...
} catch (err) {
  const ref = generateErrorRef();
  recordError(ref, err, { feature: 'kyc', action: 'submit' });
  showToast({ title: t('errors.generic'), description: t('errors.ref', { ref }) });
}
```

## Log messages

Logs go to console (dev) and structured log shipper (prod). Full detail is fine, but:

- **PII scrubbed** — strip PAN / Aadhaar / mobile / email patterns before logging (project-local scrubber, e.g. regex pass over the payload)
- **Structured** — log as JSON (`pino`-style), not strings
- **Correlated** — include `request_id`, `user_id` (NOT email/name), `session_id`

```ts
log.error({
  request_id: req.id,
  user_id: user.id,
  feature: 'kyc',
  action: 'submit',
  error: err.message,
  stack: err.stack,
  // NEVER: pan: user.pan, aadhaar: user.aadhaar
});
```

## Telemetry (Sentry)

Sentry is third-party and may be subject to different data residency rules. Treat its data as escaping your perimeter.

### Configure scrubbing

```ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend(event) {
    // Scrub PII from breadcrumbs, request bodies, URL params
    return scrubSentryEvent(event);
  },
  ignoreErrors: [
    // Browser extension noise
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
  ],
});
```

`scrubSentryEvent` (from `@react-vault/core/observability`) walks the event and:

- Removes `request.data` (request body)
- Removes URL query params matching PII patterns
- Replaces values in `extra` / `tags` / `user` that match PII patterns with `<scrubbed>`
- Trims breadcrumbs older than 30 seconds (to limit blast radius)

### Sentry user context

Set the bare minimum:

```ts
Sentry.setUser({ id: user.id }); // ID only — NEVER email, name, mobile
```

## Error boundary

Wrap every route in `<BFSIErrorBoundary>` (from `@react-vault/ui`). It:

1. Catches the error
2. Generates a ref code
3. Records full detail to logs + telemetry (with scrubbing)
4. Shows a generic friendly message with the ref code
5. Provides a "go back" button

Never expose the actual error message via `componentDidCatch`'s `error.message` to JSX.

## When to throw vs when to swallow

- **Throw** when something genuinely went wrong and the calling code can't continue safely.
- **Swallow + log** when the operation can degrade gracefully (e.g. analytics failed — show UI anyway).

Never swallow silently. Even degraded paths should leave a log entry.

## Form validation errors (different rules)

Validation errors are NOT exceptions — they're expected user input. These can be specific:

- ✅ "PAN must be 10 characters: 5 letters, 4 digits, 1 letter"
- ✅ "Amount must be at least ₹100"
- ✅ "Mobile number must start with 6, 7, 8, or 9"

These come from Zod's `.message()` and are user-facing on purpose. Just keep them generic — don't include the _value_ the user typed back into the error.

## Edge cases

### Network errors

Don't show "Failed to fetch" or similar. Map to: "We couldn't reach our servers. Check your internet connection and try again."

### 401 (auth)

Don't show "Unauthorized" or "Token expired". Map to: "Your session has expired. Please log in again." Then redirect to login.

### 403 (permission)

Don't show "Forbidden" or "Insufficient permissions". Map to: "You don't have access to this. Contact your administrator if you think this is wrong."

### 5xx (server)

Don't show "Internal server error" or HTTP details. Map to: "We're having trouble right now. Please try again in a moment. (Ref: ERR-XXXX)"

### 429 (rate limit)

Map to: "Too many attempts. Please wait a moment and try again."
