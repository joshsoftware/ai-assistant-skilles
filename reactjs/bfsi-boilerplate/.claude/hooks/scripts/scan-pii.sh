#!/usr/bin/env bash
# Post-write scan for PII patterns in changed content.
# Non-blocking: this runs after the write has happened. Adds context for Claude.
# Per Claude Code spec, PostToolUse exit 2 shows stderr to Claude (the file is already written).
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Skip non-source files
case "$FILE_PATH" in
  *.test.*|*__tests__*|*fixtures*|*mocks*)
    # Test files are checked elsewhere; the bfsi-pii-scanner agent handles those.
    exit 0
    ;;
  *.md|*.json|*.yaml|*.yml)
    exit 0
    ;;
esac

# PII patterns (intentionally narrow to avoid false positives)
declare -a FINDINGS=()

# console.log with PII variables
if grep -nE 'console\.(log|info|warn|error|debug)\([^)]*\.(pan|aadhaar|account_number|password|cvv|otp|mobile|email)' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — console.* call may include PII")
  done < <(grep -nE 'console\.(log|info|warn|error|debug)\([^)]*\.(pan|aadhaar|account_number|password|cvv|otp|mobile|email)' "$FILE_PATH" | head -5)
fi

# localStorage with PII
if grep -nE 'localStorage\.(setItem|set)\([^)]*\.(pan|aadhaar|account_number|password|token)' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — localStorage write may include PII or auth token")
  done < <(grep -nE 'localStorage\.(setItem|set)\([^)]*\.(pan|aadhaar|account_number|password|token)' "$FILE_PATH" | head -5)
fi

# PAN-shaped literal in source (10 chars: 5 letters, 4 digits, 1 letter)
if grep -nE '"[A-Z]{5}[0-9]{4}[A-Z]"' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — PAN-shaped string literal (use testPan() generator in tests)")
  done < <(grep -nE '"[A-Z]{5}[0-9]{4}[A-Z]"' "$FILE_PATH" | head -5)
fi

# Aadhaar-shaped literal (12 digits as string)
if grep -nE '"[0-9]{12}"' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — 12-digit string literal (could be Aadhaar — use testAadhaar() generator)")
  done < <(grep -nE '"[0-9]{12}"' "$FILE_PATH" | head -5)
fi

# Sentry/telemetry with PII
if grep -nE '(Sentry\.captureMessage|posthog\.capture|analytics\.track)\([^)]*\.(pan|aadhaar|account_number|password)' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — telemetry call may include PII (scrub before send)")
  done < <(grep -nE '(Sentry\.captureMessage|posthog\.capture|analytics\.track)\([^)]*\.(pan|aadhaar|account_number|password)' "$FILE_PATH" | head -5)
fi

if [[ ${#FINDINGS[@]} -gt 0 ]]; then
  # Use JSON output for structured context (per Claude Code spec)
  ADDITIONAL_CONTEXT="[bfsi-pii-scanner] possible PII exposure detected in $FILE_PATH:"
  for f in "${FINDINGS[@]}"; do
    ADDITIONAL_CONTEXT="$ADDITIONAL_CONTEXT
$f"
  done
  ADDITIONAL_CONTEXT="$ADDITIONAL_CONTEXT

Consider:
  - Drop console.* of PII values entirely (no logging path should see them)
  - Replace localStorage with secureStorage from @react-vault/core/storage
  - Replace PAN/Aadhaar literals with testPan() / testAadhaar() generators
  - Run /bfsi-compliance-check before merge"

  # Emit JSON for additionalContext
  jq -n --arg ctx "$ADDITIONAL_CONTEXT" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: $ctx
    }
  }'
fi

exit 0
