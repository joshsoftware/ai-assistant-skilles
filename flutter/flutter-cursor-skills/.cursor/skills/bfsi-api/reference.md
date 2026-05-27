# API Standards — Full Specification

**Canonical source:** [skills/skills_api_standards.md](../../../skills/skills_api_standards.md)

Read that file in full before implementing or modifying any API layer code. It contains:

1. Base configuration (`ApiClient`, `ApiConstants`, timeouts, headers)
2. Endpoint naming and grouping
3. Interceptors (`AuthInterceptor`, `ErrorInterceptor`, `LogInterceptor`) and exception types
4. `ApiClient` method surface (get/post/put/delete only)
5. Data source layer (abstract + `Impl`, model returns, token save on auth)
6. Repository layer (`Either<Failure, T>`, exception → failure mapping)
7. Request and response models (`fromJson` / `toJson`, explicit casts)
8. Backend error response contract (`message`, `code`, `errors`)
9. JWT token handling and logout order
10. Pagination query params and response envelope
11. Riverpod provider wiring
12. Do NOT list

Keep `skills/skills_api_standards.md` and this skill in sync when standards change.
