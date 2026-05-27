# AI Project Instructions

Read all files inside:
- skills-data/

Follow all standards while generating code.

Priority:
1. Security
2. Scalability
3. Clean Architecture
4. BFSI compliance
5. Testability

---

## Skills Index

All coding standards are defined in the `skills-data/` folder.
Before generating or modifying any code, read the relevant skill file and follow it exactly.

| Spec file | Cursor skill (optional) | When to Read |
|---|---|---|
| [`skills-data/skills_boilerplate.md`](skills-data/skills_boilerplate.md) | `@bfsi-boilerplate` | Adding a new feature, screen, or package |
| [`skills-data/skills_api_standards.md`](skills-data/skills_api_standards.md) | `@bfsi-api` | Creating or modifying any API call, endpoint, interceptor, or model |
| [`skills-data/skills_data_storage.md`](skills-data/skills_data_storage.md) | `@bfsi-storage` | Storing data locally (Hive) or securely (tokens, PINs) |
| [`skills-data/skills_caching.md`](skills-data/skills_caching.md) | `@bfsi-caching` | Adding or modifying caching in any repository |
| [`skills-data/skills_auth.md`](skills-data/skills_auth.md) | `@bfsi-auth` | Implementing login, logout, biometric, session, or role-based access |
| [`skills-data/skills_unit_testing.md`](skills-data/skills_unit_testing.md) | `@bfsi-testing` | Writing unit tests, widget tests, or mocks |

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
