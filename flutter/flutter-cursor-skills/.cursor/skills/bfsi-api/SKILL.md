---
name: bfsi-api
description: Enforces Dio ApiClient, interceptors, datasources, repositories, models, and error handling for this Flutter BFSI app. Use when creating or modifying API calls, endpoints, ApiConstants, interceptors, remote datasources, request/response models, pagination, or network error mapping.
---

# BFSI API Standards

## Before coding

1. Read the full project spec: [skills/skills_api_standards.md](../../../skills/skills_api_standards.md)
2. If touching tokens or secure writes, also read [skills/skills_data_storage.md](../../../skills/skills_data_storage.md) and the [bfsi-auth](../bfsi-auth/SKILL.md) skill for `AuthInterceptor` behaviour
3. Match existing code under `lib/core/network/`, `lib/core/error/`, and feature `data/` layers

## Architecture (non-negotiable)

| Layer | Rule |
|-------|------|
| HTTP | All traffic through `ApiClient` — never `Dio` outside it |
| URLs | `ApiConstants` only — `baseUrl`, timeouts, every path |
| Datasource | Abstract + `Impl`; returns **models**; only layer that calls `ApiClient` |
| Repository | `try/catch` typed exceptions → `Either<Failure, T>` |
| Tokens | `SecureStorageService` + `AppConstants` keys — never Hive/SharedPreferences |
| Providers | `apiClientProvider`, `secureStorageServiceProvider`; datasource wired inside repo provider |

## Base configuration

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

Timeouts: **30000ms** via `ApiConstants`.

## Endpoints

- `static const String` in `ApiConstants`
- Lowercase with hyphens: `/auth/forgot-password`
- Group by feature with comment blocks

## Interceptors (order)

| # | Interceptor | Role |
|---|-------------|------|
| 1 | `AuthInterceptor` | Bearer token; one silent refresh on 401 |
| 2 | `ErrorInterceptor` | `DioException` → typed exceptions (throw, never return) |
| 3 | `LogInterceptor` | Request/response bodies — **dev only** |

**ErrorInterceptor** maps to `lib/core/error/exceptions.dart`:

- `ServerException` — 4xx/5xx + status
- `UnauthorizedException` — 401
- `NetworkException` — timeout / no connection
- `CacheException` — local storage failures
- `ValidationException` — 422 / bad input

Read user message from `response.data['message']` when present.

**AuthInterceptor:** token from `SecureStorageService` each request; on 401 one refresh via `refresh_token`; failure → `clearAll()`; never retry more than once.

## ApiClient surface

Expose only:

```dart
Future<Response> get(String path, {Map<String, dynamic>? queryParams})
Future<Response> post(String path, {dynamic data})
Future<Response> put(String path, {dynamic data})
Future<Response> delete(String path)
```

## Datasource pattern

```dart
abstract class AuthRemoteDataSource {
  Future<UserModel> login({required String email, required String password});
  Future<void> logout();
  Future<void> forgotPassword({required String email});
}
```

- Cast `response.data` explicitly — no bare `dynamic`
- Save tokens in `Impl` immediately after successful auth

## Repository pattern

Catch **typed** exceptions only — map to failures:

| Exception | Failure |
|-----------|---------|
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

## Models

- Extend domain entity
- `factory Model.fromJson(Map<String, dynamic> json)` / `Map<String, dynamic> toJson()`
- Cast every JSON field: `json['id'] as String`

## Error response contract

```json
{
  "message": "Human-readable error string",
  "code": "MACHINE_READABLE_CODE",
  "errors": { "field": ["validation message"] }
}
```

Use `data['message']` for display; `data['errors']` for 422 field validation.

## JWT keys

```dart
AppConstants.tokenKey
AppConstants.refreshTokenKey
```

Logout: `clearAll()` **before** logout endpoint.

## Pagination

Query: `page`, `limit` (default 20), `sort`, `order`.  
Envelope: `{ "data": [], "meta": { "total", "page", "limit", "total_pages" } }`.

## Provider wiring

```dart
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  return AuthRepositoryImpl(AuthRemoteDataSourceImpl(client, storage));
});
```

Do not expose datasource `Impl` as its own provider.

## Do NOT

- Call `Dio` outside `ApiClient`
- Hardcode URLs outside `ApiConstants`
- Swallow exceptions — always propagate as `Failure`
- Use `dynamic` return types on API methods
- Store tokens/PINs outside `FlutterSecureStorage`
- Log passwords or tokens via `LogInterceptor` in production

## Full reference

Detailed tables, samples, and contract: [reference.md](reference.md) → canonical [skills/skills_api_standards.md](../../../skills/skills_api_standards.md).
