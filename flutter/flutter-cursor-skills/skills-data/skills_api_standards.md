# Flutter BFSI API Standards Skill

# HOW to use this skill
When asked to create or modify API layer code in this project, follow every rule in this file exactly.
Apply these standards to: API client setup, datasources, interceptors, endpoint constants, error handling, and request/response models.

---

## 1. Base Configuration

- All API communication goes through `ApiClient` (`lib/core/network/api_client.dart`)
- Base URL is defined only in `ApiConstants.baseUrl` — never hardcode URLs elsewhere
- Set `connectTimeout` and `receiveTimeout` to `30000ms` via `ApiConstants`
- Default headers must include `Content-Type: application/json` and `Accept: application/json`

```dart
BaseOptions(
  baseUrl: ApiConstants.baseUrl,
  connectTimeout: const Duration(milliseconds: ApiConstants.connectTimeout),
  receiveTimeout: const Duration(milliseconds: ApiConstants.receiveTimeout),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
)
```

---

## 2. Endpoint Naming

- All endpoints are `static const String` in `ApiConstants`
- Use lowercase with hyphens: `/auth/forgot-password`, not `/auth/forgotPassword`
- Group by feature with a comment block

```dart
// Auth
static const String login = '/auth/login';
static const String logout = '/auth/logout';
static const String refreshToken = '/auth/refresh';
static const String forgotPassword = '/auth/forgot-password';

// Accounts
static const String accounts = '/accounts';

// Transactions
static const String transactions = '/transactions';
```

---

## 3. Interceptors

Always attach these three interceptors in order:

| Order | Interceptor | Responsibility |
|---|---|---|
| 1 | `AuthInterceptor` | Inject JWT Bearer token; silent refresh on 401 |
| 2 | `ErrorInterceptor` | Map Dio errors → typed exceptions |
| 3 | `LogInterceptor` | Log request/response bodies (dev only) |

### AuthInterceptor rules
- Read token from `SecureStorageService` on every request
- On 401: attempt one silent refresh using `refresh_token`; if refresh fails, call `clearAll()` and let the router redirect to login
- Never retry more than once

### ErrorInterceptor rules
- Map every `DioExceptionType` to a typed exception from `lib/core/error/exceptions.dart`
- Extract `message` from `response.data['message']` when available
- Throw, do not return, so the call stack propagates cleanly

```dart
// Required exception types
ServerException    // 4xx / 5xx with status code
UnauthorizedException  // 401 specifically
NetworkException   // timeout / no connection
CacheException     // local storage failures
ValidationException // 422 / bad input
```

---

## 4. ApiClient Methods

Expose only these four methods — no extra wrappers:

```dart
Future<Response> get(String path, {Map<String, dynamic>? queryParams})
Future<Response> post(String path, {dynamic data})
Future<Response> put(String path, {dynamic data})
Future<Response> delete(String path)
```

---

## 5. Data Source Layer

- Every feature has an `abstract class` datasource interface and an `Impl` class
- Datasource methods return **model objects** (never raw `Response` or `Map`)
- Datasource is the only layer that touches `ApiClient` directly

```dart
abstract class AuthRemoteDataSource {
  Future<UserModel> login({required String email, required String password});
  Future<void> logout();
  Future<void> forgotPassword({required String email});
}
```

- Cast `response.data` explicitly — never use `dynamic` without casting
- Save tokens inside the datasource `Impl` immediately after a successful auth response

---

## 6. Repository Layer

- Repository wraps datasource calls in `try/catch` and returns `Either<Failure, T>`
- Catch only typed exceptions — never catch `Exception` or `Object` broadly
- Map exceptions to failures using this table:

| Exception | Failure |
|---|---|
| `UnauthorizedException` | `UnauthorizedFailure()` |
| `ServerException` | `ServerFailure(message, statusCode)` |
| `NetworkException` | `NetworkFailure(message)` |
| `CacheException` | `CacheFailure(message)` |

```dart
try {
  final result = await _remoteDataSource.someCall();
  return Right(result);
} on UnauthorizedException {
  return const Left(UnauthorizedFailure());
} on ServerException catch (e) {
  return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
} on NetworkException catch (e) {
  return Left(NetworkFailure(message: e.message));
}
```

---

## 7. Request & Response Models

- Every model extends its domain entity
- Use `factory Model.fromJson(Map<String, dynamic> json)` for deserialization
- Use `Map<String, dynamic> toJson()` for serialization
- Cast every field explicitly — never use `json['key']` without a cast

```dart
factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
  id: json['id'] as String,
  name: json['name'] as String,
  email: json['email'] as String,
  phone: json['phone'] as String? ?? '',
);
```

---

## 8. Error Response Contract

Expect the backend to return errors in this shape:

```json
{
  "message": "Human-readable error string",
  "code": "MACHINE_READABLE_CODE",
  "errors": { "field": ["validation message"] }
}
```

- Always read `data['message']` for the user-facing string
- Read `data['errors']` for field-level validation (422 responses)

---

## 9. JWT Token Handling

- Access token key: `AppConstants.tokenKey`
- Refresh token key: `AppConstants.refreshTokenKey`
- Store both tokens via `SecureStorageService` immediately after login
- Never store tokens in `SharedPreferences` or Hive — always `FlutterSecureStorage`
- On logout: call `SecureStorageService.clearAll()` before hitting the logout endpoint

---

## 10. Pagination

For list endpoints, use this standard query parameter shape:

```dart
await _client.get(
  ApiConstants.transactions,
  queryParams: {
    'page': page,
    'limit': limit,       // default 20
    'sort': 'created_at',
    'order': 'desc',
  },
);
```

Expected paginated response envelope:

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  }
}
```

---

## 11. Provider Wiring

- `ApiClient` is provided via `apiClientProvider` (Provider, not StateNotifier)
- `SecureStorageService` is provided via `secureStorageServiceProvider`
- Datasource `Impl` is instantiated inside the repository provider — never exposed as its own provider

```dart
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  return AuthRepositoryImpl(AuthRemoteDataSourceImpl(client, storage));
});
```

---

## 12. Do NOT

- Do not call `Dio` directly outside `ApiClient`
- Do not hardcode any URL string outside `ApiConstants`
- Do not swallow exceptions silently — always propagate as a `Failure`
- Do not use `dynamic` as a return type in any API method
- Do not store sensitive data (tokens, PINs) in anything other than `FlutterSecureStorage`
- Do not log sensitive fields (passwords, tokens) via `LogInterceptor` in production
