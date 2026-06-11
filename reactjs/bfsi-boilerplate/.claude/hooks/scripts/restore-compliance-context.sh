#!/usr/bin/env bash
# PostCompact hook: symmetric to save-compliance-context.sh (PreCompact).
#
# After Claude Code finishes a context compaction, the conventions reminder and
# any open findings from this session are lost from the active context. This
# hook re-injects them via hookSpecificOutput.additionalContext so the post-
# compaction context still carries the BFSI guardrails.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || cd "$(pwd)"

BRANCH=$(git branch --show-current 2>/dev/null || echo "")
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "")
DIRTY=$(git status --short 2>/dev/null | head -10)

# Pull subagent state if present (orchestrator state may have survived disk).
STATE_FILE=".claude/state/subagents.json"
SUBAGENT_SUMMARY=""
if [[ -f "$STATE_FILE" ]]; then
  ACTIVE=$(jq -r '.active | length' "$STATE_FILE" 2>/dev/null || echo "0")
  COMPLETED=$(jq -r '.completed' "$STATE_FILE" 2>/dev/null || echo "0")
  FAILED=$(jq -r '.failed' "$STATE_FILE" 2>/dev/null || echo "0")
  COST=$(jq -r '.total_cost_usd' "$STATE_FILE" 2>/dev/null || echo "0")
  SUBAGENT_SUMMARY="
Subagent activity this session: $COMPLETED completed, $FAILED failed, $ACTIVE active (cost \$$COST)."
fi

CTX="[bfsi-postcompact-restore] Context restored after compaction.

Branch: $BRANCH
Last commit: $LAST_COMMIT
Uncommitted changes:
${DIRTY:-(clean)}
${SUBAGENT_SUMMARY}

BFSI conventions still in effect:
  - Network request/response shapes are TS interfaces (types.ts); Zod validates form input (utils.ts) + env only — responses are NOT runtime-validated
  - All routes use <ProtectedRoute permission=...>
  - PII fields display via <PIIMaskedDisplay>
  - No card data in HTML inputs (planned <PCITokenizedCardInput> in @<scope>/ui v0.2; flag plain card inputs)
  - Tokens in memory only, never localStorage
  - Commits use Conventional Commits with BFSI types (security, compliance)

If you were in the middle of an action when compaction happened, re-state the goal
before continuing — the prior turn's working memory was summarised, not preserved."

jq -n --arg ctx "$CTX" '{
  hookSpecificOutput: {
    hookEventName: "PostCompact",
    additionalContext: $ctx
  }
}'

exit 0
