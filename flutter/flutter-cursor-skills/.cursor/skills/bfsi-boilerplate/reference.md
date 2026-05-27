# Boilerplate — Full Specification

**Canonical source:** [skills-data/skills_boilerplate.md](../../../skills-data/skills_boilerplate.md)

Read that file before adding a new feature, screen, or package. It defines:

- Architecture (Clean Architecture, feature-first, UI / Domain / Data)
- State management (Riverpod)
- Networking (Dio, centralized client, JWT)
- Security (secure storage, SSL pinning, biometrics, session timeout)
- Local database (Hive)
- Built-in features (login, dashboard, profile, transactions, notifications)
- Code standards (widgets, errors, repository pattern, DI, null safety)
- UI (responsive, Material 3, dark/light)
- Approved packages (`flutter_riverpod`, `dio`, `go_router`, `hive`, `flutter_secure_storage`, `local_auth`)

## Related skills (read when implementing)

| Area | Skill / spec |
|------|----------------|
| API | [bfsi-api](../bfsi-api/SKILL.md) · `skills-data/skills_api_standards.md` |
| Auth | [bfsi-auth](../bfsi-auth/SKILL.md) · `skills-data/skills_auth.md` |
| Storage | `skills-data/skills_data_storage.md` |
| Caching | `skills-data/skills_caching.md` |
| Tests | `skills-data/skills_unit_testing.md` |

Keep `skills-data/skills_boilerplate.md` and this skill in sync when standards change.
