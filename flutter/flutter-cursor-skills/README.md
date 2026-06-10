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
Read CLAUDE.md and all files in Skills/.
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

## Skills: what they are, and when to use them

All implementation standards live in the `Skills/` folder. Treat each skill file as a **checklist**: before you code in that area, read the relevant file and follow it.

### Skills index

- **`Skills/skills_boilerplate.md`**: adding a new feature, screen, or package
- **`Skills/skills_api_standards.md`**: any API call/model/interceptor/API-layer change
- **`Skills/skills_data_storage.md`**: local storage (Hive) and secure storage rules (tokens/PINs)
- **`Skills/skills_caching.md`**: caching behavior, TTL rules, cache keys, invalidation
- **`Skills/skills_auth.md`**: login/logout/biometric/session/role-based access
- **`Skills/skills_unit_testing.md`**: unit/widget tests, mocks, naming, and structure

### Quick decision guide

- If you’re touching **HTTP, models, interceptors, parsing** → read `skills_api_standards.md`
- If you’re touching **tokens, PIN/MPIN, persistence** → read `skills_data_storage.md` (+ `skills_auth.md` if auth-related)
- If you’re touching **session/login/roles/biometrics** → read `skills_auth.md`
- If you’re adding **repositories caching or TTLs** → read `skills_caching.md`
- If you’re adding **new feature/screen/module** → read `skills_boilerplate.md`
- If you’re writing or changing **tests** → read `skills_unit_testing.md`

## Cursor Agent skills (`.cursor/skills/`)

| Skill | When to use |
|-------|-------------|
| [`flutter-pr-review`](.cursor/skills/flutter-pr-review/SKILL.md) | Reviewing a Flutter PR, branch diff, or asking for a structured code review |
| [`bfsi-auth`](.cursor/skills/bfsi-auth/SKILL.md) | Implementing or changing login, tokens, biometrics, session, or route guards |

Invoke explicitly in Cursor (e.g. mention `flutter-pr-review` or attach the skill). PR reviews follow severity levels (Critical / Major / Minor) and the output template in the skill.

## Contributing (for humans and agents)

- Always align changes with `CLAUDE.md` first.
- Read the relevant `Skills/*.md` before implementing.
- Keep secrets out of logs and out of the repo.
