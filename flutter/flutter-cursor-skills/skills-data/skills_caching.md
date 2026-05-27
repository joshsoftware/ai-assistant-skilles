# Flutter BFSI Caching Skill

# HOW to use this skill
When asked to implement caching in this project, follow every rule in this file exactly.
Apply these standards to: API response caching, offline support, cache invalidation, stale data handling, and pagination caching.

---

## 1. Caching Philosophy

This project follows a **Cache-First with Background Refresh** approach for read-heavy BFSI data.

| Strategy | When to Use |
|---|---|
| **Cache-First** | Account balances, profile, transaction history |
| **Network-First** | Payments, fund transfers, OTP flows — always fresh |
| **Cache-Only** | User preferences, app configuration |
| **Network-Only** | Auth (login, logout, token refresh) |

Never apply caching to write operations (POST/PUT/DELETE).

---

## 2. Cache Entry Structure

Every cached entry must include metadata alongside the data:

```dart
@HiveType(typeId: 10)
class CacheEntry<T> extends HiveObject {
  @HiveField(0)
  final String key;

  @HiveField(1)
  final dynamic data;

  @HiveField(2)
  final DateTime cachedAt;

  @HiveField(3)
  final DateTime expiresAt;

  CacheEntry({
    required this.key,
    required this.data,
    required this.cachedAt,
    required this.expiresAt,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isValid => !isExpired;

  Duration get remainingTtl => expiresAt.difference(DateTime.now());
}
```

Never store raw data in Hive without `cachedAt` and `expiresAt`.

---

## 3. TTL (Time-To-Live) Rules

Define all TTLs as constants — never hardcode durations inline:

```dart
// lib/core/constants/cache_constants.dart
class CacheConstants {
  CacheConstants._();

  // Account data
  static const Duration accountBalanceTtl   = Duration(minutes: 5);
  static const Duration accountListTtl      = Duration(minutes: 15);

  // Transactions
  static const Duration transactionListTtl  = Duration(minutes: 15);
  static const Duration transactionDetailTtl = Duration(hours: 1);

  // User
  static const Duration userProfileTtl      = Duration(hours: 24);

  // Reference data (mostly static)
  static const Duration bankListTtl          = Duration(days: 7);
  static const Duration ifscDetailTtl        = Duration(days: 7);

  // Notifications
  static const Duration notificationsTtl    = Duration(minutes: 5);
}
```

| Data Type | TTL | Reason |
|---|---|---|
| Account balance | 5 min | Changes frequently with transactions |
| Account list | 15 min | Rarely changes |
| Transaction list | 15 min | Append-only; tolerate brief staleness |
| Transaction detail | 1 hour | Immutable once settled |
| User profile | 24 hours | Changes only on explicit edit |
| Bank / IFSC list | 7 days | Near-static reference data |
| Notifications | 5 min | Time-sensitive |

---

## 4. Cache Key Convention

Cache keys are deterministic strings built from the resource and its parameters:

```dart
// lib/core/constants/cache_constants.dart
class CacheKeys {
  CacheKeys._();

  static String accounts()                    => 'accounts';
  static String accountDetail(String id)      => 'account_$id';
  static String transactions({
    required String accountId,
    required int page,
  }) => 'transactions_${accountId}_p$page';
  static String transactionDetail(String id)  => 'transaction_$id';
  static String userProfile(String userId)    => 'profile_$userId';
  static String notifications(String userId)  => 'notifications_$userId';
  static String bankList()                    => 'bank_list';
  static String ifscDetail(String ifsc)       => 'ifsc_$ifsc';
}
```

Rules:
- Always use `CacheKeys` methods — never build key strings ad hoc
- Include pagination parameters in the key for paginated resources
- Use underscores as separators, lowercase only

---

## 5. CacheService

Centralise all Hive cache reads/writes in a single `CacheService`:

```dart
// lib/core/cache/cache_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:bfsi_app/core/constants/app_constants.dart';

final cacheServiceProvider = Provider<CacheService>((_) => CacheService());

class CacheService {
  static const String _boxName = AppConstants.cacheBox;

  Future<Box> get _box => Hive.openBox(_boxName);

  Future<void> set(String key, dynamic value, Duration ttl) async {
    final box = await _box;
    await box.put(key, {
      'data': value,
      'cachedAt': DateTime.now().toIso8601String(),
      'expiresAt': DateTime.now().add(ttl).toIso8601String(),
    });
  }

  Future<T?> get<T>(String key) async {
    final box = await _box;
    final entry = box.get(key) as Map?;
    if (entry == null) return null;

    final expiresAt = DateTime.parse(entry['expiresAt'] as String);
    if (DateTime.now().isAfter(expiresAt)) {
      await box.delete(key);   // auto-evict on read
      return null;
    }

    return entry['data'] as T?;
  }

  Future<bool> isValid(String key) async {
    final box = await _box;
    final entry = box.get(key) as Map?;
    if (entry == null) return false;
    final expiresAt = DateTime.parse(entry['expiresAt'] as String);
    return DateTime.now().isBefore(expiresAt);
  }

  Future<void> invalidate(String key) async {
    final box = await _box;
    await box.delete(key);
  }

  Future<void> invalidatePattern(String prefix) async {
    final box = await _box;
    final keys = box.keys.where((k) => k.toString().startsWith(prefix));
    await box.deleteAll(keys);
  }

  Future<void> clearAll() async {
    final box = await _box;
    await box.clear();
  }
}
```

Add `cacheBox` to `AppConstants`:

```dart
static const String cacheBox = 'cache_box';
```

---

## 6. Repository Caching Pattern

### Cache-First with Background Refresh

```dart
@override
Future<Either<Failure, List<AccountEntity>>> getAccounts() async {
  final cacheKey = CacheKeys.accounts();

  // 1. Return valid cache immediately
  final cached = await _cacheService.get<List>(cacheKey);
  if (cached != null) {
    final entities = cached
        .map((e) => AccountModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    // Trigger background refresh without awaiting
    _refreshAccountsInBackground(cacheKey);
    return Right(entities);
  }

  // 2. Cache miss — fetch from network
  return _fetchAndCacheAccounts(cacheKey);
}

Future<void> _refreshAccountsInBackground(String cacheKey) async {
  try {
    final fresh = await _remoteDataSource.getAccounts();
    final jsonList = fresh.map((e) => (e as AccountModel).toJson()).toList();
    await _cacheService.set(cacheKey, jsonList, CacheConstants.accountListTtl);
  } catch (_) {
    // Background refresh failure is silent — cached data still served
  }
}

Future<Either<Failure, List<AccountEntity>>> _fetchAndCacheAccounts(
    String cacheKey) async {
  try {
    final fresh = await _remoteDataSource.getAccounts();
    final jsonList = fresh.map((e) => (e as AccountModel).toJson()).toList();
    await _cacheService.set(cacheKey, jsonList, CacheConstants.accountListTtl);
    return Right(fresh);
  } on NetworkException catch (e) {
    return Left(NetworkFailure(message: e.message));
  } on ServerException catch (e) {
    return Left(ServerFailure(message: e.message));
  }
}
```

### Network-First (for time-sensitive data)

```dart
@override
Future<Either<Failure, List<TransactionEntity>>> getRecentTransactions() async {
  try {
    // 1. Always try network first
    final fresh = await _remoteDataSource.getRecentTransactions();
    final cacheKey = CacheKeys.transactions(accountId: 'all', page: 1);
    await _cacheService.set(cacheKey, fresh, CacheConstants.transactionListTtl);
    return Right(fresh);
  } on NetworkException catch (e) {
    // 2. Fall back to cache only on network failure
    final cacheKey = CacheKeys.transactions(accountId: 'all', page: 1);
    final cached = await _cacheService.get<List>(cacheKey);
    if (cached != null) {
      return Right(cached.map((e) =>
          TransactionModel.fromJson(Map<String, dynamic>.from(e))).toList());
    }
    return Left(NetworkFailure(message: e.message));
  } on ServerException catch (e) {
    return Left(ServerFailure(message: e.message));
  }
}
```

---

## 7. Cache Invalidation Rules

| Trigger | Invalidate |
|---|---|
| Successful fund transfer | `accounts`, `transactions_*` |
| Bill payment | `accounts`, `transactions_*` |
| Profile update | `profile_{userId}` |
| Logout | All cache via `clearAll()` |
| Pull-to-refresh | The specific resource key |
| App foreground resume | Re-check TTL; fetch if stale |

Invalidation in the notifier after a write operation:

```dart
Future<void> transferFunds(TransferParams params) async {
  final result = await _transferUsecase(params);
  result.fold(
    (failure) => state = state.copyWith(error: failure.message),
    (_) async {
      // Invalidate affected caches immediately
      await _cacheService.invalidate(CacheKeys.accounts());
      await _cacheService.invalidatePattern('transactions_');
      // Reload fresh data
      await loadAccounts();
    },
  );
}
```

---

## 8. Paginated Cache

Cache each page independently under its own key:

```dart
// Page 1
await _cacheService.set(
  CacheKeys.transactions(accountId: accountId, page: 1),
  pageOneData,
  CacheConstants.transactionListTtl,
);

// Page 2
await _cacheService.set(
  CacheKeys.transactions(accountId: accountId, page: 2),
  pageTwoData,
  CacheConstants.transactionListTtl,
);
```

On pull-to-refresh or invalidation, use `invalidatePattern`:

```dart
await _cacheService.invalidatePattern('transactions_$accountId');
```

---

## 9. Offline Detection

Check connectivity before deciding cache vs network strategy:

```dart
// lib/core/network/connectivity_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityServiceProvider = Provider<ConnectivityService>(
  (_) => ConnectivityService(),
);

class ConnectivityService {
  Future<bool> get isOnline async {
    try {
      final result = await InternetAddress.lookup('google.com');
      return result.isNotEmpty && result.first.rawAddress.isNotEmpty;
    } on SocketException {
      return false;
    }
  }
}
```

Use in the repository:

```dart
final online = await _connectivity.isOnline;
if (!online) {
  final cached = await _cacheService.get<List>(cacheKey);
  if (cached != null) return Right(_parse(cached));
  return const Left(NetworkFailure(message: 'No internet connection.'));
}
```

---

## 10. UI State for Cached Data

Distinguish between fresh and cached data in the UI state:

```dart
class AccountsState {
  final List<AccountEntity> accounts;
  final bool isLoading;
  final bool isFromCache;    // show "last updated" badge when true
  final DateTime? lastUpdated;
  final String? error;

  const AccountsState({
    this.accounts = const [],
    this.isLoading = false,
    this.isFromCache = false,
    this.lastUpdated,
    this.error,
  });
}
```

In the UI, show a subtle indicator when serving cached data:

```dart
if (state.isFromCache && state.lastUpdated != null)
  Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    child: Text(
      'Last updated ${_timeAgo(state.lastUpdated!)}',
      style: AppTextStyles.caption,
    ),
  ),
```

---

## 11. Cache Warm-Up on Login

Pre-populate critical caches immediately after successful login so the dashboard loads instantly:

```dart
Future<void> _warmUpCache(String userId) async {
  await Future.wait([
    _accountRepository.getAccounts(),
    _userRepository.getProfile(userId),
    _notificationRepository.getNotifications(userId),
  ]);
}
```

Call `_warmUpCache` in `AuthNotifier.login()` after a successful response.

---

## 12. Folder Structure

```
lib/
└── core/
    ├── cache/
    │   └── cache_service.dart
    └── constants/
        ├── cache_constants.dart    ← TTLs
        └── cache_keys.dart         ← Key builders
```

---

## 13. Do NOT

- Do not cache write operation responses (POST/PUT/DELETE)
- Do not cache auth tokens via `CacheService` — use `SecureStorageService`
- Do not build cache key strings inline — always use `CacheKeys`
- Do not hardcode TTL durations — always use `CacheConstants`
- Do not silently serve stale cache on server errors for financial transactions
- Do not forget to invalidate related caches after any write operation
- Do not cache PII (Aadhaar, PAN, full account numbers) without encryption
- Do not call `clearAll()` on cache during pull-to-refresh — only invalidate the specific key
