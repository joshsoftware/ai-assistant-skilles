#!/usr/bin/env bash
# PreToolUse(Write|Edit) hook: block imports of symbols that don't exist in
# the workspace packages (@<scope>/core, @<scope>/ui).
#
# Story from the session export: Claude planned an entire phase around a
# `useAuditedMutation` hook that @react-vault/core never exported, and a skill
# itself referenced a `useFormWithZod` import that @react-vault/ui never had.
# The bfsi-no-fabrication skill teaches the habit; this hook is the mechanical
# net that catches it at Write/Edit time.
#
# Design: FAIL OPEN. We only block when we are CONFIDENT a named import is
# missing — i.e. we resolved the package on disk AND the symbol appears in
# zero of its declaration files. Any resolution uncertainty (package not in
# node_modules, no .d.ts/.ts found, multiline import we can't parse) → allow.
# A false block here would be infuriating, so the bar for blocking is high.
#
# Heuristic for "exists": the symbol is exported SOMEWHERE in the package
# (root or any sub-module). This tolerates sub-path confusion (importing from
# the wrong sub-path is a different, cheaper mistake) while still catching a
# symbol that exists nowhere — which is the fabrication signature.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')
# Write puts the body in .content; Edit puts the new text in .new_string.
CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // ""')

[[ -z "$CONTENT" || -z "$FILE_PATH" ]] && exit 0

case "$FILE_PATH" in
  *.ts | *.tsx | *.js | *.jsx | *.mts | *.cts) ;;
  *) exit 0 ;;
esac

# Find the nearest node_modules walking up from the file's directory.
find_node_modules() {
  local dir="$1"
  while [[ "$dir" != "/" && -n "$dir" ]]; do
    if [[ -d "$dir/node_modules" ]]; then
      printf '%s' "$dir/node_modules"
      return 0
    fi
    local parent
    parent="$(dirname "$dir")"
    [[ "$parent" == "$dir" ]] && break
    dir="$parent"
  done
  return 1
}

NODE_MODULES="$(find_node_modules "$(dirname "$FILE_PATH")" || true)"
[[ -z "$NODE_MODULES" ]] && exit 0 # can't resolve packages → fail open

MISSING=()

# Pull out single-line named imports from @<scope>/(core|ui)(/sub)? specifiers.
# Multiline imports are skipped (fail open) — they're rarer and harder to parse.
while IFS= read -r line; do
  # Match: import [type] { ... } from '@scope/core' | "@scope/ui/sub"
  if [[ "$line" =~ import[[:space:]].*\{([^}]*)\}[[:space:]]*from[[:space:]]*[\'\"](@[A-Za-z0-9_-]+/(core|ui)(/[A-Za-z0-9_/-]+)?)[\'\"] ]]; then
    BRACE="${BASH_REMATCH[1]}"
    SPEC="${BASH_REMATCH[2]}"        # e.g. @/lib/http
    SCOPE_PKG="${SPEC%%/*}"          # @react-vault
    REST="${SPEC#*/}"               # core/http  OR  core
    PKG_NAME="${REST%%/*}"          # core | ui
    PKG_DIR="$NODE_MODULES/$SCOPE_PKG/$PKG_NAME"

    # Resolve symlinks (pnpm link: / workspace).
    [[ -e "$PKG_DIR" ]] || continue          # package not installed → skip
    PKG_DIR="$(cd "$PKG_DIR" 2>/dev/null && pwd -P || printf '%s' "$PKG_DIR")"

    # Build the set of declaration files to search: dist *.d.ts, else src *.ts.
    mapfile -t DECL < <(find "$PKG_DIR" -path '*/node_modules' -prune -o \
      \( -name '*.d.ts' -o -name '*.ts' \) -print 2>/dev/null)
    [[ ${#DECL[@]} -eq 0 ]] && continue       # nothing to search → skip

    # Parse the brace list into original export names.
    IFS=',' read -ra PARTS <<<"$BRACE"
    for raw in "${PARTS[@]}"; do
      sym="$(printf '%s' "$raw" | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//')"
      [[ -z "$sym" ]] && continue
      sym="${sym#type }"                       # drop `type ` prefix
      sym="${sym%% as *}"                       # keep left of ` as `
      sym="$(printf '%s' "$sym" | sed -E 's/[[:space:]]//g')"
      [[ "$sym" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
      # Is it exported anywhere in the package?
      if ! grep -REqs "\bexport\b.*\b${sym}\b|\bas[[:space:]]+${sym}\b" "${DECL[@]}"; then
        MISSING+=("$sym  (from $SPEC)")
      fi
    done
  fi
done <<<"$CONTENT"

if [[ ${#MISSING[@]} -gt 0 ]]; then
  {
    echo "[bfsi] Blocked: import(s) of symbol(s) not found in the target package:"
    echo
    for m in "${MISSING[@]}"; do echo "    $m"; done
    echo
    echo "These symbols are not exported anywhere in the resolved package. This"
    echo "is the fabrication signature (cf. useAuditedMutation / useFormWithZod"
    echo "from the session export)."
    echo
    echo "Before importing, confirm the symbol exists (the bfsi-no-fabrication"
    echo "skill has the verification loop):"
    echo "    grep -rn \"export .*<Symbol>\" node_modules/<scope>/<pkg>/  # or packages/<pkg>/src/"
    echo
    echo "If it genuinely doesn't exist, find the real equivalent or build it —"
    echo "don't import a name that isn't there."
  } >&2
  exit 2
fi

exit 0
