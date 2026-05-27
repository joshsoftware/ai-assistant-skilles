---
name: bfsi-storage
description: Enforces secure storage (FlutterSecureStorage) and local storage (Hive) standards for this Flutter BFSI app. Use when storing tokens, secrets, PIN/MPIN, user preferences, cached responses, or when editing SecureStorageService, AppConstants keys, or Hive boxes.
---

# BFSI Storage (Secure + Local)

## Before coding

1. Read the full project spec: [skills-data/skills_data_storage.md](../../../skills-data/skills_data_storage.md)
2. If auth-related (tokens / logout), also read: [skills-data/skills_auth.md](../../../skills-data/skills_auth.md)
3. Match existing code under `lib/core/storage/` and feature `data/` layers

## Architecture (non-negotiable)

| Data | Where it must live |
|------|---------------------|
| Tokens, secrets, PIN/MPIN, credentials | `FlutterSecureStorage` via `SecureStorageService` only |
| Cached API responses, preferences, offline data | Hive (`hive` + `hive_flutter`) |

Never mix these responsibilities.

## Secure storage rules

- Never call `FlutterSecureStorage` directly from features; always use `SecureStorageService`
- Never use raw string keys; keys must be constants in `AppConstants`
- Never log secure storage values
- Always handle `null` on reads
- Logout: use `clearAll()` (do not selectively delete only the access token)

## Hive rules

- Never store tokens or secrets in Hive
- Use a consistent box/key strategy from the spec (no ad-hoc names)
- Writes and reads must be explicitly typed/cast (avoid `dynamic` return types)

## Full reference

Canonical spec and checklists: [reference.md](reference.md) → [skills-data/skills_data_storage.md](../../../skills-data/skills_data_storage.md).
