#!/usr/bin/env bash
# SubagentStop hook: decrement counter, update cost ledger, surface failures.
#
# On failure (non-zero exit_status), emits hookSpecificOutput.additionalContext so
# the orchestrator's next prompt sees which specialist failed. Does NOT block —
# the orchestrator decides whether to retry (currently manual; future:
# bfsi-retry-coordinator agent).
set -euo pipefail

INPUT=$(cat)
SUBAGENT_TYPE=$(printf '%s' "$INPUT" | jq -r '.subagent_type // .agent_type // .tool_input.subagent_type // "unknown"')
SUBAGENT_ID=$(printf '%s' "$INPUT" | jq -r '.subagent_id // .tool_use_id // ""')
EXIT_STATUS=$(printf '%s' "$INPUT" | jq -r '.exit_status // .tool_response.exit_status // 0')
COST=$(printf '%s' "$INPUT" | jq -r '.total_cost_usd // .tool_response.total_cost_usd // 0')
FINISHED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$PROJECT_DIR/.claude/state"
STATE_FILE="$STATE_DIR/subagents.json"
LEDGER_FILE="$STATE_DIR/cost.jsonl"
mkdir -p "$STATE_DIR"

# If no state exists at all, the Start hook didn't fire — initialise minimally.
if [[ ! -f "$STATE_FILE" ]]; then
  printf '%s' '{"active":[],"completed":0,"failed":0,"total_cost_usd":0,"session_id":""}' > "$STATE_FILE"
fi

# Determine success/failure. Exit-status non-zero OR empty agent output both count as failure.
# We can't see the output payload reliably here; only fail on explicit non-zero.
FAILED=0
if [[ "$EXIT_STATUS" != "0" ]] && [[ -n "$EXIT_STATUS" ]]; then
  FAILED=1
fi

# Remove the matching active entry; bump the right counter; accumulate cost.
TMP=$(mktemp "${STATE_FILE}.XXXXXX")
if ! jq \
  --arg id "$SUBAGENT_ID" \
  --arg type "$SUBAGENT_TYPE" \
  --argjson failed "$FAILED" \
  --argjson cost "$COST" \
  '.active = (.active | map(select(.id != $id)))
   | (if $failed == 1 then .failed += 1 else .completed += 1 end)
   | .total_cost_usd = ((.total_cost_usd // 0) + $cost)' \
  "$STATE_FILE" > "$TMP" 2>/dev/null; then
  # Corrupt state — best-effort rebuild
  jq -n \
    --argjson failed "$FAILED" \
    --argjson cost "$COST" \
    '{active: [], completed: (1 - $failed), failed: $failed, total_cost_usd: $cost, session_id: ""}' \
    > "$TMP"
fi
mv "$TMP" "$STATE_FILE"

# Append a cost ledger line (real JSONL — single-line records)
jq -n -c \
  --arg ts "$FINISHED_AT" \
  --arg type "$SUBAGENT_TYPE" \
  --arg id "$SUBAGENT_ID" \
  --argjson exit "$EXIT_STATUS" \
  --argjson cost "$COST" \
  '{timestamp: $ts, subagent_type: $type, subagent_id: $id, exit_status: $exit, cost_usd: $cost}' \
  >> "$LEDGER_FILE"

# On failure, surface to Claude so the orchestrator's next prompt sees it.
if [[ "$FAILED" == "1" ]]; then
  CTX="[bfsi-subagent] failed: $SUBAGENT_TYPE (id=$SUBAGENT_ID, exit=$EXIT_STATUS). Cost so far this session: \$$(jq -r '.total_cost_usd' "$STATE_FILE")."
  CTX="$CTX

The orchestrator should decide whether to retry (single retry recommended for transient failures; surface to user otherwise)."
  jq -n --arg ctx "$CTX" '{
    hookSpecificOutput: {
      hookEventName: "SubagentStop",
      additionalContext: $ctx
    }
  }'
fi

exit 0
