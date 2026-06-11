#!/usr/bin/env bash
# SessionStart hook: injects project context for Claude.
# Plain stdout becomes additional context (per Claude Code spec for SessionStart).
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || cd "$(pwd)"

# Branch + recent commits
BRANCH=$(git branch --show-current 2>/dev/null || echo "(not a git repo)")
RECENT=$(git log --oneline -5 2>/dev/null || echo "(no recent commits)")
DIRTY=$(git status --short 2>/dev/null | head -10 || echo "")

cat <<EOF
[bfsi-claude-toolkit] Project context loaded.

Current branch: $BRANCH

Recent commits:
$RECENT

Uncommitted changes:
${DIRTY:-(clean working tree)}

BFSI conventions in effect:
  - Network request/response shapes are TS interfaces (types.ts); Zod validates form input (utils.ts) + env only — responses are NOT runtime-validated
  - All routes use <ProtectedRoute permission=...>
  - PII fields display via <PIIMaskedDisplay>
  - No card data in HTML inputs (use <PCITokenizedCardInput>)
  - Tokens in memory, never localStorage
  - Commits use Conventional Commits with BFSI types (security, compliance)

Available commands: /bfsi-review, /bfsi-scaffold, /bfsi-doctor
Available skills: /bfsi-feature, /bfsi-form, /bfsi-pii-field, /bfsi-api-endpoint,
                  /bfsi-compliance-check, /bfsi-commit

Reference skills auto-load on matching prompts:
  - bfsi-onboarding (how does this project work)
  - bfsi-encrypt-helper (encryption usage)
  - bfsi-test-pattern (test patterns)
  - bfsi-error-message (error handling)

For full toolkit docs: cat packages/claude-toolkit/README.md
EOF
