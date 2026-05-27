# Flutter BFSI Data Storage Skill

# HOW to use this skill
When asked to implement any local data storage in this project, follow every rule in this file exactly.
Apply these standards to: secure storage, Hive local database, caching strategies, and offline support.

---

## 1. Storage Layers Overview

This project uses two distinct storage layers. Never mix their responsibilities.

| Layer | Package | Use For |
|---|---|---|
| **Secure Storage** | `flutter_secure_storage` | Tokens, PINs, biometric keys, user credentials |
| **Local Database** | `hive` + `hive_flutter` | Cached API responses, user preferences, offline data |

---

## 2. Secure Storage

### Setup

Always use platform-specific options for maximum security:

```dart
const FlutterSecureStorage _storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
);
```

### Access via SecureStorageService

Never call `FlutterSecureStorage` directly from features.
Always go through `SecureStorageService` (`lib/core/storage/secure_storage_service.dart`):

```dart
// Correct
final storage = ref.watch(secureStorageServiceProvider);
await storage.saveToken(token);

// Wrong — never do this in a feature
const storage = FlutterSecureStorage();
await storage.write(key: 'token', value: token);
```

### Reserved Keys (defined in AppConstants)

| Constant | Key String | Purpose |
|---|---|---|
| `AppConstants.tokenKey` | `auth_token` | JWT access token |
| `AppConstants.refreshTokenKey` | `refresh_token` | JWT refresh token |
| `AppConstants.userIdKey` | `user_id` | Logged-in user ID |

- Never use raw string keys — always reference `AppConstants`
- Do not add new keys without adding a constant to `AppConstants`

### SecureStorageService API

```dart
Future<void> saveToken(String token)
Future<String?> getToken()
Future<void> saveRefreshToken(String token)
Future<void> write(String key, String value)
Future<String?> read(String key)
Future<void> delete(String key)
Future<void> clearAll()   // call on logout only
```

### Rules

- Call `clearAll()` on logout — never selectively delete only the token
- Never store passwords, PINs, or OTPs beyond their immediate use
- Never log secure storage values
- On read, always handle `null` — the key may not exist yet

---

## 3. Hive Local Database

### Initialization

Initialize Hive once in `main()` before `runApp`:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  // Register adapters here before opening boxes
  runApp(const ProviderScope(child: BfsiApp()));
}
```

### Box Naming Convention

All box names are `static const String` defined in `AppConstants`:

```dart
// AppConstants
static const String accountsBox = 'accounts_box';
static const String transactionsBox = 'transactions_box';
static const String userBox = 'user_box';
static const String preferencesBox = 'preferences_box';
```

Never use raw string box names inline.

### TypeAdapter Pattern

Every Hive model needs a `TypeAdapter`. Generate with `build_runner`:

```dart
import 'package:hive/hive.dart';

part '../Skills/account_hive_model.g.dart';

@HiveType(typeId: 1)
class AccountHiveModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String accountNumber;

  @HiveField(2)
  final double balance;

  AccountHiveModel({
    required this.id,
    required this.accountNumber,
    required this.balance,
  });
}
```

### TypeId Registry (never reuse or change assigned IDs)

| typeId | Model |
|---|---|
| 0 | `UserHiveModel` |
| 1 | `AccountHiveModel` |
| 2 | `TransactionHiveModel` |
| 3 | `NotificationHiveModel` |

### Registering Adapters

Register all adapters in `main()` before opening any box:

```dart
Hive.registerAdapter(UserHiveModelAdapter());
Hive.registerAdapter(AccountHiveModelAdapter());
```

### Opening Boxes

Open boxes lazily in the datasource or service that owns them:

```dart
final box = await Hive.openBox<AccountHiveModel>(AppConstants.accountsBox);
```

Never open the same box in multiple places — use a single local datasource per box.

### Local DataSource Pattern

Every Hive box is accessed through a dedicated local datasource:

```dart
abstract class AccountLocalDataSource {
  Future<List<AccountHiveModel>> getCachedAccounts();
  Future<void> cacheAccounts(List<AccountHiveModel> accounts);
  Future<void> clearAccounts();
}

class AccountLocalDataSourceImpl implements AccountLocalDataSource {
  Future<Box<AccountHiveModel>> get _box =>
      Hive.openBox<AccountHiveModel>(AppConstants.accountsBox);

  @override
  Future<List<AccountHiveModel>> getCachedAccounts() async {
    final box = await _box;
    return box.values.toList();
  }

  @override
  Future<void> cacheAccounts(List<AccountHiveModel> accounts) async {
    final box = await _box;
    await box.clear();
    await box.addAll(accounts);
  }

  @override
  Future<void> clearAccounts() async {
    final box = await _box;
    await box.clear();
  }
}
```

---

## 4. Caching Strategy (Cache-Then-Network)

Use the cache-then-network pattern for all list data (accounts, transactions):

```
1. Return cached data immediately (if available)
2. Fetch fresh data from API in background
3. Update cache with fresh data
4. Notify UI of update
```

Repository implementation:

```dart
@override
Future<Either<Failure, List<AccountEntity>>> getAccounts() async {
  // 1. Return cache first
  try {
    final cached = await _localDataSource.getCachedAccounts();
    if (cached.isNotEmpty) {
      // emit cached while fetching fresh
    }
  } on CacheException catch (_) {
    // cache miss is acceptable, continue to network
  }

  // 2. Fetch from network
  try {
    final fresh = await _remoteDataSource.getAccounts();
    // 3. Update cache
    await _localDataSource.cacheAccounts(
      fresh.map((e) => AccountHiveModel.fromEntity(e)).toList(),
    );
    return Right(fresh);
  } on NetworkException catch (e) {
    return Left(NetworkFailure(message: e.message));
  } on ServerException catch (e) {
    return Left(ServerFailure(message: e.message));
  }
}
```

---

## 5. User Preferences

Store non-sensitive preferences (theme, language, onboarding state) in a plain Hive box — not secure storage:

```dart
// Correct — preference, not sensitive
await preferencesBox.put('theme_mode', 'dark');

// Wrong — token must be in secure storage
await preferencesBox.put('auth_token', token);
```

Preference keys:

| Key | Type | Default |
|---|---|---|
| `theme_mode` | `String` | `'system'` |
| `language` | `String` | `'en'` |
| `onboarding_complete` | `bool` | `false` |
| `biometric_enabled` | `bool` | `false` |

---

## 6. Data Lifecycle & Cleanup

### On Logout
```dart
await secureStorage.clearAll();               // clear all tokens
await Hive.box(AppConstants.accountsBox).clear();
await Hive.box(AppConstants.transactionsBox).clear();
await Hive.box(AppConstants.userBox).clear();
// Do NOT clear preferencesBox — preserve theme/language
```

### Cache Expiry
- Store a `cachedAt` timestamp alongside cached data
- Treat cache as stale after **15 minutes** for transactional data
- Treat cache as stale after **24 hours** for profile/account metadata

```dart
@HiveField(3)
final DateTime cachedAt;

bool get isStale =>
    DateTime.now().difference(cachedAt).inMinutes > 15;
```

---

## 7. Folder Structure

```
lib/
└── core/
    └── storage/
        └── secure_storage_service.dart
lib/
└── features/
    └── {feature}/
        └── data/
            └── datasources/
                ├── {feature}_remote_datasource.dart
                └── {feature}_local_datasource.dart   ← Hive access here
            └── models/
                ├── {feature}_model.dart               ← API model
                └── {feature}_hive_model.dart          ← Hive model
```

---

## 8. build_runner

Run after adding or modifying any `@HiveType` model:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

Generated files (`*.g.dart`) are excluded from git via `.gitignore`.

---

## 9. Do NOT

- Do not store JWTs, passwords, or PINs in Hive
- Do not open boxes outside of their owning local datasource
- Do not reuse or reassign `typeId` values in Hive models
- Do not use raw string keys — always use `AppConstants`
- Do not clear `preferencesBox` on logout
- Do not cache data without a `cachedAt` timestamp
- Do not call `Hive.close()` manually — Flutter handles lifecycle
