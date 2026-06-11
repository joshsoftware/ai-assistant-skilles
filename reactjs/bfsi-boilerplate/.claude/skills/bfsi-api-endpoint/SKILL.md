---
name: bfsi-api-endpoint
description: Adds a typed TanStack Query API endpoint with Zod validation, audit hooks, and idempotency-key support. Use when the user types /bfsi-api-endpoint, asks to "add an API endpoint", "wire up GET /something", or "create a mutation".
disable-model-invocation: true
argument-hint: <Method> <Path> [--feature FeatureName] [--mutation]
allowed-tools: Read Write Edit Glob Grep
---

# BFSI API Endpoint

Adds a new endpoint to an existing feature module's `api.ts`.

## What it generates

```ts
// In src/features/<Feature>/api.ts
export const use<EndpointName> = createQuery({
  queryKey: [<TAG>],
  queryFn: async (arg) => {
    const raw = await http.<method>(<URL>, arg);
    return <ResponseSchema>.parse(raw);
  },
  meta: { audit: '<auditEventName>' },
});
```

## Workflow

### Step 1: Locate the api.ts

Find the feature's `api.ts` (either via `--feature` flag or by inferring from the current file's path). If the user is editing `src/features/Foo/components/X.tsx`, target `src/features/Foo/api.ts`.

### Step 2: Generate Zod schemas

If schemas for the request/response don't exist in `schema.ts`, add them. Default shape:

```ts
export const <endpointName>RequestSchema = z.object({ /* infer from path params and method */ });
export const <endpointName>ResponseSchema = z.object({ /* placeholder — user fills in */ });
export type <EndpointName>Request = z.infer<typeof <endpointName>RequestSchema>;
export type <EndpointName>Response = z.infer<typeof <endpointName>ResponseSchema>;
```

### Step 3: Add the endpoint

Use the template shown above.

### Step 4: Add the URL constant

In `constants.ts`:

```ts
export const <FEATURE>_URLS = {
  // ...existing
  <ENDPOINT_NAME>: '<path>',
} as const;
```

### Step 5: Mutations: idempotency-key

If method is `POST | PUT | PATCH | DELETE`, automatically include the Idempotency-Key header. Tell the user this is automatic.

### Step 6: Audit event

Pick a name following the convention: `<feature>.<entity>.<action>`. For GET endpoints, skip audit (reads are not audited by default; opt in via `--audit-reads`).

### Step 7: Verify

Run `npm run typecheck`. If the Zod schemas have placeholder shapes, flag it: "I've added the endpoint but the response schema is a placeholder. Open `schema.ts` and define the response shape."

## Conventions

- **No `any`** — every endpoint must have typed request + response.
- **All responses go through Zod** — runtime safety against XSS via malformed API.
- **All mutations get Idempotency-Key** — backend de-dupes accidental double-submit.
- **All errors throw typed `ApiError`** — handled by the global error boundary.
- **All caching uses tags**, never hard times. Invalidation is explicit.
