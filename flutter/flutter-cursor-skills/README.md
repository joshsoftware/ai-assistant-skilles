# Flutter BFSI Project (Clean Architecture)

This repository is set up for **BFSI-grade Flutter development** with strong defaults around **security**, **clean architecture**, and **testability**.

## How to use `CLAUDE.md` (mandatory)

`CLAUDE.md` is the **source of truth** for:
- **priorities** (security → scalability → clean architecture → BFSI compliance → testability)
- **architecture rules** (feature-first + clean layers)
- **security rules** (token storage, logging restrictions, session rules, etc.)
- **coding standards** (no hardcoded constants, null-safety rules, etc.)
- **testing rules** (coverage targets and patterns)

### Recommended prompt for an AI agent (Cursor/Claude/etc.)

Copy/paste this as the *first* instruction before asking the agent to make changes:

```text
Read CLAUDE.md and the relevant files in skills-data/.
Follow them exactly for any code you generate or modify.
```

### What “follow `CLAUDE.md`” means in practice

- **Architecture**: feature-first at `lib/features/<feature>/{data,domain,presentation}/` with dependencies only pointing inward.
- **State**: Riverpod with one `StateNotifierProvider` per feature.
- **Network**: Dio only via `ApiClient` (no direct Dio usage inside features).
- **Errors**: bubble failures up as `dartz Either<Failure, T>` starting at repository layer.
- **Secrets**: use `FlutterSecureStorage` for tokens/PINs/secrets (never Hive/SharedPreferences).
- **Security**: never log secrets (tokens, OTPs, MPINs).
- **Testing**: `test/` mirrors `lib/`, with the coverage targets from `CLAUDE.md`.

## Skills: specs vs Cursor skills

| Layer | Location | How to use |
|-------|----------|------------|
| **Full specs** | `skills-data/*.md` | Canonical checklists — read before coding |
| **Agent summaries** | `.cursor/skills/bfsi-*/` | Mention in chat: `@bfsi-api`, `@bfsi-auth`, etc. |
| **Auto hints** | `.cursor/rules/bfsi-*.mdc` | Apply when editing matching `lib/` or `test/` paths |

### Spec index (`skills-data/`)

- **`skills_boilerplate.md`** → `@bfsi-boilerplate` — new feature, screen, or package
- **`skills_api_standards.md`** → `@bfsi-api` — API calls, models, interceptors
- **`skills_data_storage.md`** → `@bfsi-storage` — Hive + secure storage
- **`skills_caching.md`** → `@bfsi-caching` — repository caching, TTLs, invalidation
- **`skills_auth.md`** → `@bfsi-auth` — login, session, biometrics, roles
- **`skills_unit_testing.md`** → `@bfsi-testing` — unit/widget tests, mocks

### Quick decision guide

- **HTTP, models, interceptors** → `skills_api_standards.md` or `@bfsi-api`
- **Tokens, PIN/MPIN, persistence** → `skills_data_storage.md` or `@bfsi-storage` (+ auth spec if needed)
- **Session, login, roles, biometrics** → `skills_auth.md` or `@bfsi-auth`
- **Repository caching or TTLs** → `skills_caching.md` or `@bfsi-caching`
- **New feature/screen/module** → `skills_boilerplate.md` or `@bfsi-boilerplate`
- **Tests** → `skills_unit_testing.md` or `@bfsi-testing`
- **Responsive layout** → `@flutter-build-responsive-layout` (`.agents/skills/`)

## Contributing (for humans and agents)

- Align changes with `CLAUDE.md` first.
- Read the relevant `skills-data/*.md` (or `@` the Cursor skill) before implementing.
- Keep secrets out of logs and out of the repo.
