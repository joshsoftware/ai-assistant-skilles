#!/bin/bash
#
# setup_architecture.sh
#
# Generates the COMPLETE BFSI React boilerplate for a project created by
# create_react_project.sh. It drives Claude Code headlessly and invokes the
# `bfsi-bootstrap` skill, which builds the full foundation from scratch
# (dependencies via npm, config, folder structure, http/pii/i18n primitives,
# routing, layouts, and the login reference feature) WITHOUT scaffolding
# business features — feature generation stays with `/bfsi-feature`.
#
# This mirrors the Flutter flow's "Initialize this project" step
# (project-bootstrap skill), automated as a one-shot script. Uses npm.
#
# Usage:
#   ./setup_architecture.sh [project_dir] [--scope @your-org]
#
# Defaults:
#   project_dir   .                (current directory)
#   --scope       derived from package.json name
#
# Env overrides:
#   CLAUDE_MODEL  model to use     (passed to `claude --model`)
#

set -euo pipefail

PROJECT_DIR="."
SCOPE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --scope) SCOPE="$2"; shift 2 ;;
        --scope=*) SCOPE="${1#*=}"; shift ;;
        -*) echo "Unknown flag: $1"; exit 1 ;;
        *) PROJECT_DIR="$1"; shift ;;
    esac
done

# ---- validation ------------------------------------------------------------

command -v claude >/dev/null 2>&1 || {
    echo "Error: the 'claude' CLI is required (https://code.claude.com)."
    exit 1
}

if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "Error: no package.json in '$PROJECT_DIR' — is this a project created by create_react_project.sh?"
    exit 1
fi

if [ ! -d "$PROJECT_DIR/.claude/skills/bfsi-bootstrap" ]; then
    echo "Error: the bfsi-bootstrap skill is missing under '$PROJECT_DIR/.claude/skills'."
    echo "       Re-run create_react_project.sh with the 'claude' tool."
    exit 1
fi

PROJECT_NAME="$(PKG_JSON="$PROJECT_DIR/package.json" node -e '
console.log(JSON.parse(require("fs").readFileSync(process.env.PKG_JSON,"utf8")).name)')"

# ---- build the prompt ------------------------------------------------------

PROMPT="Use the bfsi-bootstrap skill to generate the complete BFSI boilerplate foundation for this project."
PROMPT="$PROMPT The project name is '$PROJECT_NAME'."
if [ -n "$SCOPE" ]; then
    PROMPT="$PROMPT Use the npm scope '$SCOPE'."
fi
PROMPT="$PROMPT Use npm (not pnpm). Build the foundation and the login reference feature only — do not scaffold business features."

MODEL_ARGS=()
[ -n "${CLAUDE_MODEL:-}" ] && MODEL_ARGS=(--model "$CLAUDE_MODEL")

# ---- run -------------------------------------------------------------------

echo "→ Running bfsi-bootstrap skill for '$PROJECT_NAME' via Claude..."
echo ""

(
    cd "$PROJECT_DIR"
    claude -p "$PROMPT" --permission-mode acceptEdits "${MODEL_ARGS[@]}"
)

echo ""
echo "✓ Architecture setup complete."
echo "  Next: scaffold your first feature with  /bfsi-feature <FeatureName>"
