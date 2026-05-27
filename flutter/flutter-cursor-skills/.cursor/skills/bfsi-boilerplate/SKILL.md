---
name: bfsi-boilerplate
description: Scaffolds features, screens, and packages using Clean Architecture, Riverpod, go_router, Dio, Hive, and Material 3 for this Flutter BFSI app. Use when adding a new feature, screen, module, or package, or when setting up project structure, navigation, theming, or shared widgets.
---

# Flutter BFSI Boilerplate

## Before coding

1. Read the full project spec: [skills-data/skills_boilerplate.md](../../../skills-data/skills_boilerplate.md)
2. Pull in domain skills as needed:
   - API layer → [bfsi-api](../bfsi-api/SKILL.md) / [skills-data/skills_api_standards.md](../../../skills-data/skills_api_standards.md)
   - Auth → [bfsi-auth](../bfsi-auth/SKILL.md) / [skills-data/skills_auth.md](../../../skills-data/skills_auth.md)
   - Storage → [skills-data/skills_data_storage.md](../../../skills-data/skills_data_storage.md)
   - Caching → [skills-data/skills_caching.md](../../../skills-data/skills_caching.md)
   - Tests → [skills-data/skills_unit_testing.md](../../../skills-data/skills_unit_testing.md)
3. Match existing layout under `lib/app/`, `lib/core/`, and `lib/features/<feature>/`

## HOW to start using this skill

### Architecture
- Use Clean Architecture
- Feature-first folder structure
- Separation of UI, Domain, Data layers

### State Management
- Use Riverpod

### Networking
- Use Dio
- Centralized API client
- JWT token handling

### Security
- Secure Storage
- SSL Pinning
- Biometric Authentication
- Session Timeout

### Local Database
- Hive

### Features
- Login
- Dashboard
- Profile
- Transaction History
- Notifications

### Code Standards
- Reusable widgets
- Proper error handling
- Repository pattern
- Dependency Injection
- Null safety

### UI
- Responsive design
- Material 3
- Dark/Light mode

### Packages
- flutter_riverpod
- dio
- go_router
- hive
- flutter_secure_storage
- local_auth

## Project layout

```
lib/
├── main.dart                 # Hive.initFlutter + ProviderScope
├── app/
│   ├── app.dart              # MaterialApp.router, AppTheme light/dark
│   └── router/app_router.dart  # go_router + auth redirect
├── core/
│   ├── constants/            # ApiConstants, AppConstants
│   ├── error/                # exceptions.dart, failures.dart
│   ├── network/              # ApiClient + interceptors
│   ├── storage/              # SecureStorageService
│   ├── theme/                # AppTheme, AppColors, AppTextStyles
│   └── widgets/              # AppButton, AppTextField, LoadingOverlay
└── features/<feature>/
    ├── domain/
    │   ├── entities/
    │   ├── repositories/     # abstract
    │   └── usecases/
    ├── data/
    │   ├── datasources/      # abstract + *_impl
    │   ├── models/           # extends entity, fromJson/toJson
    │   └── repositories/     # *_impl → Either<Failure, T>
    └── presentation/
        ├── providers/        # StateNotifierProvider per feature
        ├── screens/
        └── widgets/
```

Dependencies point **inward** only: presentation → domain ← data.

## New feature checklist

```
- [ ] lib/features/<name>/domain/entity + abstract repository + usecase(s)
- [ ] data: remote datasource (abstract + Impl), model(s), repository Impl
- [ ] presentation: StateNotifier + provider(s), screen(s), feature widgets
- [ ] Route in app_router.dart + AppRoutes constant
- [ ] ApiConstants endpoints (if API-backed) — see bfsi-api skill
- [ ] test/ mirrors lib/ — see skills_unit_testing.md
```

**Provider pattern** (repository wires datasource; usecase gets repo):

```dart
final featureRepositoryProvider = Provider<FeatureRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  return FeatureRepositoryImpl(FeatureRemoteDataSourceImpl(client, storage));
});

final featureUsecaseProvider = Provider<FeatureUsecase>((ref) {
  return FeatureUsecase(ref.watch(featureRepositoryProvider));
});

final featureNotifierProvider =
    StateNotifierProvider<FeatureNotifier, FeatureState>((ref) {
  return FeatureNotifier(
    ref.watch(featureUsecaseProvider),
    ref.watch(featureRepositoryProvider),
  );
});
```

## Stack (this repo)

| Concern | Implementation |
|---------|----------------|
| State | `flutter_riverpod` — `StateNotifierProvider` per feature |
| Navigation | `go_router` — `appRouterProvider`, `AppRoutes`, auth redirect |
| HTTP | `dio` via `ApiClient` only |
| Errors | `dartz` `Either<Failure, T>` from repository upward |
| Secrets | `flutter_secure_storage` via `SecureStorageService` |
| Cache / prefs | `hive` / `hive_flutter` (non-sensitive only) |
| Biometrics | `local_auth` |
| UI | Material 3 — `AppTheme.lightTheme` / `darkTheme`, `ThemeMode.system` |
| Entities | `equatable` where useful |

## Existing features

| Feature | Path |
|---------|------|
| Login / forgot password | `lib/features/auth/` |
| Dashboard / accounts | `lib/features/dashboard/` |
| Profile, transactions, notifications | scaffold when requested — same folder pattern |

## UI conventions

- Shared controls: `lib/core/widgets/` (`AppButton`, `AppTextField`, `LoadingOverlay`)
- Theme tokens: `AppColors`, `AppTextStyles`, `AppTheme` — no hardcoded colors in features
- Screens: `ConsumerWidget` / `ConsumerStatefulWidget`; read state via `ref.watch`

## Security (boilerplate-level)

| Data | Storage |
|------|---------|
| JWT, refresh token, MPIN | `FlutterSecureStorage` only |
| User prefs, cache metadata, biometric flag | Hive |
| API traffic | `ApiClient` + interceptors (auth, error, dev log) |

Session timeout, biometrics, SSL pinning: implement per [bfsi-auth](../bfsi-auth/SKILL.md) and product requirements.

## Do NOT

- Put business logic in widgets — use usecases
- Call `Dio` outside `ApiClient`
- Store tokens or PINs in Hive or SharedPreferences
- Skip `domain/` abstractions (repository interface, entities)
- Expose datasource `Impl` as its own Riverpod provider
- Hardcode routes, URLs, or storage keys — use `AppRoutes`, `ApiConstants`, `AppConstants`
- Add packages that duplicate the approved stack without explicit approval

## Full reference

Canonical spec and sync notes: [reference.md](reference.md) → [skills-data/skills_boilerplate.md](../../../skills-data/skills_boilerplate.md).
