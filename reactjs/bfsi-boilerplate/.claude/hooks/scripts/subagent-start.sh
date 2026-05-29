#!/usr/bin/env bash
# SubagentStart hook: track a spawned subagent.
#
# Writes an entry to .claude/state/subagents.json so:
#  - The orchestrator (and a future status-line segment) can see live count
#  - SubagentStop can pair the completion back to a start time (for duration)
#
# Atomic write via temp-file + mv. Defensive against partial JSON.
set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""')
SUBAGENT_TYPE=$(printf '%s' "$INPUT" | jq -r '.subagent_type // .agent_type // .tool_input.subagent_type // "unknown"')
SUBAGENT_ID=$(printf '%s' "$INPUT" | jq -r '.subagent_id // .tool_use_id // ""')
STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Synthesise an id if Claude Code didn't provide one
if [[ -z "$SUBAGENT_ID" ]]; then
  SUBAGENT_ID="${SESSION_ID}-${STARTED_AT}-${SUBAGENT_TYPE}"
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$PROJECT_DIR/.claude/state"
STATE_FILE="$STATE_DIR/subagents.json"
mkdir -p "$STATE_DIR"

# Initialise if missing
if [[ ! -f "$STATE_FILE" ]]; then
  printf '%s' '{"active":[],"completed":0,"failed":0,"total_cost_usd":0,"session_id":""}' > "$STATE_FILE"
fi

# Append to active[] atomically. If the file is corrupt, reset rather than fail.
TMP=$(mktemp "${STATE_FILE}.XXXXXX")
if ! jq \
  --arg id "$SUBAGENT_ID" \
  --arg type "$SUBAGENT_TYPE" \
  --arg started "$STARTED_AT" \
  --arg session "$SESSION_ID" \
  '.active += [{id: $id, type: $type, started_at: $started}]
   | .session_id = (if .session_id == "" then $session else .session_id end)' \
  "$STATE_FILE" > "$TMP" 2>/dev/null; then
  # File was corrupt; rebuild from this start event
  jq -n \
    --arg id "$SUBAGENT_ID" \
    --arg type "$SUBAGENT_TYPE" \
    --arg started "$STARTED_AT" \
    --arg session "$SESSION_ID" \
    '{active: [{id: $id, type: $type, started_at: $started}], completed: 0, failed: 0, total_cost_usd: 0, session_id: $session}' \
    > "$TMP"
fi
mv "$TMP" "$STATE_FILE"

exit 0
