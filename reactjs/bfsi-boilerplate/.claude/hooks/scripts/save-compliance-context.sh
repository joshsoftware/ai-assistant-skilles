#!/usr/bin/env bash
# PreCompact hook: snapshot critical context before compaction so compliance
# state is preserved in the new context window.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || cd "$(pwd)"

BRANCH=$(git branch --show-current 2>/dev/null || echo "")
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "")
DIRTY=$(git status --short 2>/dev/null | head -10)

# Emit as additionalContext so it survives compaction
CTX="[bfsi-compact-snapshot] State before compaction:

Branch: $BRANCH
Last commit: $LAST_COMMIT
Uncommitted changes:
${DIRTY:-(clean)}

BFSI conventions reminder (in effect for this session):
  - <ProtectedRoute permission=...> for all routes
  - PII via <PIIMaskedDisplay>
  - Zod parse on every API response
  - Conventional Commits with security/compliance types
"

jq -n --arg ctx "$CTX" '{
  hookSpecificOutput: {
    hookEventName: "PreCompact",
    additionalContext: $ctx
  }
}'

exit 0
