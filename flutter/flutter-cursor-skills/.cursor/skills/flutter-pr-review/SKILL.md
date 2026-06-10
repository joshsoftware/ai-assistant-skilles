---
name: flutter-pr-review
description: Reviews Flutter pull requests for architecture, state management, performance, async/lifecycle, null safety, localization, accessibility, security, tests, and dependencies. Classifies findings as Critical, Major, or Minor and outputs a structured PR summary. Use when reviewing a Flutter PR, diff, or branch; when the user asks for a Flutter code review, PR review, or mentions the Flutter PR Reviewer checklist.
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git diff:*) Bash(git log:*)
---

# Flutter PR Review

Review Flutter changes for code quality, maintainability, performance, architecture compliance, security, and test coverage.

## Before reviewing

1. Read [reference.md](reference.md) for the full verify/flag checklists.
2. If this repo is the BFSI boilerplate, also read `CLAUDE.md` and the relevant `skills/skills_*.md` files for changed areas (auth, API, storage, caching, tests).
3. For auth/token/route changes, apply [.cursor/skills/bfsi-auth/SKILL.md](../bfsi-auth/SKILL.md) rules in addition to this review.

## Review process

1. Understand the purpose of the change (PR description, commit messages, linked ticket).
2. Review all modified files (`git diff` against the base branch).
3. Identify functional, architectural, performance, security, and maintainability issues.
4. Classify each finding by severity (see below).
5. Suggest actionable improvements with file paths and short code examples when helpful.
6. Highlight positive implementation decisions.

### Get the diff

```bash
git diff --name-only origin/main...HEAD
```

If `origin/main` is missing, use `main`, `master`, or `git diff HEAD~5...HEAD`.

## Severity levels

| Level | When to use |
|-------|-------------|
| **Critical** | Crashes, data loss, security vulnerabilities, broken business flows, likely production incidents |
| **Major** | Architecture violations, maintainability problems, performance bottlenecks, incorrect behavior |
| **Minor** | Readability, consistency, best-practice nudges that do not block correctness |

## Domain checklist (summary)

Work through each area in [reference.md](reference.md). Prioritize:

- **Architecture** — no business logic in widgets; Clean Architecture layers respected; no API calls from UI widgets or `build()`.
- **State** — minimal intentional updates; correct provider scope/disposal; no uncontrolled mutable shared state.
- **Performance** — `const` where possible; narrow rebuild scope; no heavy work in `build()`.
- **Async & lifecycle** — errors handled; loading states; `mounted` / `context.mounted` before `setState`; controllers/streams disposed.
- **Null safety** — avoid reckless `!`; defensive API parsing.
- **Code quality** — naming, small methods, no magic numbers, limited nesting.
- **Localization** — no hardcoded user-facing strings.
- **Accessibility** — semantics, labels on icon-only actions, scalable layouts.
- **Security** — no secrets in repo or logs.
- **Testing** — new business logic and critical paths covered.
- **Dependencies** — new packages justified; no duplicates.

## Project-specific (this boilerplate)

When reviewing code in this repository, also verify:

| Area | Expectation |
|------|-------------|
| Layers | `domain` → `data` → `presentation`; `Either<Failure, T>` from repositories upward |
| State | Riverpod `StateNotifierProvider` per feature — not ad-hoc globals |
| HTTP | Dio only via `ApiClient` / datasources — not from widgets |
| Secrets | `FlutterSecureStorage` + `AppConstants` keys — never Hive/SharedPreferences for tokens |
| Authz | Role checks in **usecases**, not UI-only |
| Constants | URLs, keys, TTLs via `ApiConstants` / `AppConstants` / `CacheConstants` |

## Output format

Use this template exactly:

```markdown
# PR Review Summary

**Risk Level:** Low | Medium | High

## Critical Issues

- [file:line] Issue — why it matters — suggested fix

## Major Issues

- ...

## Minor Improvements

- ...

## Performance Notes

- ...

## Test Coverage Notes

- ...

## Positive Findings

- ...
```

**Risk level guidance**

- **High** — any Critical issue, or multiple Major issues in core flows
- **Medium** — Major issues only, or missing tests on critical paths
- **Low** — Minor items only, or clean review

## Review rules

- Focus on **correctness** over style preferences.
- Do not suggest changes without explaining **why**.
- Provide **file names** (and line numbers when known).
- Include **code examples** when they clarify the fix.
- Avoid subjective taste comments.
- Prioritize issues that affect **production stability**.

## Additional resources

- Full checklists: [reference.md](reference.md)
- Example output: [examples.md](examples.md)
