#!/usr/bin/env bash
# Post-turn verification: run async after Claude stops. Reports unflushed concerns.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || cd "$(pwd)"

# Only run if there are source-file changes
if ! git diff --quiet 2>/dev/null; then
  HAS_CHANGES=1
else
  HAS_CHANGES=0
fi

# Skip if no changes
[[ "$HAS_CHANGES" == "1" ]] || exit 0

declare -a CONCERNS=()

# 1. Typecheck (quick check)
if [[ -f "package.json" ]] && grep -q '"typecheck"' package.json 2>/dev/null; then
  if ! pnpm exec tsc --noEmit 2>/dev/null; then
    CONCERNS+=("typecheck failing — run \`pnpm typecheck\` to see errors")
  fi
fi

# 2. Quick secret scan over uncommitted changes
if git diff 2>/dev/null | grep -qE 'AKIA[0-9A-Z]{16}|sk-(live|test)_[A-Za-z0-9]{20,}|-----BEGIN.*PRIVATE KEY'; then
  CONCERNS+=("uncommitted changes contain what looks like a secret — review with /bfsi-compliance-check")
fi

# 3. Quick PII shape scan
if git diff 2>/dev/null | grep -qE '"[A-Z]{5}[0-9]{4}[A-Z]"|"[0-9]{12}"'; then
  CONCERNS+=("uncommitted changes contain PAN/Aadhaar-shaped literals — use test generators")
fi

if [[ ${#CONCERNS[@]} -eq 0 ]]; then
  exit 0
fi

MSG="[bfsi] post-turn verification surfaced concerns:"
for c in "${CONCERNS[@]}"; do
  MSG="$MSG
  - $c"
done

jq -n --arg msg "$MSG" '{
  systemMessage: $msg
}'

exit 0
