#!/usr/bin/env bash
# PreToolUse(Write|Edit) hook: enforce src/assets/ as the home for binary
# brand/media assets.
#
# Why: BFSI projects routinely outlive their first re-brand. When images and
# fonts are scattered across feature folders (src/features/<X>/logo.png,
# src/components/bfsi/illustration.jpg), the next re-brand becomes a
# multi-day grep-and-replace. src/assets/ exists to make swap-out trivial.
#
# Rule:
#   - If FILE_PATH ends in an asset extension (.png .jpg .svg .woff2 ...)
#     AND the path is under src/
#     AND the path is NOT under src/assets/
#     → block with exit 2.
#   - Files under public/ are always allowed (Vite serves them at the URL
#     root unmodified; they intentionally bypass asset hashing).
#   - Files outside src/ (e.g. .claude/, docs/, tests/) are allowed.
#
# Exit 2 = block. Exit 0 = allow. Any other exit = soft-fail (allow with stderr).

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Normalise: strip a leading absolute prefix that matches the project dir so
# we compare against repo-relative paths consistently.
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && "$FILE_PATH" == "$CLAUDE_PROJECT_DIR"/* ]]; then
  REL_PATH="${FILE_PATH#"$CLAUDE_PROJECT_DIR"/}"
else
  REL_PATH="$FILE_PATH"
fi

# Asset extensions we steer into src/assets/. Lowercase the candidate so
# we catch .PNG and .Jpg the same as .png / .jpg.
LOWER_PATH="$(printf '%s' "$REL_PATH" | tr '[:upper:]' '[:lower:]')"

case "$LOWER_PATH" in
  # Images
  *.png|*.jpg|*.jpeg|*.gif|*.webp|*.avif|*.svg|*.ico|*.bmp|*.tiff) ;;
  # Fonts
  *.woff|*.woff2|*.ttf|*.otf|*.eot) ;;
  *) exit 0 ;;
esac

# Only enforce inside src/ (the application source tree). Allow assets
# elsewhere (public/, docs/, .claude/, tests/, etc.).
case "$REL_PATH" in
  src/*) ;;
  *) exit 0 ;;
esac

# Allow anything already inside src/assets/.
case "$REL_PATH" in
  src/assets/*) exit 0 ;;
esac

# Suggest the right subfolder based on extension.
case "$LOWER_PATH" in
  *.woff|*.woff2|*.ttf|*.otf|*.eot) SUGGEST="src/assets/fonts/" ;;
  *.svg)                            SUGGEST="src/assets/ (root for logos, src/assets/icons/ for icon sets)" ;;
  *)                                SUGGEST="src/assets/images/" ;;
esac

FILE_NAME="$(basename "$REL_PATH")"
EXT="${LOWER_PATH##*.}"

cat >&2 <<EOF
[bfsi] Blocked: this Write would place a binary asset outside src/assets/.

    path:      $REL_PATH
    extension: .$EXT
    suggested: $SUGGEST$FILE_NAME

The boilerplate's asset convention is that ALL images, fonts, and icons
imported from React code live under src/assets/. This makes re-branding
(common in BFSI white-label work) a single-folder swap instead of a
scattered grep-and-replace. See src/assets/README.md for the rationale
and the public/ vs src/assets/ decision matrix.

If the file is genuinely a public/* asset (favicon, robots.txt, manifest),
write it to public/ at the repo root — that path is allowed by this hook.

If the convention truly does not apply here (e.g. you are deleting a
deprecated path, or this is a test fixture), surface it in the conversation
first and the user can override.
EOF
exit 2
