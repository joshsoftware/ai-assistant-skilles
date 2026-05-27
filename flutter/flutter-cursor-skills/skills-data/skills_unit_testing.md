# Flutter BFSI Unit Testing Skill

# HOW to use this skill
When asked to write unit tests in this project, follow every rule in this file exactly.
Apply these standards to: usecase tests, repository tests, notifier tests, datasource tests, model tests, and widget tests.

---

## 1. Testing Philosophy

Every layer of Clean Architecture is tested independently.

| Layer | Test Type | Tool |
|---|---|---|
| Domain — Usecases | Unit test | `flutter_test` + `mockito` |
| Data — Repositories | Unit test | `flutter_test` + `mockito` |
| Data — Datasources | Unit test | `flutter_test` + `mockito` |
| Data — Models | Unit test | `flutter_test` |
| Presentation — Notifiers | Unit test | `flutter_riverpod` + `mockito` |
| Presentation — Widgets | Widget test | `flutter_test` |
| Integration | Integration test | `integration_test` |

**Test what matters, not what is obvious.** Do not test Flutter framework behaviour or Dart language features.

---

## 2. Required Dev Dependencies

Add to `pubspec.yaml` under `dev_dependencies`:

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.4
  build_runner: ^2.4.8
  fake_async: ^1.3.1
```

---

## 3. Folder Structure

Mirror the `lib/` structure exactly under `test/`:

```
test/
├── core/
│   ├── network/
│   │   └── interceptors/
│   │       ├── auth_interceptor_test.dart
│   │       └── error_interceptor_test.dart
│   ├── storage/
│   │   └── secure_storage_service_test.dart
│   └── cache/
│       └── cache_service_test.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   │   └── auth_remote_datasource_test.dart
│   │   │   ├── models/
│   │   │   │   └── user_model_test.dart
│   │   │   └── repositories/
│   │   │       └── auth_repository_impl_test.dart
│   │   ├── domain/
│   │   │   └── usecases/
│   │   │       ├── login_usecase_test.dart
│   │   │       └── forgot_password_usecase_test.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── auth_provider_test.dart
│   │       └── screens/
│   │           └── login_screen_test.dart
│   └── dashboard/
│       ├── data/
│       │   ├── models/
│       │   │   └── account_model_test.dart
│       │   └── repositories/
│       │       └── dashboard_repository_impl_test.dart
│       ├── domain/
│       │   └── usecases/
│       │       └── get_accounts_usecase_test.dart
│       └── presentation/
│           └── providers/
│               └── dashboard_provider_test.dart
└── helpers/
    ├── mock_providers.dart     ← shared mock declarations
    └── test_data.dart          ← shared fake entities / JSON fixtures
```

File naming: `<source_file_name>_test.dart` — always suffix with `_test`.

---

## 4. Mock Generation

Use `mockito` annotation-based mocks. Never write mocks by hand.

```dart
// test/helpers/mock_providers.dart
import 'package:mockito/annotations.dart';
import 'package:bfsi_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:bfsi_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:bfsi_app/core/storage/secure_storage_service.dart';
import 'package:bfsi_app/core/cache/cache_service.dart';

@GenerateMocks([
  AuthRepository,
  AuthRemoteDataSource,
  SecureStorageService,
  CacheService,
  DashboardRepository,
  DashboardRemoteDataSource,
])
void main() {}
```

Generate with:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

Import the generated file in each test:

```dart
import '../../../helpers/mock_providers.mocks.dart';
```

---

## 5. Test Data Fixtures

Keep all fake data in `test/helpers/test_data.dart`:

```dart
// test/helpers/test_data.dart
import 'package:bfsi_app/features/auth/domain/entities/user_entity.dart';
import 'package:bfsi_app/features/dashboard/domain/entities/account_entity.dart';

class TestData {
  TestData._();

  static const UserEntity testUser = UserEntity(
    id: 'user-001',
    name: 'Test User',
    email: 'test@bfsi.com',
    phone: '9999999999',
    role: 'customer',
  );

  static const AccountEntity testAccount = AccountEntity(
    id: 'acc-001',
    accountNumber: '1234567890',
    holderName: 'Test User',
    type: AccountType.savings,
    balance: 50000.0,
    currency: 'INR',
  );

  static const Map<String, dynamic> loginResponseJson = {
    'access_token': 'mock.access.token',
    'refresh_token': 'mock.refresh.token',
    'user': {
      'id': 'user-001',
      'name': 'Test User',
      'email': 'test@bfsi.com',
      'phone': '9999999999',
      'role': 'customer',
    },
  };

  static const Map<String, dynamic> userJson = {
    'id': 'user-001',
    'name': 'Test User',
    'email': 'test@bfsi.com',
    'phone': '9999999999',
    'role': 'customer',
  };

  static const Map<String, dynamic> accountJson = {
    'id': 'acc-001',
    'account_number': '1234567890',
    'holder_name': 'Test User',
    'type': 'savings',
    'balance': 50000.0,
    'currency': 'INR',
  };
}
```

---

## 6. UseCase Tests

Test that the usecase delegates to the repository and returns the result unchanged.

```dart
// test/features/auth/domain/usecases/login_usecase_test.dart
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/features/auth/domain/usecases/login_usecase.dart';
import '../../../helpers/mock_providers.mocks.dart';
import '../../../helpers/test_data.dart';

void main() {
  late LoginUsecase usecase;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    usecase = LoginUsecase(mockRepository);
  });

  const params = LoginParams(
    email: 'test@bfsi.com',
    password: 'password123',
  );

  group('LoginUsecase', () {
    test('returns UserEntity on repository success', () async {
      when(mockRepository.login(
        email: params.email,
        password: params.password,
      )).thenAnswer((_) async => const Right(TestData.testUser));

      final result = await usecase(params);

      expect(result, const Right(TestData.testUser));
      verify(mockRepository.login(
        email: params.email,
        password: params.password,
      )).called(1);
      verifyNoMoreInteractions(mockRepository);
    });

    test('returns Failure when repository fails', () async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer(
          (_) async => const Left(ServerFailure(message: 'Invalid credentials')));

      final result = await usecase(params);

      expect(result.isLeft(), true);
    });
  });
}
```

---

## 7. Repository Tests

Test that the repository maps datasource results and exceptions to `Either` correctly.

```dart
// test/features/auth/data/repositories/auth_repository_impl_test.dart
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/core/error/exceptions.dart';
import 'package:bfsi_app/core/error/failures.dart';
import 'package:bfsi_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:bfsi_app/features/auth/data/models/user_model.dart';
import '../../../helpers/mock_providers.mocks.dart';
import '../../../helpers/test_data.dart';

void main() {
  late AuthRepositoryImpl repository;
  late MockAuthRemoteDataSource mockDataSource;

  setUp(() {
    mockDataSource = MockAuthRemoteDataSource();
    repository = AuthRepositoryImpl(mockDataSource);
  });

  final userModel = UserModel.fromJson(TestData.userJson);

  group('AuthRepositoryImpl.login', () {
    test('returns Right(UserEntity) on datasource success', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer((_) async => userModel);

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      expect(result, Right(userModel));
    });

    test('returns Left(UnauthorizedFailure) on UnauthorizedException', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenThrow(const UnauthorizedException());

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'wrong',
      );

      expect(result, const Left(UnauthorizedFailure()));
    });

    test('returns Left(ServerFailure) on ServerException', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenThrow(const ServerException(message: 'Server error', statusCode: 500));

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      expect(result.isLeft(), true);
      result.fold(
        (f) => expect(f, isA<ServerFailure>()),
        (_) => fail('Expected Left'),
      );
    });

    test('returns Left(NetworkFailure) on NetworkException', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenThrow(const NetworkException(message: 'No internet'));

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      expect(result.isLeft(), true);
      result.fold(
        (f) => expect(f, isA<NetworkFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });
}
```

---

## 8. Model Tests

Test `fromJson` and `toJson` for every model.

```dart
// test/features/auth/data/models/user_model_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:bfsi_app/features/auth/data/models/user_model.dart';
import '../../../helpers/test_data.dart';

void main() {
  group('UserModel', () {
    test('fromJson creates correct model', () {
      final model = UserModel.fromJson(TestData.userJson);

      expect(model.id, 'user-001');
      expect(model.name, 'Test User');
      expect(model.email, 'test@bfsi.com');
      expect(model.role, 'customer');
    });

    test('toJson returns correct map', () {
      final model = UserModel.fromJson(TestData.userJson);
      final json = model.toJson();

      expect(json['id'], 'user-001');
      expect(json['email'], 'test@bfsi.com');
    });

    test('fromJson uses defaults for missing optional fields', () {
      final json = {'id': '1', 'name': 'X', 'email': 'x@x.com'};
      final model = UserModel.fromJson(json);

      expect(model.phone, '');
      expect(model.role, 'customer');
    });

    test('fromJson → toJson roundtrip is lossless', () {
      final original = UserModel.fromJson(TestData.userJson);
      final restored = UserModel.fromJson(original.toJson());

      expect(restored, original);
    });
  });
}
```

---

## 9. Notifier (Provider) Tests

Use `ProviderContainer` from `flutter_riverpod` to test notifiers without a widget tree.

```dart
// test/features/auth/presentation/providers/auth_provider_test.dart
import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/features/auth/domain/usecases/login_usecase.dart';
import 'package:bfsi_app/features/auth/presentation/providers/auth_provider.dart';
import '../../../helpers/mock_providers.mocks.dart';
import '../../../helpers/test_data.dart';

void main() {
  late ProviderContainer container;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(mockRepository),
      ],
    );
  });

  tearDown(() => container.dispose());

  group('AuthNotifier', () {
    test('initial state is idle', () {
      final state = container.read(authProvider);
      expect(state.isLoading, false);
      expect(state.user, null);
      expect(state.error, null);
    });

    test('login sets isLoading then returns user on success', () async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer((_) async => const Right(TestData.testUser));

      final notifier = container.read(authProvider.notifier);
      final success = await notifier.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      final state = container.read(authProvider);
      expect(success, true);
      expect(state.user, TestData.testUser);
      expect(state.isLoading, false);
      expect(state.error, null);
    });

    test('login sets error on failure', () async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer(
          (_) async => const Left(ServerFailure(message: 'Invalid credentials')));

      final notifier = container.read(authProvider.notifier);
      final success = await notifier.login(
        email: 'test@bfsi.com',
        password: 'wrong',
      );

      final state = container.read(authProvider);
      expect(success, false);
      expect(state.user, null);
      expect(state.error, 'Invalid credentials');
    });

    test('logout resets state to idle', () async {
      when(mockRepository.logout())
          .thenAnswer((_) async => const Right(null));

      await container.read(authProvider.notifier).logout();

      final state = container.read(authProvider);
      expect(state.user, null);
      expect(state.isLoading, false);
    });
  });
}
```

---

## 10. Widget Tests

Test that screens render correctly and respond to state changes.

```dart
// test/features/auth/presentation/screens/login_screen_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/features/auth/presentation/screens/login_screen.dart';
import 'package:bfsi_app/features/auth/presentation/providers/auth_provider.dart';
import '../../../helpers/mock_providers.mocks.dart';

void main() {
  late MockAuthRepository mockRepository;

  setUp(() => mockRepository = MockAuthRepository());

  Widget buildSubject() => ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(mockRepository),
        ],
        child: MaterialApp(
          home: const LoginScreen(),
        ),
      );

  group('LoginScreen', () {
    testWidgets('renders email and password fields', (tester) async {
      await tester.pumpWidget(buildSubject());

      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
    });

    testWidgets('shows validation errors on empty submit', (tester) async {
      await tester.pumpWidget(buildSubject());

      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('shows error banner on login failure', (tester) async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer(
          (_) async => const Left(ServerFailure(message: 'Invalid credentials')));

      await tester.pumpWidget(buildSubject());

      await tester.enterText(find.byType(TextFormField).first, 'test@bfsi.com');
      await tester.enterText(find.byType(TextFormField).last, 'wrongpass');
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      expect(find.text('Invalid credentials'), findsOneWidget);
    });

    testWidgets('shows loading indicator while logging in', (tester) async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer((_) => Future.delayed(const Duration(seconds: 2),
          () => const Right(TestData.testUser)));

      await tester.pumpWidget(buildSubject());

      await tester.enterText(find.byType(TextFormField).first, 'test@bfsi.com');
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
```

---

## 11. Test Naming Convention

Use the `group → test` hierarchy with consistent naming:

```
group('<ClassName>')
  group('<methodName>')
    test('<condition> → <expected outcome>')
```

Examples:
```dart
group('AuthRepositoryImpl', () {
  group('login', () {
    test('returns Right(UserEntity) when datasource succeeds', ...);
    test('returns Left(UnauthorizedFailure) on UnauthorizedException', ...);
    test('returns Left(NetworkFailure) on NetworkException', ...);
  });
});
```

Rules:
- Group name = class name (no "Test" suffix)
- Inner group name = method or scenario name
- Test name describes the condition and expected outcome — never "should do X"
- Write `returns`, `emits`, `throws`, `calls` — not `should return`, `should emit`

---

## 12. setUp and t# Flutter BFSI Unit Testing Skill

# HOW to use this skill
When asked to write unit tests in this project, follow every rule in this file exactly.
Apply these standards to: usecase tests, repository tests, notifier tests, datasource tests, model tests, and widget tests.

---

## 1. Testing Philosophy

Every layer of Clean Architecture is tested independently.

| Layer | Test Type | Tool |
|---|---|---|
| Domain — Usecases | Unit test | `flutter_test` + `mockito` |
| Data — Repositories | Unit test | `flutter_test` + `mockito` |
| Data — Datasources | Unit test | `flutter_test` + `mockito` |
| Data — Models | Unit test | `flutter_test` |
| Presentation — Notifiers | Unit test | `flutter_riverpod` + `mockito` |
| Presentation — Widgets | Widget test | `flutter_test` |
| Integration | Integration test | `integration_test` |

**Test what matters, not what is obvious.** Do not test Flutter framework behaviour or Dart language features.

---

## 2. Required Dev Dependencies

Add to `pubspec.yaml` under `dev_dependencies`:

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.4
  build_runner: ^2.4.8
  fake_async: ^1.3.1
```

---

## 3. Folder Structure

Mirror the `lib/` structure exactly under `test/`:

```
test/
├── core/
│   ├── network/
│   │   └── interceptors/
│   │       ├── auth_interceptor_test.dart
│   │       └── error_interceptor_test.dart
│   ├── storage/
│   │   └── secure_storage_service_test.dart
│   └── cache/
│       └── cache_service_test.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   │   └── auth_remote_datasource_test.dart
│   │   │   ├── models/
│   │   │   │   └── user_model_test.dart
│   │   │   └── repositories/
│   │   │       └── auth_repository_impl_test.dart
│   │   ├── domain/
│   │   │   └── usecases/
│   │   │       ├── login_usecase_test.dart
│   │   │       └── forgot_password_usecase_test.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── auth_provider_test.dart
│   │       └── screens/
│   │           └── login_screen_test.dart
│   └── dashboard/
│       ├── data/
│       │   ├── models/
│       │   │   └── account_model_test.dart
│       │   └── repositories/
│       │       └── dashboard_repository_impl_test.dart
│       ├── domain/
│       │   └── usecases/
│       │       └── get_accounts_usecase_test.dart
│       └── presentation/
│           └── providers/
│               └── dashboard_provider_test.dart
└── helpers/
    ├── mock_providers.dart     ← shared mock declarations
    └── test_data.dart          ← shared fake entities / JSON fixtures
```

File naming: `<source_file_name>_test.dart` — always suffix with `_test`.

---

## 4. Mock Generation

Use `mockito` annotation-based mocks. Never write mocks by hand.

```dart
// test/helpers/mock_providers.dart
import 'package:mockito/annotations.dart';
import 'package:bfsi_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:bfsi_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:bfsi_app/core/storage/secure_storage_service.dart';
import 'package:bfsi_app/core/cache/cache_service.dart';

@GenerateMocks([
  AuthRepository,
  AuthRemoteDataSource,
  SecureStorageService,
  CacheService,
  DashboardRepository,
  DashboardRemoteDataSource,
])
void main() {}
```

Generate with:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

Import the generated file in each test:

```dart
import '../../../helpers/mock_providers.mocks.dart';
```

---

## 5. Test Data Fixtures

Keep all fake data in `test/helpers/test_data.dart`:

```dart
// test/helpers/test_data.dart
import 'package:bfsi_app/features/auth/domain/entities/user_entity.dart';
import 'package:bfsi_app/features/dashboard/domain/entities/account_entity.dart';

class TestData {
  TestData._();

  static const UserEntity testUser = UserEntity(
    id: 'user-001',
    name: 'Test User',
    email: 'test@bfsi.com',
    phone: '9999999999',
    role: 'customer',
  );

  static const AccountEntity testAccount = AccountEntity(
    id: 'acc-001',
    accountNumber: '1234567890',
    holderName: 'Test User',
    type: AccountType.savings,
    balance: 50000.0,
    currency: 'INR',
  );

  static const Map<String, dynamic> loginResponseJson = {
    'access_token': 'mock.access.token',
    'refresh_token': 'mock.refresh.token',
    'user': {
      'id': 'user-001',
      'name': 'Test User',
      'email': 'test@bfsi.com',
      'phone': '9999999999',
      'role': 'customer',
    },
  };

  static const Map<String, dynamic> userJson = {
    'id': 'user-001',
    'name': 'Test User',
    'email': 'test@bfsi.com',
    'phone': '9999999999',
    'role': 'customer',
  };

  static const Map<String, dynamic> accountJson = {
    'id': 'acc-001',
    'account_number': '1234567890',
    'holder_name': 'Test User',
    'type': 'savings',
    'balance': 50000.0,
    'currency': 'INR',
  };
}
```

---

## 6. UseCase Tests

Test that the usecase delegates to the repository and returns the result unchanged.

```dart
// test/features/auth/domain/usecases/login_usecase_test.dart
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/features/auth/domain/usecases/login_usecase.dart';
import '../../../helpers/mock_providers.mocks.dart';
import '../../../helpers/test_data.dart';

void main() {
  late LoginUsecase usecase;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    usecase = LoginUsecase(mockRepository);
  });

  const params = LoginParams(
    email: 'test@bfsi.com',
    password: 'password123',
  );

  group('LoginUsecase', () {
    test('returns UserEntity on repository success', () async {
      when(mockRepository.login(
        email: params.email,
        password: params.password,
      )).thenAnswer((_) async => const Right(TestData.testUser));

      final result = await usecase(params);

      expect(result, const Right(TestData.testUser));
      verify(mockRepository.login(
        email: params.email,
        password: params.password,
      )).called(1);
      verifyNoMoreInteractions(mockRepository);
    });

    test('returns Failure when repository fails', () async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer(
          (_) async => const Left(ServerFailure(message: 'Invalid credentials')));

      final result = await usecase(params);

      expect(result.isLeft(), true);
    });
  });
}
```

---

## 7. Repository Tests

Test that the repository maps datasource results and exceptions to `Either` correctly.

```dart
// test/features/auth/data/repositories/auth_repository_impl_test.dart
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/core/error/exceptions.dart';
import 'package:bfsi_app/core/error/failures.dart';
import 'package:bfsi_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:bfsi_app/features/auth/data/models/user_model.dart';
import '../../../helpers/mock_providers.mocks.dart';
import '../../../helpers/test_data.dart';

void main() {
  late AuthRepositoryImpl repository;
  late MockAuthRemoteDataSource mockDataSource;

  setUp(() {
    mockDataSource = MockAuthRemoteDataSource();
    repository = AuthRepositoryImpl(mockDataSource);
  });

  final userModel = UserModel.fromJson(TestData.userJson);

  group('AuthRepositoryImpl.login', () {
    test('returns Right(UserEntity) on datasource success', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer((_) async => userModel);

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      expect(result, Right(userModel));
    });

    test('returns Left(UnauthorizedFailure) on UnauthorizedException', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenThrow(const UnauthorizedException());

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'wrong',
      );

      expect(result, const Left(UnauthorizedFailure()));
    });

    test('returns Left(ServerFailure) on ServerException', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenThrow(const ServerException(message: 'Server error', statusCode: 500));

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      expect(result.isLeft(), true);
      result.fold(
        (f) => expect(f, isA<ServerFailure>()),
        (_) => fail('Expected Left'),
      );
    });

    test('returns Left(NetworkFailure) on NetworkException', () async {
      when(mockDataSource.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenThrow(const NetworkException(message: 'No internet'));

      final result = await repository.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      expect(result.isLeft(), true);
      result.fold(
        (f) => expect(f, isA<NetworkFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });
}
```

---

## 8. Model Tests

Test `fromJson` and `toJson` for every model.

```dart
// test/features/auth/data/models/user_model_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:bfsi_app/features/auth/data/models/user_model.dart';
import '../../../helpers/test_data.dart';

void main() {
  group('UserModel', () {
    test('fromJson creates correct model', () {
      final model = UserModel.fromJson(TestData.userJson);

      expect(model.id, 'user-001');
      expect(model.name, 'Test User');
      expect(model.email, 'test@bfsi.com');
      expect(model.role, 'customer');
    });

    test('toJson returns correct map', () {
      final model = UserModel.fromJson(TestData.userJson);
      final json = model.toJson();

      expect(json['id'], 'user-001');
      expect(json['email'], 'test@bfsi.com');
    });

    test('fromJson uses defaults for missing optional fields', () {
      final json = {'id': '1', 'name': 'X', 'email': 'x@x.com'};
      final model = UserModel.fromJson(json);

      expect(model.phone, '');
      expect(model.role, 'customer');
    });

    test('fromJson → toJson roundtrip is lossless', () {
      final original = UserModel.fromJson(TestData.userJson);
      final restored = UserModel.fromJson(original.toJson());

      expect(restored, original);
    });
  });
}
```

---

## 9. Notifier (Provider) Tests

Use `ProviderContainer` from `flutter_riverpod` to test notifiers without a widget tree.

```dart
// test/features/auth/presentation/providers/auth_provider_test.dart
import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/features/auth/domain/usecases/login_usecase.dart';
import 'package:bfsi_app/features/auth/presentation/providers/auth_provider.dart';
import '../../../helpers/mock_providers.mocks.dart';
import '../../../helpers/test_data.dart';

void main() {
  late ProviderContainer container;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(mockRepository),
      ],
    );
  });

  tearDown(() => container.dispose());

  group('AuthNotifier', () {
    test('initial state is idle', () {
      final state = container.read(authProvider);
      expect(state.isLoading, false);
      expect(state.user, null);
      expect(state.error, null);
    });

    test('login sets isLoading then returns user on success', () async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer((_) async => const Right(TestData.testUser));

      final notifier = container.read(authProvider.notifier);
      final success = await notifier.login(
        email: 'test@bfsi.com',
        password: 'password123',
      );

      final state = container.read(authProvider);
      expect(success, true);
      expect(state.user, TestData.testUser);
      expect(state.isLoading, false);
      expect(state.error, null);
    });

    test('login sets error on failure', () async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer(
          (_) async => const Left(ServerFailure(message: 'Invalid credentials')));

      final notifier = container.read(authProvider.notifier);
      final success = await notifier.login(
        email: 'test@bfsi.com',
        password: 'wrong',
      );

      final state = container.read(authProvider);
      expect(success, false);
      expect(state.user, null);
      expect(state.error, 'Invalid credentials');
    });

    test('logout resets state to idle', () async {
      when(mockRepository.logout())
          .thenAnswer((_) async => const Right(null));

      await container.read(authProvider.notifier).logout();

      final state = container.read(authProvider);
      expect(state.user, null);
      expect(state.isLoading, false);
    });
  });
}
```

---

## 10. Widget Tests

Test that screens render correctly and respond to state changes.

```dart
// test/features/auth/presentation/screens/login_screen_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mockito/mockito.dart';
import 'package:bfsi_app/features/auth/presentation/screens/login_screen.dart';
import 'package:bfsi_app/features/auth/presentation/providers/auth_provider.dart';
import '../../../helpers/mock_providers.mocks.dart';

void main() {
  late MockAuthRepository mockRepository;

  setUp(() => mockRepository = MockAuthRepository());

  Widget buildSubject() => ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(mockRepository),
        ],
        child: MaterialApp(
          home: const LoginScreen(),
        ),
      );

  group('LoginScreen', () {
    testWidgets('renders email and password fields', (tester) async {
      await tester.pumpWidget(buildSubject());

      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
    });

    testWidgets('shows validation errors on empty submit', (tester) async {
      await tester.pumpWidget(buildSubject());

      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('shows error banner on login failure', (tester) async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer(
          (_) async => const Left(ServerFailure(message: 'Invalid credentials')));

      await tester.pumpWidget(buildSubject());

      await tester.enterText(find.byType(TextFormField).first, 'test@bfsi.com');
      await tester.enterText(find.byType(TextFormField).last, 'wrongpass');
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      expect(find.text('Invalid credentials'), findsOneWidget);
    });

    testWidgets('shows loading indicator while logging in', (tester) async {
      when(mockRepository.login(
        email: anyNamed('email'),
        password: anyNamed('password'),
      )).thenAnswer((_) => Future.delayed(const Duration(seconds: 2),
          () => const Right(TestData.testUser)));

      await tester.pumpWidget(buildSubject());

      await tester.enterText(find.byType(TextFormField).first, 'test@bfsi.com');
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
```

---

## 11. Test Naming Convention

Use the `group → test` hierarchy with consistent naming:

```
group('<ClassName>')
  group('<methodName>')
    test('<condition> → <expected outcome>')
```

Examples:
```dart
group('AuthRepositoryImpl', () {
  group('login', () {
    test('returns Right(UserEntity) when datasource succeeds', ...);
    test('returns Left(UnauthorizedFailure) on UnauthorizedException', ...);
    test('returns Left(NetworkFailure) on NetworkException', ...);
  });
});
```

Rules:
- Group name = class name (no "Test" suffix)
- Inner group name = method or scenario name
- Test name describes the condition and expected outcome — never "should do X"
- Write `returns`, `emits`, `throws`, `calls` — not `should return`, `should emit`

---

## 12. setUp and tearDown

```dart
setUp(() {
  // Initialise mocks and system under test before each test
  mockRepo = MockAuthRepository();
  usecase = LoginUsecase(mockRepo);
});

tearDown(() {
  // Dispose ProviderContainers and close streams
  container.dispose();
});
```

- Always dispose `ProviderContainer` in `tearDown`
- Never share mutable state between tests — always re-initialise in `setUp`

---

## 13. Coverage Requirements

| Layer | Minimum Coverage |
|---|---|
| Domain — Usecases | 100% |
| Data — Models (`fromJson`/`toJson`) | 100% |
| Data — Repositories | 90% |
| Presentation — Notifiers | 80% |
| Presentation — Screens | 60% |

Run coverage:

```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

---

## 14. Running Tests

```bash
# All tests
flutter test

# Single file
flutter test test/features/auth/domain/usecases/login_usecase_test.dart

# With coverage
flutter test --coverage

# Regenerate mocks
flutter pub run build_runner build --delete-conflicting-outputs
```

---

## 15. Do NOT

- Do not test Flutter or Dart framework internals
- Do not write tests that depend on execution order
- Do not share mock instances between tests — recreate in `setUp`
- Do not use `sleep` or real `Future.delayed` in tests — use `fake_async` or mock the delay
- Do not assert on implementation details — assert on the public contract
- Do not skip edge cases: empty list, null fields, network failure, 401, 500
- Do not leave `verify` calls without `verifyNoMoreInteractions` when interaction count matters
- Do not write widget tests that rely on pixel positions or hardcoded sizes
  earDown

```dart
setUp(() {
  // Initialise mocks and system under test before each test
  mockRepo = MockAuthRepository();
  usecase = LoginUsecase(mockRepo);
});

tearDown(() {
  // Dispose ProviderContainers and close streams
  container.dispose();
});
```

- Always dispose `ProviderContainer` in `tearDown`
- Never share mutable state between tests — always re-initialise in `setUp`

---

## 13. Coverage Requirements

| Layer | Minimum Coverage |
|---|---|
| Domain — Usecases | 100% |
| Data — Models (`fromJson`/`toJson`) | 100% |
| Data — Repositories | 90% |
| Presentation — Notifiers | 80% |
| Presentation — Screens | 60% |

Run coverage:

```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

---

## 14. Running Tests

```bash
# All tests
flutter test

# Single file
flutter test test/features/auth/domain/usecases/login_usecase_test.dart

# With coverage
flutter test --coverage

# Regenerate mocks
flutter pub run build_runner build --delete-conflicting-outputs
```

---

## 15. Do NOT

- Do not test Flutter or Dart framework internals
- Do not write tests that depend on execution order
- Do not share mock instances between tests — recreate in `setUp`
- Do not use `sleep` or real `Future.delayed` in tests — use `fake_async` or mock the delay
- Do not assert on implementation details — assert on the public contract
- Do not skip edge cases: empty list, null fields, network failure, 401, 500
- Do not leave `verify` calls without `verifyNoMoreInteractions` when interaction count matters
- Do not write widget tests that rely on pixel positions or hardcoded sizes
