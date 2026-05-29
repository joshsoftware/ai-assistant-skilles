#!/usr/bin/env bash
# Blocks 'git push --force' to protected branches (main, master, staging, production, release/*).
# `--force-with-lease` is treated identically — both can rewrite history on the remote.
set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')

PROTECTED='(main|master|staging|production|release/[^[:space:]]+)'

if [[ "$COMMAND" =~ git[[:space:]]+push[[:space:]]+.*--force(-with-lease)?.*[[:space:]]+($PROTECTED)([[:space:]]|$) ]]; then
  cat >&2 <<EOF
[bfsi] Blocked: force push to a protected branch.

    $COMMAND

Force push to main / master / staging / production / release branches is
blocked by bfsi-claude-toolkit. This protects audit trail integrity
(RBI Annexure I §16 + §17 — Audit log maintenance + capture settings;
SOC2 CC7.2). Full text: packages/claude-toolkit/references/rbi-annexure-i.md

If the remote needs rewinding, do it manually via:
  - Git GUI with explicit confirmation
  - Direct shell outside Claude (you'll see the safeguards)
  - Reach out to a tech-lead for approval
EOF
  exit 2
fi

# Allow force push to feature branches
exit 0
