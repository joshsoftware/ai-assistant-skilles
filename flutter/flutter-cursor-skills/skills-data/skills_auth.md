# Flutter BFSI Authentication & Authorisation Skill

# HOW to use this skill
When asked to implement any authentication or authorisation feature in this project, follow every rule in this file exactly.
Apply these standards to: login, logout, token management, biometric auth, session handling, role-based access, and route guards.

---

## 1. Authentication Overview

This project uses **JWT-based authentication** with silent token refresh and biometric re-authentication.

| Flow | Mechanism |
|---|---|
| Primary login | Email + Password → JWT access + refresh token |
| Token persistence | `FlutterSecureStorage` only |
| Token renewal | Silent refresh via `AuthInterceptor` |
| Re-authentication | Biometric (fingerprint / Face ID) via `local_auth` |
| Session expiry | Inactivity timeout (30 min) |
| Logout | Token revocation + full secure storage clear |

---

## 2. Token Lifecycle

```
Login ──► Save access_token + refresh_token (SecureStorage)
  │
  ▼
API Request ──► AuthInterceptor injects Bearer token
  │
  ▼
401 Response ──► AuthInterceptor attempts silent refresh
  │                ├── Success ──► Save new access_token, retry original request
  │                └── Failure ──► clearAll() + redirect to login
  ▼
Logout ──► POST /auth/logout ──► clearAll()
```

### Token Storage Keys

Always use `AppConstants` — never raw strings:

```dart
AppConstants.tokenKey         // 'auth_token'
AppConstants.refreshTokenKey  // 'refresh_token'
AppConstants.userIdKey        // 'user_id'
```

### Token Save (on login)

```dart
await _storage.saveToken(data['access_token'] as String);
await _storage.saveRefreshToken(data['refresh_token'] as String);
await _storage.write(AppConstants.userIdKey, data['user']['id'] as String);
```

### Token Clear (on logout or session expiry)

```dart
await _storage.clearAll();  // wipes all keys, not just token
```

---

## 3. AuthInterceptor Rules

Located at `lib/core/network/interceptors/auth_interceptor.dart`.

- Inject `Authorization: Bearer <token>` on every outgoing request
- On 401: attempt **one** silent refresh — never retry more than once
- If refresh succeeds: save new token, clone and retry the original request
- If refresh fails: call `clearAll()` — the router redirect guard handles navigation
- Never throw from `onRequest` — only from `onError`

```dart
@override
Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
  if (err.response?.statusCode == 401) {
    final refreshed = await _tryRefreshToken(err.requestOptions);
    if (refreshed != null) {
      handler.resolve(refreshed);
      return;
    }
    await _storage.clearAll();  // triggers router guard → login
  }
  handler.next(err);
}
```

---

## 4. Login Flow

### UseCase

```dart
// lib/features/auth/domain/usecases/login_usecase.dart
class LoginParams {
  final String email;
  final String password;
  const LoginParams({required this.email, required this.password});
}

class LoginUsecase {
  final AuthRepository repository;
  const LoginUsecase(this.repository);

  Future<Either<Failure, UserEntity>> call(LoginParams params) =>
      repository.login(email: params.email, password: params.password);
}
```

### Validation Rules (enforced in UI before calling usecase)

| Field | Rule |
|---|---|
| Email | Required, valid format (`^[^@]+@[^@]+\.[^@]+`) |
| Password | Required, minimum 6 characters |

Never send a request with invalid input — validate in the form before calling the notifier.

### AuthNotifier State Machine

```
idle ──► loading ──► authenticated  (success)
                └──► error          (failure, message shown)
```

```dart
class AuthState {
  final UserEntity? user;
  final bool isLoading;
  final String? error;
}
```

After successful login:
1. State becomes `authenticated` with `UserEntity`
2. Router guard detects token in `SecureStorage` and redirects to `/dashboard`
3. Trigger cache warm-up (accounts, profile, notifications)

---

## 5. Logout Flow

Always perform logout in this exact order:

```dart
Future<void> logout() async {
  // 1. Attempt server-side token revocation (best-effort)
  try {
    await _remoteDataSource.logout();
  } catch (_) {
    // Proceed even if server call fails
  }

  // 2. Clear all local state
  await _storage.clearAll();

  // 3. Clear all feature caches
  await _cacheService.clearAll();

  // 4. Reset Riverpod state
  state = const AuthState();
}
```

Never skip step 2 even if step 1 fails.

---

## 6. Forgot Password Flow

```
User enters email
  │
  ▼
POST /auth/forgot-password { email }
  │
  ▼
Show success view regardless of whether email exists  ← prevents user enumeration
  │
  ▼
User clicks reset link in email
  │
  ▼
POST /auth/reset-password { token, new_password, confirm_password }
```

### ForgotPasswordNotifier States

```dart
enum ForgotPasswordStatus { idle, loading, success, failure }
```

- Use `autoDispose` on this provider — it is not needed outside the screen
- Show the success screen even when the email is not registered (security best practice)

---

## 7. Biometric Authentication

Use `local_auth` for re-authentication before sensitive actions (view full account number, transfer funds).

### Setup Check

```dart
// lib/core/auth/biometric_service.dart
class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();

  Future<bool> get isAvailable async {
    final canCheck = await _auth.canCheckBiometrics;
    final isSupported = await _auth.isDeviceSupported();
    return canCheck && isSupported;
  }

  Future<List<BiometricType>> get availableTypes =>
      _auth.getAvailableBiometrics();

  Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false,    // allow PIN fallback
          stickyAuth: true,        // keep prompt alive if app backgrounds
        ),
      );
    } on PlatformException {
      return false;
    }
  }
}
```

### When to Require Biometric Re-auth

| Action | Require Biometric |
|---|---|
| View full account number | Yes |
| View CVV / card details | Yes |
| Initiate fund transfer | Yes (amount > ₹5,000) |
| Change MPIN / password | Yes |
| Enable/disable biometric | Yes |
| View transaction history | No |
| View dashboard | No |

### Biometric Preference

Store the user's opt-in preference in Hive (not secure storage):

```dart
await preferencesBox.put('biometric_enabled', true);
```

---

## 8. Session Management

### Session Timeout

Inactivity timeout is defined in `AppConstants.sessionTimeoutMinutes` (default: 30).

Implement via an `InactivityTimer` that resets on any user interaction:

```dart
// lib/core/auth/session_manager.dart
class SessionManager {
  Timer? _timer;
  final VoidCallback onSessionExpired;

  SessionManager({required this.onSessionExpired});

  void resetTimer() {
    _timer?.cancel();
    _timer = Timer(
      const Duration(minutes: AppConstants.sessionTimeoutMinutes),
      onSessionExpired,
    );
  }

  void dispose() => _timer?.cancel();
}
```

Wire into the root widget via a `GestureDetector` that calls `resetTimer()` on any tap/scroll:

```dart
GestureDetector(
  onTap: sessionManager.resetTimer,
  onPanUpdate: (_) => sessionManager.resetTimer(),
  behavior: HitTestBehavior.translucent,
  child: child,
)
```

On expiry:
1. Show a session-expired dialog
2. Call `authNotifier.logout()`
3. Navigate to `/login`

### App Lifecycle

Re-validate the token when the app resumes from background:

```dart
@override
void didChangeAppLifecycleState(AppLifecycleState state) {
  if (state == AppLifecycleState.resumed) {
    _checkTokenValidity();
  }
}

Future<void> _checkTokenValidity() async {
  final token = await _storage.getToken();
  if (token == null || token.isEmpty) {
    context.go(AppRoutes.login);
  }
}
```

---

## 9. Route Guard (Authorisation)

The `go_router` redirect guard is the single enforcement point for authentication:

```dart
redirect: (context, state) async {
  final token = await secureStorage.getToken();
  final isLoggedIn = token != null && token.isNotEmpty;
  final isOnLogin = state.matchedLocation == AppRoutes.login;
  final isOnForgotPassword = state.matchedLocation == AppRoutes.forgotPassword;

  // Public routes — accessible without login
  if (isOnLogin || isOnForgotPassword) {
    return isLoggedIn ? AppRoutes.dashboard : null;
  }

  // All other routes require authentication
  if (!isLoggedIn) return AppRoutes.login;
  return null;
},
```

### Public vs Protected Routes

| Route | Auth Required |
|---|---|
| `/login` | No |
| `/forgot-password` | No |
| `/dashboard` | Yes |
| `/accounts/:id` | Yes |
| `/transactions` | Yes |
| `/profile` | Yes |
| `/transfer` | Yes |

---

## 10. Role-Based Access

User roles are defined in `UserEntity.role`. Enforce role checks at the usecase layer, not the UI.

```dart
// Roles
const String roleCustomer = 'customer';
const String roleRM       = 'relationship_manager';
const String roleAdmin    = 'admin';
```

### Role Check Pattern

```dart
class GetAdminReportUsecase {
  Future<Either<Failure, Report>> call(UserEntity currentUser) async {
    if (currentUser.role != roleAdmin) {
      return const Left(UnauthorizedFailure());
    }
    return repository.getAdminReport();
  }
}
```

Never hide UI elements as the sole access control — always enforce at the usecase layer.

---

## 11. MPIN

For quick re-entry after biometric failure, support a 4–6 digit MPIN:

### MPIN Storage

```dart
// Hash the MPIN before storing — never store plaintext
import 'package:crypto/crypto.dart';

String _hashMpin(String mpin) {
  final bytes = utf8.encode(mpin + AppConstants.mpinSalt);
  return sha256.convert(bytes).toString();
}

await _storage.write(AppConstants.mpinKey, _hashMpin(mpin));
```

Add to `AppConstants`:
```dart
static const String mpinKey  = 'user_mpin';
static const String mpinSalt = 'bfsi_mpin_salt_2024'; // move to env in prod
```

### MPIN Validation

```dart
Future<bool> validateMpin(String input) async {
  final stored = await _storage.read(AppConstants.mpinKey);
  if (stored == null) return false;
  return _hashMpin(input) == stored;
}
```

### MPIN Rules

- Length: 4–6 digits
- Lock account after **3 consecutive wrong attempts**
- Require re-authentication via password after lockout
- Never log or print MPIN values

---

## 12. Security Checklist

| Rule | Standard |
|---|---|
| Token storage | `FlutterSecureStorage` only |
| Token transport | HTTPS only, `Authorization: Bearer` header |
| Password transmission | Never stored or logged — sent once over HTTPS |
| MPIN storage | SHA-256 hashed with salt |
| Session timeout | 30 minutes inactivity |
| Biometric fallback | PIN allowed, password not bypassed |
| Route protection | `go_router` redirect guard |
| Role enforcement | Usecase layer, not UI |
| Forgot password | Always show success (prevent user enumeration) |
| Token refresh retry | Maximum one retry |

---

## 13. Folder Structure

```
lib/
├── core/
│   ├── auth/
│   │   ├── biometric_service.dart
│   │   └── session_manager.dart
│   └── network/
│       └── interceptors/
│           └── auth_interceptor.dart
└── features/
    └── auth/
        ├── domain/
        │   ├── entities/user_entity.dart
        │   ├── repositories/auth_repository.dart
        │   └── usecases/
        │       ├── login_usecase.dart
        │       ├── logout_usecase.dart
        │       └── forgot_password_usecase.dart
        ├── data/
        │   ├── datasources/auth_remote_datasource.dart
        │   ├── models/user_model.dart
        │   └── repositories/auth_repository_impl.dart
        └── presentation/
            ├── providers/
            │   ├── auth_provider.dart
            │   └── forgot_password_provider.dart
            └── screens/
                ├── login_screen.dart
                └── forgot_password_screen.dart
```

---

## 14. Do NOT

- Do not store tokens in Hive, SharedPreferences, or in-memory variables
- Do not skip `clearAll()` on logout — always wipe the full secure storage
- Do not enforce authorisation only in the UI — always validate in the usecase
- Do not allow more than one silent token refresh attempt per request
- Do not show different responses for registered vs unregistered emails on forgot password
- Do not log passwords, tokens, MPINs, or OTPs anywhere
- Do not store plaintext MPIN — always hash with salt
- Do not bypass the route guard for any protected route
- Do not use biometric as the sole authentication method — always maintain a fallback
