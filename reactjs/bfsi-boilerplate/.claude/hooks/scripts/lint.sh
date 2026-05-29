#!/usr/bin/env bash
# Async post-write ESLint --fix on the changed file. Non-blocking on errors.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    ;;
  *)
    exit 0
    ;;
esac

ROOT="$(dirname "$FILE_PATH")"
while [[ "$ROOT" != "/" ]] && [[ ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done

if [[ ! -f "$ROOT/package.json" ]] || [[ ! -f "$ROOT/.eslintrc.cjs" && ! -f "$ROOT/.eslintrc.js" && ! -f "$ROOT/.eslintrc.json" && ! -f "$ROOT/eslint.config.js" ]]; then
  exit 0
fi

if command -v pnpm >/dev/null 2>&1; then
  cd "$ROOT" && OUTPUT=$(pnpm exec eslint --fix "$FILE_PATH" 2>&1 || true)
elif command -v npx >/dev/null 2>&1; then
  cd "$ROOT" && OUTPUT=$(npx eslint --fix "$FILE_PATH" 2>&1 || true)
else
  exit 0
fi

# If ESLint had unfixable errors, surface a summary to Claude on next turn
if printf '%s' "$OUTPUT" | grep -qE 'error|problem'; then
  SUMMARY=$(printf '%s' "$OUTPUT" | tail -10)
  jq -n --arg msg "$SUMMARY" --arg file "$(basename "$FILE_PATH")" '{
    systemMessage: ("[bfsi] lint issues in " + $file + ":\n" + $msg)
  }'
fi

exit 0
