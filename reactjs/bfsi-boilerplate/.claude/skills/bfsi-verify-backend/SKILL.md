---
name: bfsi-verify-backend
description: Verify a backend's actual behaviour before building frontend features against it — dispatch an Explore subagent against the backend repo with a structured question list (auth scope, role enforcement, cascade/response envelopes, error shapes) and record verified findings in docs/backend-api-map.md. Use before any feature batch that touches unfamiliar endpoints, when the user says "verify the backend", "check the API", "map the endpoints", "is the backend enforcing X", or before scaffolding screens against a Rails/Node/Django API you haven't confirmed.
---

# BFSI Verify Backend

Before building frontend features against a backend, **verify what it actually
does — don't assume.** This skill codifies the single highest-value discipline
from real BFSI delivery: a pre-batch backend verification pass that, in one
documented run, uncovered three critical backend security gaps (an unscoped
list endpoint leaking every user's data, admin write endpoints with no
server-side role enforcement, and a cascade-delete response that omitted child
counts the frontend audit needed).

Frontend code cannot paper over a backend that doesn't enforce auth. The only
way to know is to read the backend and confirm. This is cheap (one subagent
dispatch) and prevents shipping features built on false assumptions.

## When to run

- Before the FIRST feature batch against any backend you haven't verified.
- Before any batch that introduces a new endpoint surface (e.g. moving from
  customer screens to admin screens).
- Any time you're about to assume "the backend handles X" (scoping,
  authorization, validation) — stop and verify instead.

## How it works

You dispatch the **Explore subagent** against the backend repository with a
structured question list, then write the verified answers into
`docs/backend-api-map.md` so the whole team (and future sessions) share one
source of truth.

### Step 1 — Locate the backend

Confirm the backend repo path with the user if not obvious (e.g.
`../shuttle-office-service`, a sibling monorepo package, a separate clone).
Never guess the path.

### Step 2 — Dispatch Explore with the structured brief

Dispatch the Explore subagent (read-only) with a brief covering these
verification axes. Adapt the wording to the backend's stack:

```
Map and VERIFY the following for <backend repo>. For each endpoint the
frontend will consume, confirm against the actual controller/route code
(cite file:line) — do not infer from naming:

1. AUTH SCOPE — for list/detail endpoints, is the result scoped to the
   current user, or does it return all rows? Find the actual query +
   any authorization callback (e.g. CanCan load_and_authorize_resource,
   Pundit policy, manual current_user filter). Flag any endpoint that
   returns more than the requesting user should see.

2. ROLE ENFORCEMENT — for admin / privileged writes (POST/PATCH/DELETE),
   is there a server-side role check? Cite the before_action / policy /
   guard. Flag any endpoint where any authenticated user can call it
   regardless of role.

3. RESPONSE ENVELOPE — what is the exact success response shape? For
   cascade operations (delete that cascades to children), does the
   response include affected child counts/ids, or just a generic
   { success } envelope?

4. ERROR ENVELOPE — what does an error response look like (status +
   body)? Is there a stable error_key / code the frontend can switch on,
   or only human strings?

5. AUTH MECHANISM — token in header? cookie/session? What header name?
   CORS config? Token refresh flow?

6. PAGINATION + FILTERING conventions, if any.

Return under 1000 words. Cite file:line for every non-obvious claim.
Do NOT read the frontend folder if one exists in the same repo.
```

### Step 3 — Record findings in docs/backend-api-map.md

Write (or update) `docs/backend-api-map.md` with the verified findings. For
anything that differs from what the frontend assumed, add an explicit
**FINDING** block:

```markdown
### FINDING: GET /reservations is not user-scoped

- Verified: ReservationsController#index returns Reservation.all
  (app/controllers/.../reservations_controller.rb:14) — no current_user filter.
- Impact: any authenticated user sees every user's reservations (PII leak).
- Frontend posture until backend fix: client-filter by current_user.uid as a
  stopgap (does NOT unleak — data still in the network response). File backend
  ticket.
```

### Step 4 — Summarise + decide posture

Report to the user:

- Total endpoints verified, grouped by resource.
- Any FINDINGs (security gaps) with severity.
- For each gap: the interim frontend posture (soft-gate, client-filter,
  pre-fetch for audit) AND a note that a backend ticket must be filed.

Then STOP and let the user confirm the posture before the feature batch starts.

## Hard rules

- **Verify, don't infer.** A route named `/admin/*` does not prove a role
  check exists. Read the guard.
- **Cite file:line** for every claim. Unverified claims are findings waiting
  to bite.
- **Soft-gate ≠ secure.** When the backend doesn't enforce, the frontend gate
  is UX only — say so explicitly, and always pair it with a backend ticket.
- **Re-dispatch on doubt.** If a feature hits backend behaviour the map didn't
  cover, re-run this skill for that endpoint rather than guessing.

## Why this is the highest-value pass

Without it, features ship on the assumption that the backend enforces auth —
and a later security review flags the missing UI scoping as a _frontend_ bug
when it's actually a server-side gap. One subagent dispatch up front converts
that whole class of latent incident into a documented, ticketed known-issue.
