# Flutter PR Review — Reference Checklists

Source: Flutter PR Reviewer guide. Use with [SKILL.md](SKILL.md).

## Architecture

**Verify**

- Business logic is not inside widgets.
- UI and business logic are separated.
- Existing project architecture is followed.
- Responsibilities are properly divided.
- Reusable widgets are extracted where appropriate.

**Flag**

- Large widgets with multiple responsibilities.
- API calls directly from UI widgets.
- Business logic inside `build()` methods.
- Duplicate implementation patterns.

## State management

**Verify**

- State updates are minimal and intentional.
- State is managed consistently (same pattern across the feature).
- Providers are scoped correctly.
- State is disposed when required.

**Flag**

- Unnecessary widget rebuilds.
- Excessive `notifyListeners` calls (or equivalent excessive notifier updates).
- Mutable shared state without control.
- State logic inside UI widgets.

## Performance

**Verify**

- Appropriate use of `const` constructors.
- Efficient list rendering (`ListView.builder`, slivers, pagination).
- Proper image loading and caching.
- Minimal rebuild scope (`Consumer`/`select`, split widgets).

**Flag**

- Heavy work inside `build()`.
- Expensive loops on the UI thread.
- Repeated API calls (no dedup/cache).
- Large unnecessary widget rebuilds.
- Memory leaks (listeners, timers, subscriptions not cancelled).

## Async and lifecycle

**Verify**

- Async operations handle failures.
- Loading states are managed.
- Lifecycle methods are respected (`initState` / `dispose`, route awareness).

**Flag**

- Missing error handling.
- Missing `mounted` / `context.mounted` checks before `setState` or navigation after `await`.
- `setState` after widget disposal.
- Unclosed streams.
- Unreleased controllers.

**Common examples**

- `AnimationController` not disposed.
- `TextEditingController` not disposed.
- `StreamSubscription` not cancelled.

## Null safety

**Verify**

- Nullable values handled safely.
- Defensive programming for API responses (parse/validate before use).

**Flag**

- Excessive use of `!`.
- Potential null dereference.
- Missing null checks on external data.

## Code quality

**Verify**

- Meaningful naming.
- Readable implementation.
- Small, focused methods.
- Reusable components.

**Flag**

- Duplicate code.
- Deep nesting.
- Large methods.
- Magic numbers (prefer named constants).
- Unclear variable names.

## Localization

**Verify**

- User-facing strings are localized.
- Localization keys are used consistently.

**Flag**

- Hardcoded user-facing strings.
- Missing translations for new keys.
- Language-specific assumptions (layout copy, date/number formats without `intl`).

## Accessibility

**Verify**

- Proper semantics (`Semantics`, labels on interactive widgets).
- Screen reader compatibility.
- Scalable layouts (respect text scale, avoid fixed-only sizing for text).

**Flag**

- Missing semantic labels.
- Icon-only actions without descriptions.
- Fixed text sizes causing layout overflow at large accessibility settings.

## Security

**Verify**

- Sensitive information is protected (secure storage, no PII in logs).
- No secrets are committed.

**Flag**

- Hardcoded credentials or API keys.
- Logging tokens, passwords, OTPs, or MPINs.
- Exposed internal endpoints in client code.

## Testing

**Verify**

- New business logic has tests.
- Critical paths remain covered after the change.

**Flag**

- Missing unit tests for usecases/repositories.
- Missing widget tests for new screens or complex UI flows.
- Missing regression coverage for fixed bugs.

## Dependencies

**Verify**

- New dependencies are necessary.
- Dependency versions are reasonable and aligned with the project.

**Flag**

- Unused packages added to `pubspec.yaml`.
- Duplicate functionality from an existing package.
- Heavy packages added for trivial tasks.

## Severity quick reference

| Critical | Major | Minor |
|----------|-------|-------|
| Crashes | Architecture violations | Readability |
| Data loss | Maintainability debt | Consistency |
| Security holes | Performance bottlenecks | Best-practice nudges |
| Broken business flows | Incorrect behavior | Naming/style (non-blocking) |
| Production incident risk | | |
