#!/usr/bin/env node
/**
 * lint-staged hook: enforce src/assets/ as the home for binary brand/media
 * assets at commit time. Pair to the PreToolUse hook of the same name —
 * this catches developer manual saves that bypass Claude's tooling.
 *
 * Invocation: lint-staged passes staged file paths matching its glob as
 * CLI args (relative to the repo root). We fail with a non-zero exit if
 * ANY staged asset file lives outside src/assets/.
 *
 * Allowed locations for binary assets:
 *   - src/assets/**     ← canonical home
 *   - public/**         ← Vite passthrough (favicons, robots.txt, manifest)
 *
 * Everything else under src/ is blocked.
 */
import process from 'node:process';
import path from 'node:path';

const ASSET_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico', '.bmp', '.tiff',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
]);

const stagedPaths = process.argv.slice(2);
if (stagedPaths.length === 0) {
  process.exit(0);
}

const offenders = [];

for (const raw of stagedPaths) {
  // lint-staged passes absolute paths on some platforms; normalise to
  // forward-slashed repo-relative.
  const rel = path.relative(process.cwd(), raw).split(path.sep).join('/');

  // Defence in depth: lint-staged's glob already filters to asset extensions,
  // but the script must stay correct if called directly or if the glob drifts.
  const ext = path.extname(rel).toLowerCase();
  if (!ASSET_EXTENSIONS.has(ext)) continue;

  // Only enforce inside src/. Anything outside src/ (public/, docs/, tests/,
  // .claude/, etc.) is allowed regardless of extension.
  if (!rel.startsWith('src/')) continue;
  if (rel.startsWith('src/assets/')) continue;

  offenders.push(rel);
}

if (offenders.length === 0) {
  process.exit(0);
}

const suggestFor = (rel) => {
  const ext = path.extname(rel).toLowerCase();
  const name = path.basename(rel);
  if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
    return `src/assets/fonts/${name}`;
  }
  if (ext === '.svg') {
    return `src/assets/${name}  (or src/assets/icons/${name} for icon sets)`;
  }
  return `src/assets/images/${name}`;
};

const lines = [
  '',
  '[bfsi] Pre-commit blocked: binary asset(s) outside src/assets/.',
  '',
];
for (const rel of offenders) {
  lines.push(`    staged:    ${rel}`);
  lines.push(`    move to:   ${suggestFor(rel)}`);
  lines.push('');
}
lines.push(
  'The boilerplate keeps ALL imported images, fonts, and icons under',
  'src/assets/ so re-brands are a single-folder swap. See src/assets/README.md.',
  '',
  'Fix: git mv the file(s) into src/assets/ and update any imports, then',
  '     re-stage and re-commit. Files genuinely served as-is (favicon, robots.txt,',
  '     manifest.json) belong in public/ — that path is allowed.',
  '',
);
process.stderr.write(lines.join('\n'));
process.exit(1);
