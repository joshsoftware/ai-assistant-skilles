---
name: bfsi-caching
description: Enforces BFSI caching standards (Hive cache entries, TTL constants, invalidation, and cache-first patterns) for this Flutter app. Use when adding caching to repositories/datasources, defining TTLs, cache keys, or implementing offline and stale-while-refresh flows.
---

# BFSI Caching

## Before coding

1. Read the full project spec: [skills-data/skills_caching.md](../../../skills-data/skills_caching.md)
2. If touching repositories, also follow the project API and error standards: [skills-data/skills_api_standards.md](../../../skills-data/skills_api_standards.md)
3. Match existing repository patterns under `lib/features/**/data/repositories/`

## Core rules

- Use **cache-first with background refresh** only where allowed by the spec
- Never cache write operations (POST/PUT/DELETE)
- Every cached item must include metadata (`cachedAt`, `expiresAt`) — never raw blobs without TTL
- TTLs must be defined as constants (no inline `Duration(...)` in business code)
- Invalidation must be explicit and predictable (no silent forever-caches)

## Full reference

Canonical spec and examples: [reference.md](reference.md) → [skills-data/skills_caching.md](../../../skills-data/skills_caching.md).
