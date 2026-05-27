# Authentication & Authorisation — Full Specification

**Canonical source:** [skills-data/skills_auth.md](../../../skills-data/skills_auth.md)

Read that file in full before implementing or modifying any auth feature. It contains:

1. Authentication overview (JWT, refresh, biometric, session)
2. Token lifecycle and storage keys
3. `AuthInterceptor` rules and sample code
4. Login flow (usecase, validation, `AuthNotifier`)
5. Logout flow (ordered steps)
6. Forgot password (anti-enumeration)
7. Biometric authentication (`BiometricService`, action matrix)
8. Session management (`SessionManager`, lifecycle)
9. `go_router` redirect guard and route table
10. Role-based access (usecase enforcement)
11. MPIN (hashing, validation, lockout)
12. Security checklist
13. Folder structure
14. Do NOT list

Keep `skills-data/skills_auth.md` and this skill in sync when standards change.
