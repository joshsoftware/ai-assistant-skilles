# `src/assets/`

Brand assets, fonts, icons, and any other static binaries that the app **imports**. Anything that gets a URL but isn't imported (favicons, robots.txt, manifest.json) belongs in `public/` at the repo root, not here.

> **Working with Claude Code?** The [`bfsi-asset-location`](../../.claude/skills/bfsi-asset-location/SKILL.md) skill auto-loads when you ask about adding a logo / font / image. It points to this README as the source of truth and provides the quick decision rules. This file remains the canonical convention for human readers and the two enforcement gates.

## Folder convention

```
src/assets/
├── README.md           ← this file
├── logo.svg            ← brand mark (replace per project — currently a placeholder)
├── images/             ← raster + vector images (PNG, JPG, SVG, WebP)
├── icons/              ← SVG icons NOT covered by lucide-react
└── fonts/              ← self-hosted font files (.woff2)
```

Create subfolders only when you need them — don't pre-create empty directories.

## How Vite handles imports here

Vite hashes assets you import for cache busting. The default split:

| Size              | Where it ends up                                              |
| ----------------- | ------------------------------------------------------------- |
| Under 4 KB        | Inlined as base64 in the importing module (default threshold). |
| 4 KB and above    | Emitted as a separate file in `dist/assets/<name>.<hash>.<ext>`. |

You'll usually import as a URL string and pass it to `<Image src={…}>`:

```tsx
import logoUrl from '@/assets/logo.svg';
import { Image } from '@/components/common/Image';

<Image src={logoUrl} alt="[Brand] logo" width={160} height={40} priority />;
```

For SVG that needs styling props (currentColor, dynamic sizing), import as a React component using `vite-plugin-svgr` (add to `vite.config.ts` when the need arises — not pre-installed).

## When to use `src/assets/` vs `public/`

| You want to…                                       | Use            |
| -------------------------------------------------- | -------------- |
| Import + reference from a component                | `src/assets/` |
| Reference by absolute URL (`/favicon.ico`)         | `public/`     |
| Serve a file that must keep its exact filename     | `public/`     |
| Get cache-busting hashes automatically             | `src/assets/` |
| Let unused files be tree-shaken out of the bundle  | `src/assets/` |

## Fonts

The design system standardises on **Inter** (per [bfsi-design-system](../../.claude/skills/bfsi-design-system/SKILL.md)). Two ways to load it:

1. **System font stack with web-font fallback** (current default — see `index.html` / `globals.css`). Lowest performance cost.
2. **Self-host `.woff2` here** when you need offline support or to avoid third-party CDN dependencies. Drop the files in `fonts/`, declare with `@font-face` in `globals.css`, and add `font-display: swap`.

## Images

- **Always go through `<Image>`** ([src/components/common/Image.tsx](../components/common/Image.tsx)) — enforces `width`/`height` for CLS prevention and defaults to `loading="lazy"`.
- **Prefer SVG** for icons and logos (small, sharp at any DPR).
- **Prefer WebP/AVIF** for photographic content; ship a PNG/JPG fallback if you target very old browsers.
- **Never commit raw camera output.** Run images through a compressor (squoosh.app, ImageOptim) before adding.

## Enforcement (not honour-system)

Two gates keep this convention from drifting:

1. **PreToolUse hook** — [`.claude/hooks/scripts/asset-location-guard.sh`](../../.claude/hooks/scripts/asset-location-guard.sh) blocks Claude from writing any image / font / icon file (`.png .jpg .jpeg .gif .webp .avif .svg .ico .bmp .tiff .woff .woff2 .ttf .otf .eot`) anywhere under `src/` other than `src/assets/`. The error message includes the suggested correct path. Files in `public/` are always allowed.
2. **Pre-commit hook** — [`lint-staged`](../../package.json) runs [`.husky/check-asset-location.mjs`](../../.husky/check-asset-location.mjs) on staged files with the same extensions. A developer who saves an asset manually via VS Code (bypassing Claude) gets caught at `git commit`.

Both gates have the same allowlist and same suggestion logic. Override the PreToolUse hook by surfacing the case in conversation; override the pre-commit hook by `git commit --no-verify` (don't make a habit of it).

## What does NOT go here

- **No PII or test fixtures.** Real account statements, KYC scans, redacted screenshots — none of these belong in source control. Store them outside the repo.
- **No "in case we need it" placeholders.** Per [CLAUDE.md](../../CLAUDE.md) discipline #5 — lean and current. Add an asset when the feature using it lands.
- **No build artefacts.** `.gitignore` should already cover this.
