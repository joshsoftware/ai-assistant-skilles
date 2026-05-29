#!/usr/bin/env bash
# Async post-write Prettier on the changed file. Best-effort: silent on success,
# logs to stderr on failure (non-blocking, since async).
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Only run on files Prettier can handle
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.yml|*.yaml|*.css|*.scss|*.html)
    ;;
  *)
    exit 0
    ;;
esac

# Resolve project root (closest package.json with prettier)
ROOT="$(dirname "$FILE_PATH")"
while [[ "$ROOT" != "/" ]] && [[ ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done

if [[ ! -f "$ROOT/package.json" ]]; then
  exit 0
fi

# Use the project's prettier if available
if command -v pnpm >/dev/null 2>&1; then
  cd "$ROOT" && pnpm exec prettier --write "$FILE_PATH" 2>&1 | tail -5 >&2 || true
elif command -v npx >/dev/null 2>&1; then
  cd "$ROOT" && npx prettier --write "$FILE_PATH" 2>&1 | tail -5 >&2 || true
fi

# Inform Claude on next turn that format ran
jq -n --arg file "$(basename "$FILE_PATH")" '{
  systemMessage: ("[bfsi] formatted " + $file)
}'
