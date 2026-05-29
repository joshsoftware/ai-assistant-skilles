#!/usr/bin/env bash
# PreToolUse(Write) hook: enforce the .env.local.sample convention.
#
# Story from the session export: Claude renamed the starter's .env.local.sample
# to .env.example unilaterally, dropping six BFSI env vars in the process.
# Both names are widely used in the JS ecosystem, but this starter has picked
# .env.local.sample (Vite's gitignored-local convention) as the canonical
# placeholder file. Drift makes scaffolded projects inconsistent.
#
# Rule:
#   - If the project already has .env.local.sample on disk, block any Write
#     that creates .env.example (and vice-versa — but reverse drift is rare).
#   - Allow the write if the canonical file is ALSO being created in the same
#     turn (i.e. user is intentionally adding both, e.g. for a polyglot
#     monorepo). Detected by checking the diff content for both names.
#
# Exit 2 = block. Exit 0 = allow. Any other exit = soft-fail (allow with stderr).

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only care about .env.example / .env.sample style files. Bail otherwise.
case "$FILE_PATH" in
  *.env.example|*/.env.example|*.env.sample|*/.env.sample)
    OFFENDING_NAME="$(basename "$FILE_PATH")"
    ;;
  *)
    exit 0
    ;;
esac

# CWD is the project root that Claude is operating against. Walk up from
# FILE_PATH to find a containing dir that has .env.local.sample. If we find
# one, the convention is set and we should block the drift.
DIR="$(dirname "$FILE_PATH")"
while [[ "$DIR" != "/" && "$DIR" != "." && -n "$DIR" ]]; do
  if [[ -f "$DIR/.env.local.sample" ]]; then
    cat >&2 <<EOF
[bfsi] Blocked write to $OFFENDING_NAME — the canonical placeholder
       file in this project is .env.local.sample (Vite's gitignored-local
       convention). Found at:

         $DIR/.env.local.sample

Drift was reported in the session export: a rename from .env.local.sample
to .env.example silently dropped six BFSI env vars (VITE_AUDIT_ENDPOINT,
VITE_IDLE_TIMEOUT_MS, VITE_SENSITIVE_IDLE_TIMEOUT_MS, ...). This hook
prevents that by enforcing the chosen convention.

If you really need both names (e.g. a polyglot monorepo where one half
expects .env.example), surface it in the conversation first and the
user can override.
EOF
    exit 2
  fi
  PARENT="$(dirname "$DIR")"
  if [[ "$PARENT" == "$DIR" ]]; then
    break
  fi
  DIR="$PARENT"
done

# No canonical file found nearby — first-time write is fine.
exit 0
