#!/usr/bin/env bash
# Pre-write scan: rejects content containing obvious secret patterns.
# Allows the write if no patterns match. Per Claude Code spec, exit 2 blocks.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')

# For Write, scan the full new content. For Edit, scan the new_string.
if [[ "$TOOL" == "Write" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // ""')
elif [[ "$TOOL" == "Edit" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // ""')
else
  exit 0
fi

# Skip if writing to a .env.sample / placeholder file (those are OK)
if [[ "$FILE_PATH" =~ \.env\.(local\.)?(sample|example)$ ]] || [[ "$FILE_PATH" =~ /docs/ ]]; then
  exit 0
fi

# Patterns that look like secrets (regex per line is too slow; do substring lookups)
SECRET_PATTERNS=(
  'AKIA[0-9A-Z]{16}'                                    # AWS access key ID
  'aws_secret_access_key'                                # AWS in env-style
  'sk-(live|test)_[A-Za-z0-9]{20,}'                     # Stripe-style
  'sk-ant-[A-Za-z0-9_-]{32,}'                           # Anthropic
  'xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+'                     # Slack bot token
  'ghp_[A-Za-z0-9]{36}'                                 # GitHub personal access token
  'ghs_[A-Za-z0-9]{36}'                                 # GitHub server-to-server
  'github_pat_[A-Za-z0-9_]{82}'                         # GitHub fine-grained
  '-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY' # PEM keys
  'AIza[0-9A-Za-z_-]{35}'                               # Google API key
  'glpat-[0-9A-Za-z_-]{20}'                             # GitLab PAT
  'rzp_(live|test)_[A-Za-z0-9]+'                        # Razorpay
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if printf '%s' "$CONTENT" | grep -qE "$pattern"; then
    # Show the first 12 chars of the match for context (not the full secret)
    MATCH=$(printf '%s' "$CONTENT" | grep -oE "$pattern" | head -1 | cut -c1-12)
    cat >&2 <<EOF
[bfsi] Blocked: write contains what looks like a secret.

    File: $FILE_PATH
    Pattern: $pattern
    Found (truncated): ${MATCH}...

bfsi-claude-toolkit blocks writes that contain obvious secret patterns
to prevent accidental commits of credentials.

If this is a false positive:
  - For tests: use clearly-fake values (sk-test-FAKE, AKIAFAKE0000000)
  - For docs: wrap the example in a code block tagged as example

If it's a real secret:
  - Rotate immediately at the source
  - Move to an environment variable (.env.local, gitignored)
  - Add only the .sample with a placeholder
EOF
    exit 2
  fi
done

exit 0
