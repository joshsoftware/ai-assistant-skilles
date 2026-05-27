# Flutter BFSI Project (Clean Architecture)

This repository is set up for **BFSI-grade Flutter development** with strong defaults around **security**, **clean architecture**, and **testability**.

---

## Table of Contents

1. [How to use CLAUDE.md](#how-to-use-claudemd)
2. [Architecture Rules](#architecture-rules)
3. [Security Rules](#security-rules)
4. [Skills Index](#skills-index)
   - [@bfsi-boilerplate](#bfsi-boilerplate--skills_boilerplatemd)
   - [@bfsi-api](#bfsi-api--skills_api_standardsmd)
   - [@bfsi-auth](#bfsi-auth--skills_authmd)
   - [@bfsi-storage](#bfsi-storage--skills_data_storagemd)
   - [@bfsi-caching](#bfsi-caching--skills_cachingmd)
   - [@bfsi-testing](#bfsi-testing--skills_unit_testingmd)
5. [Quick Decision Guide](#quick-decision-guide)
6. [Contributing](#contributing)

---

## How to use `CLAUDE.md`

`CLAUDE.md` is the **source of truth** for all priorities, architecture rules, security rules, coding standards, and testing rules.

### Recommended prompt for an AI agent (Cursor / Claude / etc.)

```text
Read CLAUDE.md and the relevant files in skills-data/.
Follow them exactly for any code you generate or modify.
```

### What "follow CLAUDE.md" means in practice

| Concern | Rule |
|---|---|
| Architecture | Feature-first at `lib/features/<feature>/{data,domain,presentation}/`; dependencies only point inward |
| State | Riverpod — one `StateNotifierProvider` per feature |
| Network | Dio only via `ApiClient` — never call Dio directly from a feature |
| Errors | Bubble failures up as `dartz Either<Failure, T>` from repository layer upward |
| Secrets | `FlutterSecureStorage` for tokens/PINs/secrets — never Hive/SharedPreferences |
| Logging | Never log tokens, passwords, MPINs, or OTPs |
| Testing | `test/` mirrors `lib/`; coverage targets enforced per layer |

---

## Architecture Rules

```
lib/
├── core/
│   ├── auth/            ← BiometricService, SessionManager
│   ├── cache/           ← CacheService
│   ├── constants/       ← ApiConstants, AppConstants, CacheConstants, CacheKeys
│   ├── error/           ← Exceptions, Failures
│   ├── network/         ← ApiClient, interceptors (Auth, Error, Log)
│   └── storage/         ← SecureStorageService
└── features/
    └── <feature>/
        ├── data/
        │   ├── datasources/   ← remote + local datasources
        │   ├── models/        ← API models + Hive models
        │   └── repositories/  ← repository implementations
        ├── domain/
        │   ├── entities/
        │   ├── repositories/  ← abstract interfaces
        │   └── usecases/
        └── presentation/
            ├── providers/     ← Riverpod notifiers
            └── screens/
```

**Dependency rule:** domain ← data ← presentation. Domain never imports from data or presentation.

---

## Security Rules

| Rule | Standard |
|---|---|
| Token storage | `FlutterSecureStorage` only |
| MPIN storage | SHA-256 hashed with salt — never plaintext |
| Session timeout | 30 minutes inactivity (`AppConstants.sessionTimeoutMinutes`) |
| Token refresh retry | Maximum one silent retry per request |
| Forgot password response | Always show success — never reveal whether an email is registered |
| Role enforcement | Usecase layer, not UI |
| Logging | Never log tokens, passwords, MPINs, or OTPs |
| Null safety | No `!` force-unwrap without a guard |

---

## Skills Index

All coding standards live in `skills-data/`. Read the relevant file before generating or modifying any code.

| Skill tag | Spec file | When to use |
|---|---|---|
| `@bfsi-boilerplate` | [`skills_boilerplate.md`](skills-data/skills_boilerplate.md) | Adding a new feature, screen, or package |
| `@bfsi-api` | [`skills_api_standards.md`](skills-data/skills_api_standards.md) | Creating or modifying any API call, endpoint, interceptor, or model |
| `@bfsi-auth` | [`skills_auth.md`](skills-data/skills_auth.md) | Login, logout, biometric, session, token handling, role-based access |
| `@bfsi-storage` | [`skills_data_storage.md`](skills-data/skills_data_storage.md) | Storing data locally (Hive) or securely (tokens, PINs) |
| `@bfsi-caching` | [`skills_caching.md`](skills-data/skills_caching.md) | Adding or modifying caching in any repository |
| `@bfsi-testing` | [`skills_unit_testing.md`](skills-data/skills_unit_testing.md) | Writing unit tests, widget tests, or mocks |

---

### `@bfsi-boilerplate` — [`skills_boilerplate.md`](skills-data/skills_boilerplate.md)

**Use when:** Starting any new feature, screen, or package.

Sets the baseline every feature must follow:

| Concern | Choice |
|---|---|
| Architecture | Clean Architecture (domain → data → presentation) |
| State management | Riverpod (`StateNotifierProvider` per feature) |
| Networking | Dio via centralised `ApiClient` |
| Local database | Hive + hive_flutter |
| Secure storage | FlutterSecureStorage |
| Navigation | go_router with auth redirect guard |
| UI | Material 3, responsive design, dark/light mode |

**Required packages:** `flutter_riverpod`, `dio`, `go_router`, `hive`, `flutter_secure_storage`, `local_auth`

---

### `@bfsi-api` — [`skills_api_standards.md`](skills-data/skills_api_standards.md)

**Use when:** Creating or modifying API calls, endpoints, interceptors, or response models.

#### Interceptor chain (always in this order)

| Order | Interceptor | Responsibility |
|---|---|---|
| 1 | `AuthInterceptor` | Inject JWT Bearer token; silent refresh on 401 |
| 2 | `ErrorInterceptor` | Map Dio errors → typed exceptions |
| 3 | `LogInterceptor` | Log request/response bodies (dev only) |

#### Exception → Failure mapping

| Exception | Failure |
|---|---|
| `UnauthorizedException` | `UnauthorizedFailure()` |
| `ServerException` | `ServerFailure(message, statusCode)` |
| `NetworkException` | `NetworkFailure(message)` |
| `CacheException` | `CacheFailure(message)` |

#### Key rules

- All HTTP goes through `ApiClient` — never raw Dio in features
- All endpoints are `static const String` in `ApiConstants` (lowercase + hyphens)
- Datasource methods return typed model objects — never raw `Response` or `Map`
- Repository wraps datasource calls in `try/catch` and returns `Either<Failure, T>`
- Cast every JSON field explicitly — never use `json['key']` without a cast
- Tokens stored via `SecureStorageService` immediately after successful auth response
- Pagination uses `page`, `limit` (default 20), `sort`, `order` query params

#### Do NOT

- Call Dio directly outside `ApiClient`
- Hardcode any URL string outside `ApiConstants`
- Swallow exceptions silently
- Use `dynamic` as a return type in any API method
- Log sensitive fields (passwords, tokens) via `LogInterceptor` in production

---

### `@bfsi-auth` — [`skills_auth.md`](skills-data/skills_auth.md)

**Use when:** Implementing login, logout, token management, biometric auth, session handling, or role-based access.

#### Authentication overview

| Flow | Mechanism |
|---|---|
| Primary login | Email + Password → JWT access + refresh token |
| Token persistence | `FlutterSecureStorage` only |
| Token renewal | Silent refresh via `AuthInterceptor` (max 1 retry) |
| Re-authentication | Biometric (fingerprint / Face ID) via `local_auth` |
| Session expiry | 30-minute inactivity timeout |
| Logout | Token revocation + full secure storage clear |

#### Token lifecycle

```
Login ──► Save access_token + refresh_token (SecureStorage)
  │
  ▼
API Request ──► AuthInterceptor injects Bearer token
  │
  ▼
401 Response ──► AuthInterceptor attempts silent refresh (once)
  │                ├── Success ──► Save new access_token, retry original request
  │                └── Failure ──► clearAll() + redirect to login
  ▼
Logout ──► POST /auth/logout ──► clearAll()
```

#### Logout order (never skip any step)

1. Attempt server-side token revocation (best-effort — proceed even if it fails)
2. `await _storage.clearAll()`
3. `await _cacheService.clearAll()`
4. Reset Riverpod state to `const AuthState()`

#### Biometric re-auth required for

| Action | Required |
|---|---|
| View full account number | Yes |
| View CVV / card details | Yes |
| Initiate fund transfer (> ₹5,000) | Yes |
| Change MPIN / password | Yes |
| View transaction history | No |
| View dashboard | No |

#### MPIN rules

- Length: 4–6 digits
- SHA-256 hashed with salt before storage — never plaintext
- Lock after **3 consecutive wrong attempts**
- Require password re-authentication after lockout

#### Route guard — public vs protected

| Route | Auth Required |
|---|---|
| `/login`, `/forgot-password` | No |
| `/dashboard`, `/accounts/:id`, `/transactions`, `/profile`, `/transfer` | Yes |

#### Role enforcement

Roles: `customer`, `relationship_manager`, `admin`. Always enforce at the **usecase layer** — never rely solely on hiding UI elements.

#### Do NOT

- Store tokens in Hive, SharedPreferences, or in-memory variables
- Allow more than one silent token refresh attempt per request
- Show different responses for registered vs unregistered emails on forgot password
- Log passwords, tokens, MPINs, or OTPs
- Store plaintext MPIN
- Use biometric as the sole authentication method — always maintain a fallback

---

### `@bfsi-storage` — [`skills_data_storage.md`](skills-data/skills_data_storage.md)

**Use when:** Storing data locally — Hive boxes, secure tokens, user preferences.

#### Storage layers — never mix responsibilities

| Layer | Package | Use for |
|---|---|---|
| Secure Storage | `flutter_secure_storage` | Tokens, PINs, biometric keys, credentials |
| Local Database | `hive` + `hive_flutter` | Cached API responses, preferences, offline data |

#### SecureStorageService API

```dart
Future<void> saveToken(String token)
Future<String?> getToken()
Future<void> saveRefreshToken(String token)
Future<void> write(String key, String value)
Future<String?> read(String key)
Future<void> delete(String key)
Future<void> clearAll()   // on logout only
```

Always access via `SecureStorageService` — never call `FlutterSecureStorage` directly from features.

#### Hive TypeId registry (never reuse or change IDs)

| typeId | Model |
|---|---|
| 0 | `UserHiveModel` |
| 1 | `AccountHiveModel` |
| 2 | `TransactionHiveModel` |
| 3 | `NotificationHiveModel` |

#### Box name constants (in `AppConstants`)

```dart
static const String accountsBox    = 'accounts_box';
static const String transactionsBox = 'transactions_box';
static const String userBox         = 'user_box';
static const String preferencesBox  = 'preferences_box';
static const String cacheBox        = 'cache_box';
```

Never use raw string box names inline — always reference `AppConstants`.

#### Cache expiry

- Transactional data: stale after **15 minutes**
- Profile / account metadata: stale after **24 hours**
- Always store a `cachedAt` timestamp alongside cached data

#### On logout — clear these, keep preferences

```dart
await secureStorage.clearAll();
await Hive.box(AppConstants.accountsBox).clear();
await Hive.box(AppConstants.transactionsBox).clear();
await Hive.box(AppConstants.userBox).clear();
// Do NOT clear preferencesBox — preserve theme/language
```

#### Do NOT

- Store JWTs, passwords, or PINs in Hive
- Open boxes outside their owning local datasource
- Reuse or reassign `typeId` values
- Use raw string keys — always use `AppConstants`
- Cache data without a `cachedAt` timestamp
- Call `Hive.close()` manually

---

### `@bfsi-caching` — [`skills_caching.md`](skills-data/skills_caching.md)

**Use when:** Adding or modifying caching in any repository.

#### Caching strategy by data type

| Strategy | When to use |
|---|---|
| Cache-First + background refresh | Account balances, profile, transaction history |
| Network-First | Payments, fund transfers, OTP flows |
| Cache-Only | User preferences, app configuration |
| Network-Only | Auth (login, logout, token refresh) |

Never apply caching to write operations (POST/PUT/DELETE).

#### TTL constants (`CacheConstants`)

| Data | TTL |
|---|---|
| Account balance | 5 minutes |
| Account list | 15 minutes |
| Transaction list | 15 minutes |
| Transaction detail | 1 hour |
| User profile | 24 hours |
| Bank / IFSC list | 7 days |
| Notifications | 5 minutes |

Always reference `CacheConstants` — never hardcode durations inline.

#### Cache key convention (`CacheKeys`)

```dart
CacheKeys.accounts()
CacheKeys.accountDetail(id)
CacheKeys.transactions(accountId: id, page: n)
CacheKeys.transactionDetail(id)
CacheKeys.userProfile(userId)
CacheKeys.notifications(userId)
```

Always use `CacheKeys` methods — never build key strings ad hoc.

#### Cache invalidation triggers

| Trigger | Invalidate |
|---|---|
| Successful fund transfer | `accounts`, `transactions_*` |
| Bill payment | `accounts`, `transactions_*` |
| Profile update | `profile_{userId}` |
| Logout | All cache via `clearAll()` |
| Pull-to-refresh | The specific resource key only |
| App foreground resume | Re-check TTL; fetch if stale |

#### UI state for cached data

Expose `isFromCache` and `lastUpdated` in the state class. Show a "last updated X ago" badge when serving cached data so users know the data may not be live.

#### Do NOT

- Cache write operation responses
- Cache auth tokens via `CacheService` — use `SecureStorageService`
- Build cache key strings inline
- Hardcode TTL durations
- Serve stale cache on server errors for financial transactions
- Forget to invalidate related caches after any write
- Cache PII (Aadhaar, PAN, full account numbers) without encryption
- Call `clearAll()` on pull-to-refresh — only invalidate the specific key

---

### `@bfsi-testing` — [`skills_unit_testing.md`](skills-data/skills_unit_testing.md)

**Use when:** Writing unit tests, widget tests, or mocks.

#### Test layers

| Layer | Test type | Tools |
|---|---|---|
| Domain — Usecases | Unit | `flutter_test` + `mockito` |
| Data — Repositories | Unit | `flutter_test` + `mockito` |
| Data — Datasources | Unit | `flutter_test` + `mockito` |
| Data — Models | Unit | `flutter_test` |
| Presentation — Notifiers | Unit | `flutter_riverpod` + `mockito` |
| Presentation — Screens | Widget | `flutter_test` |

#### Coverage minimums

| Layer | Minimum |
|---|---|
| Domain — Usecases | 100% |
| Data — Models (`fromJson`/`toJson`) | 100% |
| Data — Repositories | 90% |
| Presentation — Notifiers | 80% |
| Presentation — Screens | 60% |

#### Test naming convention

```
group('ClassName')
  group('methodName')
    test('condition → expected outcome')
```

Use `returns`, `emits`, `throws`, `calls` — never `should return` / `should do`.

#### Mock generation

Use `mockito` `@GenerateMocks` annotation — never hand-written mocks.

```dart
// test/helpers/mock_providers.dart
@GenerateMocks([
  AuthRepository,
  AuthRemoteDataSource,
  SecureStorageService,
  CacheService,
])
void main() {}
```

Regenerate after any interface change:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

#### Running tests

```bash
# All tests
flutter test

# Single file
flutter test test/features/auth/domain/usecases/login_usecase_test.dart

# With coverage report
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

#### Do NOT

- Write mocks by hand
- Share mock instances between tests — recreate in `setUp`
- Use `sleep` or real `Future.delayed` — use `fake_async`
- Test Flutter/Dart framework internals
- Skip edge cases: empty list, null fields, network failure, 401, 500
- Write widget tests that rely on pixel positions or hardcoded sizes
- Leave `verify` calls without `verifyNoMoreInteractions` when interaction count matters
- Forget to `container.dispose()` in `tearDown`

---

## Quick Decision Guide

| You are working on… | Read this skill |
|---|---|
| New feature / screen / module | `@bfsi-boilerplate` |
| HTTP client, models, interceptors, endpoints | `@bfsi-api` |
| Login, logout, session, biometrics, roles, token refresh | `@bfsi-auth` |
| Hive boxes, secure token storage, user preferences | `@bfsi-storage` |
| Repository caching, TTLs, cache invalidation | `@bfsi-caching` |
| Unit tests, widget tests, mocks | `@bfsi-testing` |
| Responsive layout | `@flutter-build-responsive-layout` |

---

## Contributing

- Align changes with `CLAUDE.md` first.
- Read the relevant `skills-data/*.md` (or `@` the Cursor skill) before implementing.
- Keep secrets out of logs and out of the repo.
- `test/` must mirror `lib/` — new code requires new tests meeting the coverage minimums above.
