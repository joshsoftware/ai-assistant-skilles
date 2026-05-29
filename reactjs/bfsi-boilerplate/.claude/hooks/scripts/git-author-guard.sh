#!/usr/bin/env bash
# PostToolUse(Bash) hook: after a git commit, verify the recorded author and
# committer match the repo's configured identity.
#
# Story from the session export: the user restated "commits must be authored by
# <my identity>" 5+ times because stray --author flags, env vars, or a wrong
# per-repo user.email kept producing commits under the wrong address — twice
# requiring a history rewrite. PostToolUse fires AFTER the commit, so this can't
# prevent it, but it surfaces the mismatch immediately (exit 2 feeds stderr back
# to Claude as context) so the commit can be amended BEFORE it's pushed.
#
# It checks author == committer == `git config user.email`. That catches:
#   - git commit --author="Someone Else <other@x>"
#   - GIT_AUTHOR_EMAIL / GIT_COMMITTER_EMAIL env overrides
#   - a per-repo user.email that drifted from what you expect
# It does NOT hardcode any specific address — the toolkit ships to many teams,
# so "matches this repo's configured identity" is the portable invariant. If
# your org mandates one specific address, set it in the repo's git config and
# this hook keeps every commit honest to it.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')
[[ -z "$COMMAND" ]] && exit 0

# Only act when the command actually committed. Match `git commit` in any
# form (git -c ... commit, git commit -m, etc.) but not `git commit --dry-run`.
if ! [[ "$COMMAND" =~ git([[:space:]]+-[^[:space:]]+)*[[:space:]]+commit ]]; then
  exit 0
fi
[[ "$COMMAND" == *"--dry-run"* ]] && exit 0

# Run in the directory the command ran in, if provided.
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""')
if [[ -n "$CWD" && -d "$CWD" ]]; then
  cd "$CWD" 2>/dev/null || true
fi

# Inside a git repo?
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

EXPECTED=$(git config user.email 2>/dev/null || echo "")
AUTHOR=$(git log -1 --format='%ae' 2>/dev/null || echo "")
COMMITTER=$(git log -1 --format='%ce' 2>/dev/null || echo "")

# Can't determine identity (no config, no commits yet) → fail open.
[[ -z "$EXPECTED" || -z "$AUTHOR" ]] && exit 0

if [[ "$AUTHOR" != "$EXPECTED" || "$COMMITTER" != "$EXPECTED" ]]; then
  SUBJECT=$(git log -1 --format='%s' 2>/dev/null || echo "")
  {
    echo "[bfsi] Commit author/committer does NOT match the configured identity."
    echo
    echo "    Configured (git config user.email): $EXPECTED"
    echo "    Commit author  (%ae):               ${AUTHOR:-<none>}"
    echo "    Commit committer (%ce):             ${COMMITTER:-<none>}"
    echo "    Commit:                             ${SUBJECT}"
    echo
    echo "This commit was just created under the wrong email. Before pushing,"
    echo "fix it:"
    echo
    echo "    git commit --amend --reset-author --no-edit"
    echo
    echo "If the configured identity itself is wrong:"
    echo "    git config user.email <correct@email>"
    echo "    git config user.name  \"Correct Name\""
    echo "    git commit --amend --reset-author --no-edit"
    echo
    echo "Do NOT push until %ae and %ce both read $EXPECTED."
  } >&2
  exit 2
fi

exit 0
