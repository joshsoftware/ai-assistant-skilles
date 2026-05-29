#!/usr/bin/env bash
# Blocks edits to files that should never be modified by Claude:
#   .env*, *.pem, *.key, credentials.json, secrets.json, .git/*
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

PROTECTED_PATTERNS=(
  '\.env(\..*)?$'         # .env, .env.local, .env.production
  '\.pem$'
  '\.key$'
  'credentials\.json$'
  'secrets\.json$'
  '\.git/'
  '/\.husky/'
  '\.npmrc$'              # contains registry tokens
  'id_rsa'
  'id_ed25519'
  '\.p12$'
  '\.pfx$'
)

# Allow .env.local.sample / .env.example explicitly (placeholders, not secrets)
if [[ "$FILE_PATH" =~ \.env\.(local\.)?(sample|example)$ ]]; then
  exit 0
fi

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" =~ $pattern ]]; then
    cat >&2 <<EOF
[bfsi] Blocked edit to protected file:

    $FILE_PATH

This file matches a protected pattern. bfsi-claude-toolkit prevents
Claude from editing secrets, keys, and git internals to avoid accidental
leaks and history corruption.

If this edit is intentional:
  - For .env: edit manually outside Claude, then commit only the .sample
  - For .git/*: use git commands instead of file edits
  - For keys: rotate at the source, never edit in-place
EOF
    exit 2
  fi
done

exit 0
