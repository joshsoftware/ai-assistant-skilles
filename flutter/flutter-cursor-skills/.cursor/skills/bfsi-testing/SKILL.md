---
name: bfsi-testing
description: Enforces unit/widget testing standards for this Flutter BFSI app using Clean Architecture, Riverpod, and mockito. Use when writing or updating tests, adding mocks, or aligning test folder structure and coverage expectations.
---

# BFSI Testing

## Before coding

1. Read the full project spec: [skills-data/skills_unit_testing.md](../../../skills-data/skills_unit_testing.md)
2. Ensure tests mirror the `lib/` folder structure under `test/`
3. Prefer testing layers independently (usecases, repositories, notifiers, datasources, models, widgets)

## Core rules

- Use `mockito` (annotation-based) for mocks; avoid hand-written mocks
- Test naming follows the spec (`group('<Class>') → group('<method>') → test('<condition> → <outcome>')`)
- Do not test Flutter framework behaviour or Dart language features
- Keep failures and error mapping covered (repositories/notifiers)

## Full reference

Canonical spec and templates: [reference.md](reference.md) → [skills-data/skills_unit_testing.md](../../../skills-data/skills_unit_testing.md).
