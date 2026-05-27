---
name: bfsi-auth
description: Implements JWT auth, silent token refresh, biometric re-auth, session timeout, MPIN, go_router guards, and role checks for this Flutter BFSI app. Use when implementing or changing login, logout, forgot password, tokens, AuthInterceptor, biometrics, session handling, MPIN, route guards, or role-based access.
---

# BFSI Authentication & Authorisation

## Before coding

1. Read the full project spec: [skills-data/skills_auth.md](../../../skills-data/skills_auth.md)
2. If touching storage keys or secure writes, also read [skills-data/skills_data_storage.md](../../../skills-data/skills_data_storage.md)
3. Match existing code under `lib/core/auth/`, `lib/core/network/interceptors/`, and `lib/features/auth/`

## Architecture (non-negotiable)

| Concern | Rule |
|---------|------|
| Tokens | `FlutterSecureStorage` only — keys via `AppConstants` |
| HTTP auth | `AuthInterceptor` injects Bearer; max **one** silent refresh per request |
| Navigation | `go_router` redirect guard is the auth enforcement point |
| Authorisation | Role checks in **usecase** layer — never UI-only |
| Logout | Server revoke (best-effort) → `clearAll()` secure storage → clear caches → reset Riverpod |
| Forgot password | Always show success — no user enumeration |
| MPIN | SHA-256 + salt before storage — never plaintext or logs |
| Secrets | Never log tokens, passwords, MPINs, or OTPs |

## Token lifecycle

```
Login → save access + refresh + user_id (SecureStorage)
API → AuthInterceptor adds Bearer
401 → one refresh attempt → retry OR clearAll() → guard → login
Logout → POST /auth/logout → clearAll()
```

Keys (never raw strings):

```dart
AppConstants.tokenKey
AppConstants.refreshTokenKey
AppConstants.userIdKey
```

## Login

- Validate in UI before usecase: email required + format; password required, min 6 chars
- `LoginUsecase` → `Either<Failure, UserEntity>`
- `AuthState`: `user`, `isLoading`, `error` — idle → loading → authenticated | error
- After success: router sees token → `/dashboard`; warm caches (accounts, profile, notifications)

## Logout order

```dart
try { await _remoteDataSource.logout(); } catch (_) {}
await _storage.clearAll();           // always, even if step 1 fails
await _cacheService.clearAll();
state = const AuthState();
```

## Forgot password

- `ForgotPasswordStatus`: idle, loading, success, failure
- Provider: `autoDispose`
- Success UI even if email not registered

## Biometric (`local_auth`)

- `BiometricService` in `lib/core/auth/biometric_service.dart`
- Require for: full account number, CVV/card, transfers > ₹5,000, MPIN/password change, enable/disable biometric
- Opt-in preference in Hive: `biometric_enabled` (not secure storage)
- Biometric is re-auth, not sole auth — PIN fallback allowed (`biometricOnly: false`)

## Session

- Timeout: `AppConstants.sessionTimeoutMinutes` (30) via `SessionManager` + root `GestureDetector` reset on interaction
- On expiry: dialog → `authNotifier.logout()` → `/login`
- On `AppLifecycleState.resumed`: re-check token; missing → `context.go(AppRoutes.login)`

## Route guard pattern

Public: `/login`, `/forgot-password` — redirect to dashboard if already logged in.  
All other routes: require non-empty token or redirect to login.

## Roles

```dart
const String roleCustomer = 'customer';
const String roleRM       = 'relationship_manager';
const String roleAdmin    = 'admin';
```

Usecase pattern: `if (currentUser.role != roleAdmin) return Left(UnauthorizedFailure());`

## MPIN

- 4–6 digits; lock after 3 wrong attempts; password re-auth after lockout
- Hash: `utf8.encode(mpin + AppConstants.mpinSalt)` → SHA-256 → store under `AppConstants.mpinKey`

## Folder layout

```
lib/core/auth/          biometric_service.dart, session_manager.dart
lib/core/network/interceptors/auth_interceptor.dart
lib/features/auth/      domain → data → presentation (Clean Architecture)
```

## Do NOT

- Store tokens in Hive, SharedPreferences, or in-memory globals
- Skip `clearAll()` on logout
- Enforce access only in UI
- Retry silent refresh more than once per request
- Different forgot-password responses by registration status
- Bypass route guard on protected routes
- Use biometric as the only authentication path

## Full reference

Detailed flows, code samples, tables, and security checklist: [reference.md](reference.md) → canonical [skills-data/skills_auth.md](../../../skills-data/skills_auth.md).
