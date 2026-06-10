# AI Project Instructions

Read all files inside:
- Skills/

Follow all standards while generating code.

Priority:
1. Security
2. Scalability
3. Clean Architecture
4. BFSI compliance
5. Testability

---

## Skills Index

All coding standards are defined in the `Skills/` folder.
Before generating or modifying any code, read the relevant skill file and follow it exactly.

| Skill File | When to Read |
|---|---|
| [`Skills/skills_boilerplate.md`](Skills/skills_boilerplate.md) | Adding a new feature, screen, or package |
| [`Skills/skills_api_standards.md`](Skills/skills_api_standards.md) | Creating or modifying any API call, endpoint, interceptor, or model |
| [`Skills/skills_data_storage.md`](Skills/skills_data_storage.md) | Storing data locally (Hive) or securely (tokens, PINs) |
| [`Skills/skills_caching.md`](Skills/skills_caching.md) | Adding or modifying caching in any repository |
| [`Skills/skills_auth.md`](Skills/skills_auth.md) | Implementing login, logout, biometric, session, or role-based access |
| [`Skills/skills_unit_testing.md`](Skills/skills_unit_testing.md) | Writing unit tests, widget tests, or mocks |

### Cursor skills (`.cursor/skills/`)

| Skill | When to Read |
|---|---|
| [`.cursor/skills/flutter-pr-review/SKILL.md`](.cursor/skills/flutter-pr-review/SKILL.md) | Reviewing a PR, branch diff, or before merge sign-off |
| [`.cursor/skills/bfsi-auth/SKILL.md`](.cursor/skills/bfsi-auth/SKILL.md) | Auth/token/session/route-guard changes (implementation) |

---

## Architecture Rules

- Follow **Clean Architecture**: domain → data → presentation. Dependencies only point inward.
- Use **feature-first** folder structure: `lib/features/<feature>/data|domain|presentation/`
- State management: **Riverpod** (`StateNotifierProvider` per feature)
- Navigation: **go_router** with auth redirect guard
- HTTP: **Dio** via `ApiClient` — never call Dio directly from a feature
- Error handling: **`dartz Either<Failure, T>`** from repository layer upward
- Secure storage: **`FlutterSecureStorage`** for tokens and secrets — never Hive or SharedPreferences

---

## Security Rules

- Never store JWT tokens, passwords, or PINs outside `FlutterSecureStorage`
- Never log tokens, passwords, MPINs, or OTPs
- Always enforce authorisation at the **usecase layer**, not only the UI
- Silent token refresh: maximum **one retry** per request
- Session timeout: **30 minutes** inactivity (`AppConstants.sessionTimeoutMinutes`)
- MPIN: SHA-256 hashed with salt before storage — never plaintext
- Forgot password: always return success view — never reveal whether an email is registered

---

## Code Standards

- No hardcoded strings for URLs, keys, or box names — use `ApiConstants`, `AppConstants`, `CacheKeys`
- No hardcoded durations for cache TTLs — use `CacheConstants`
- No raw `dynamic` return types in API or storage methods — always cast explicitly
- No comments explaining WHAT code does — only WHY (non-obvious constraints or workarounds)
- No unused imports, dead code, or backwards-compatibility shims
- Null safety enforced everywhere — no `!` force-unwrap without a guard

---

## Testing Rules

- Every layer is tested independently: usecases → unit, repos → unit, notifiers → unit, screens → widget
- `test/` mirrors `lib/` exactly; shared fixtures in `test/helpers/test_data.dart`
- Use `mockito` annotation-based mocks — never hand-written mocks
- Coverage minimums: 100% usecases, 100% models, 90% repos, 80% notifiers, 60% screens
- Test naming: `group('<Class>') → group('<method>') → test('<condition> → <outcome>')`
