---
name: bfsi-review
description: Run the full BFSI PR review pipeline — spawns security, code, a11y, PII, and performance reviewers in parallel and synthesises their findings into a merge recommendation.
argument-hint: [diff-range or --pr <num>]
---

# /bfsi-review

You are running a full BFSI PR review. Delegate to the `bfsi-pr-reviewer` agent which orchestrates the specialist agents in parallel.

## Workflow

1. **Establish scope.**

   If the user provided `$ARGUMENTS`:
   - `--pr <num>` → use `gh pr diff <num>` for the scope
   - A branch name or git revspec → use `git diff <revspec>...HEAD`
   - File globs → review just those files
   - Empty → default to `git diff origin/main...HEAD`

2. **Verify we're in a project with the toolkit enabled.**

   Check `.claude/settings.json` for the plugin reference. If missing, tell the user to run from a scaffolded BFSI project root.

3. **Delegate to the orchestrator.**

   Spawn the `bfsi-pr-reviewer` agent with the determined scope. The orchestrator handles all parallel coordination of specialists.

4. **Surface the orchestrator's output to the user verbatim.**

   Don't re-summarise. The orchestrator's output is the final review.

5. **End with a recommendation.**

   The orchestrator's report ends with one of:
   - ✅ APPROVED
   - ⚠️ MERGEABLE WITH FOLLOW-UP
   - ❌ NOT MERGE-READY

   If NOT MERGE-READY, suggest the most relevant skill or agent to address the first critical finding (e.g., "Run `/bfsi-commit` after fixing", or "Use `bfsi-protected-route` skill to add the missing guard").

## Notes

- The pipeline is read-only — no fixes applied.
- Each specialist may take 30s–2min; the orchestrator runs them in parallel so total time is ≈ the slowest one.
- The orchestrator de-duplicates findings across specialists, so the synthesis is concise.
