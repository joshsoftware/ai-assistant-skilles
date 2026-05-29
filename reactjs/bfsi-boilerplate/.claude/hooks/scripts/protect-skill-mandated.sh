#!/usr/bin/env bash
# PreToolUse(Bash) hook: block deletion of files that BFSI skills mandate.
#
# Story from the session export: Claude ran `git rm` on a file the
# axios-auth skill explicitly mandates exists (an interceptor at the
# canonical path). The deletion was wrapped in a "skill-mandated file
# dropped" report AFTER the fact, but the user's hard rule was "ask
# before deleting any skill-mandated file." This hook turns the rule
# into enforcement.
#
# We only intercept Bash commands matching deletion patterns:
#   rm <path>           rm -f / -rf / -fr <path>
#   git rm <path>       git rm -f / -r <path>
#   mv <mandated> ...   (renaming away counts as deletion of the canonical name)
#
# Edit/Write that overwrites a mandated file with empty content is harder
# to detect from tool input alone and intentionally NOT covered here.
# That class is partially covered by the protect-files hook for env/secrets.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Bail unless the command starts with (or contains, piped) rm / git rm / mv.
# Keep the pattern tight to avoid false positives on `npm` / `vim` / `term`
# substrings, etc.
if ! [[ "$COMMAND" =~ (^|[[:space:];&|])(rm[[:space:]]|git[[:space:]]+rm[[:space:]]|mv[[:space:]]) ]]; then
  exit 0
fi

# Files BFSI skills mandate. Each entry pairs a path glob with the skill
# name so the block message can point the user at the skill's rationale.
# Sub-strings are matched (so `src/api/axiosInstance.ts` matches whether
# the user typed an absolute path or a relative one).
MANDATED=(
  "src/api/axiosInstance.ts:axios-auth"
  "src/api/http.ts:axios-auth"
  "src/api/queryClient.ts:query-client-setup"
  "src/routes/ProtectedRoute.tsx:bfsi-protected-route"
  "src/i18n/i18n.ts:bfsi-i18n-key"
  "src/env.ts:env validation"
  "src/main.tsx:app entry"
  "src/app/App.tsx:app shell"
  "src/shared/ErrorBoundary.tsx:bfsi-error-message"
)

for entry in "${MANDATED[@]}"; do
  path="${entry%%:*}"
  skill="${entry#*:}"
  if [[ "$COMMAND" == *"$path"* ]]; then
    cat >&2 <<EOF
[bfsi] Blocked: this command appears to delete or rename a skill-mandated file:

    $COMMAND

Match: $path  (mandated by $skill)

The BFSI skills assume this file is present at the canonical path. The
session export turned up a case where Claude deleted a skill-mandated
interceptor file as an "optimisation" and broke the axios-auth contract.

If the deletion really is intentional:
  1. Surface the change in conversation FIRST — explain why the skill's
     mandate no longer applies (e.g. the file is being replaced by an
     equivalent in a different location, with the skill updated to match).
  2. Get explicit user approval.
  3. Run the deletion outside the hook (move outside the watched path, or
     temporarily disable this hook with an explicit user-approved override).

This hook does NOT block edits to the file — only deletion or rename.
EOF
    exit 2
  fi
done

exit 0
