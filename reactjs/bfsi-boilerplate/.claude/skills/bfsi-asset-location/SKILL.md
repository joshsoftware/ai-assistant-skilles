---
name: bfsi-asset-location
description: Determines where a new image, font, icon, or other binary asset belongs in the project (src/assets/ vs public/) and which subfolder. Auto-loads when the user asks to "add a logo", "add a font", "add an image", "where does this asset go", "import an icon", or before writing any image/font file. Pairs with two enforcement gates (PreToolUse hook + pre-commit lint) that block wrong placements.
---

# BFSI Asset Location

Every binary asset imported from React code lives under `src/assets/`. Two gates enforce this; this skill helps you place the file correctly *before* the gates trigger so you don't waste a round-trip on a block message.

## TL;DR

| What you're adding                       | Goes in                              |
| ---------------------------------------- | ------------------------------------ |
| Logo                                     | `src/assets/logo.svg` (overwrite)    |
| Image (raster or illustrative SVG)       | `src/assets/images/`                 |
| Icon SVG (only if not in `lucide-react`) | `src/assets/icons/`                  |
| Self-hosted font (`.woff2`, …)           | `src/assets/fonts/`                  |
| Favicon, robots.txt, manifest.json       | `public/` (NOT `src/assets/`)        |

## Decision rule

- Need to **import the file from React code**? → `src/assets/`
- Need a **fixed URL path** (`/favicon.ico`)? → `public/`

Anything outside `src/` (docs, tests, `.claude/`) is unaffected — the convention only governs assets reachable from the app's import graph.

## Mandatory render path

Import as a URL string, render through `<Image>` ([src/components/common/Image.tsx](../../../src/components/common/Image.tsx)) — it enforces `width` / `height` for CLS prevention and defaults to `loading="lazy"` + `decoding="async"`.

```tsx
import logoUrl from '@/assets/logo.svg';
import { Image } from '@/components/common/Image';

<Image src={logoUrl} alt="[Brand] logo" width={160} height={40} priority />;
```

Use `priority` only for above-the-fold (logo, hero, LCP candidate); omit for everything else so it loads lazily.

## What lucide-react already covers

Before adding any icon SVG to `src/assets/icons/`, check [lucide.dev/icons](https://lucide.dev/icons). `lucide-react` is already a dependency — using `<LogOut />` from there is always preferable to a hand-rolled SVG. Only drop an icon into `src/assets/icons/` when lucide genuinely doesn't have it.

## Enforcement (so you don't have to memorise the rules)

- **PreToolUse hook** — [`.claude/hooks/scripts/asset-location-guard.sh`](../../hooks/scripts/asset-location-guard.sh) blocks Claude from writing image/font files outside `src/assets/`. The block message includes the suggested correct path.
- **Pre-commit lint** — [`.husky/check-asset-location.mjs`](../../../.husky/check-asset-location.mjs) catches manual saves that bypass Claude.

Both gates share the same allowlist. `public/*` is always permitted. Override with `git commit --no-verify` only when the convention genuinely doesn't apply (rare — surface in conversation first).

## Full reference

[`src/assets/README.md`](../../../src/assets/README.md) is the source of truth and covers:

- Subfolder conventions (`images/`, `icons/`, `fonts/`).
- Vite asset hashing behaviour (`<4KB inline as base64`, `≥4KB hashed in dist/assets/`).
- `src/assets/` vs `public/` decision matrix.
- Self-hosted font setup (`@font-face` + `font-display: swap`).
- What does **not** go in `src/assets/` (PII, raw camera output, test fixtures).

## Conventions enforced

- ❌ NEVER place an image / font / icon under `src/<anywhere-else>/`. The two gates will block it.
- ❌ NEVER commit raw camera output — compress first (squoosh.app, ImageOptim).
- ❌ NEVER hand-roll an icon SVG if `lucide-react` has it.
- ❌ NEVER render an image via a bare `<img>` — always go through `<Image>` for CLS prevention.
- ✅ Imports use the `@/assets/...` path alias (matches `tsconfig.json` paths).
- ✅ `priority` is reserved for the LCP candidate; everything else is lazy.
