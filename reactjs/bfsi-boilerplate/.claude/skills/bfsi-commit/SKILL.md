---
name: bfsi-commit
description: Generates a Conventional Commits message from the current staged diff. Uses BFSI-extended types (feat, fix, security, compliance, docs, perf, refactor, test, ci, chore). Use when the user types /bfsi-commit, asks to "write a commit message", "commit my changes", or "generate a commit".
disable-model-invocation: true
allowed-tools: Read Grep Bash(git status:*) Bash(git diff:*) Bash(git log:*)
---

# BFSI Commit Message

Generates a Conventional Commits message with BFSI-extended types so reviewers can grep the log for security/compliance commits.

## Workflow

### Step 1: Inspect staged changes

```bash
git status --short
git diff --cached
git log --oneline -5
```

If there are no staged changes, ask the user to stage first.

### Step 2: Pick a type

Use the most-specific applicable type. BFSI-extended set:

| Type         | When                                                    |
| ------------ | ------------------------------------------------------- |
| `feat`       | new feature/capability                                  |
| `fix`        | bug fix                                                 |
| `security`   | security-related change (CSP, headers, auth tightening) |
| `compliance` | regulatory/compliance change (RBI/PCI/IRDAI/SOC2 item)  |
| `perf`       | performance improvement                                 |
| `refactor`   | code restructure, no behaviour change                   |
| `docs`       | docs only                                               |
| `style`      | formatting only                                         |
| `test`       | tests only                                              |
| `build`      | build system, deps                                      |
| `ci`         | CI configuration                                        |
| `chore`      | maintenance                                             |
| `revert`     | reverting prior commit                                  |

`security` and `compliance` are BFSI-extensions. Use them whenever applicable so compliance reviewers can grep `git log --grep="^security:"` or `git log --grep="^compliance:"` to find every relevant commit quickly.

### Step 3: Pick a scope (optional)

The feature or area: `kyc`, `transactions`, `auth`, `ui`, `core`, etc.

### Step 4: Write subject

- Imperative mood ("add", not "added" or "adds")
- ≤ 50 chars
- Lowercase first word (after type/scope)
- No trailing period

### Step 5: Write body (if WHY is non-obvious)

- Wrap at ~72 chars
- Focus on WHY not WHAT (diff already shows WHAT)
- For `security` or `compliance` types, the body should reference the regulation/control using canonical numbering (e.g. "addresses RBI Annexure I §8 — User Access Control"; verifiable text in `packages/claude-toolkit/references/rbi-annexure-i.md`)
- Reference issue / Jira ticket if applicable

### Step 6: Output

Print the message in a code block. Do NOT run `git commit` automatically — let the user copy or invoke it manually.

## Examples

```
feat(kyc): add PAN+Aadhaar e-KYC submission flow

Implements the customer-facing e-KYC submission per
section 5 of the KYC redesign spec. Adds PIIMaskedDisplay
on Aadhaar in confirmation step.
```

```
security(auth): tighten session idle timeout to 5min on transaction routes

Addresses RBI Annexure I §6.4 (session management
under ASLC) and §8 (User Access Control) — sensitive
transaction flows must auto-logout after ≤ 5min idle.
Adds idleTimeout prop to <ProtectedRoute scope="transaction">.
Non-transaction routes remain at 15min.
```

## Conventions reinforced

- Subject ≤ 50 chars. Body lines ≤ 72.
- Body present only when WHY isn't obvious from subject + diff.
- For `security` / `compliance` types, body MUST include the regulation reference.
- Never include the actual content of secrets, PII, or sensitive data in the message.
