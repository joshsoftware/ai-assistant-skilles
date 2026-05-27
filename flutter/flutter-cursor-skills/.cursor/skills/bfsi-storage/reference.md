# Storage — Full Specification

**Canonical source:** [skills-data/skills_data_storage.md](../../../skills-data/skills_data_storage.md)

Read that file in full before implementing any storage. It defines:

- Secure storage vs local DB responsibilities
- `SecureStorageService` usage and reserved keys via `AppConstants`
- Hive box naming, typed reads/writes, and sensitive-data prohibitions
- Logout/session cleanup expectations

Keep `skills-data/skills_data_storage.md` and this skill in sync when standards change.
