#!/usr/bin/env bash
# Blocks destructive `rm -rf` invocations.
# Allows `rm -rf node_modules`, `rm -rf dist`, `rm -rf .turbo`, `rm -rf coverage` — known build artefacts.
# Per Claude Code spec: exit 2 to block; stderr surfaces to Claude.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')

# Allowed targets (build artefacts only)
ALLOWED='^rm -rf (\./)?(node_modules|dist|build|coverage|\.turbo|\.next|out|playwright-report|\.cache|\.scratch)(/?$| )'

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

if [[ "$COMMAND" =~ $ALLOWED ]]; then
  exit 0
fi

if [[ "$COMMAND" =~ rm[[:space:]]+-rf ]]; then
  cat >&2 <<EOF
[bfsi] Blocked destructive shell command:

    $COMMAND

The bfsi-claude-toolkit blocks 'rm -rf' except for known build artefacts
(node_modules, dist, build, coverage, .turbo, .next).

If you need to remove other files:
  - Use 'rm' (not 'rm -rf') for single files
  - Use 'rm -r' (no -f) so errors surface
  - For directories: pass --force per-call with explicit consent

If you genuinely need 'rm -rf <other-path>', edit the file manually outside Claude.
EOF
  exit 2
fi

exit 0
