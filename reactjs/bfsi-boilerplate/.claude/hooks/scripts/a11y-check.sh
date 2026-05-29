#!/usr/bin/env bash
# Async post-write a11y heuristic for .tsx files.
# Runs lightweight pattern checks; the full audit lives in bfsi-accessibility-auditor agent.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

[[ "$FILE_PATH" == *.tsx ]] || exit 0

declare -a FINDINGS=()

# <img> without alt
if grep -nE '<img[^>]*>' "$FILE_PATH" | grep -vE 'alt=' >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — <img> without alt attribute")
  done < <(grep -nE '<img[^>]*>' "$FILE_PATH" | grep -vE 'alt=' | head -3)
fi

# <button> with empty children and no aria-label
if grep -nE '<button[^>]*>[[:space:]]*</button>' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    if ! printf '%s' "$line" | grep -qE 'aria-label='; then
      FINDINGS+=("$line — empty <button> without aria-label")
    fi
  done < <(grep -nE '<button[^>]*>[[:space:]]*</button>' "$FILE_PATH" | head -3)
fi

# <div onClick=...> (should be <button>)
if grep -nE '<div[^>]+onClick=' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    if ! printf '%s' "$line" | grep -qE 'role="button"'; then
      FINDINGS+=("$line — clickable <div> without role='button' (prefer <button>)")
    fi
  done < <(grep -nE '<div[^>]+onClick=' "$FILE_PATH" | head -3)
fi

# outline: none without a focus replacement
if grep -nE 'outline:[[:space:]]*none' "$FILE_PATH" >/dev/null 2>&1; then
  while IFS= read -r line; do
    FINDINGS+=("$line — 'outline: none' removes focus indicator; provide a replacement focus style")
  done < <(grep -nE 'outline:[[:space:]]*none' "$FILE_PATH" | head -3)
fi

if [[ ${#FINDINGS[@]} -gt 0 ]]; then
  CTX="[bfsi-a11y] possible accessibility issues in $(basename "$FILE_PATH"):"
  for f in "${FINDINGS[@]}"; do
    CTX="$CTX
$f"
  done
  CTX="$CTX

Run the bfsi-accessibility-auditor agent for a full WCAG 2.1 AA audit."
  jq -n --arg msg "$CTX" '{
    systemMessage: $msg
  }'
fi

exit 0
