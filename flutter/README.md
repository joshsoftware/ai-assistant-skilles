# Flutter AI Skills Framework

Reusable Flutter AI skills for Claude and Cursor.

This framework standardizes:

* Clean Architecture
* Feature-first development
* API integrations
* Authentication
* Local storage
* Caching
* Testing
* Pull Request Reviews

---

# Repository Structure

```text
flutter/
├── README.md
├── AGENTS.md
├── CLAUDE.md
│
├── bootstrap/
│   └── create_flutter_project.sh
│
└── skills/
    ├── project-bootstrap/
    ├── architecture/
    ├── api-standards/
    ├── auth-standards/
    ├── data-storage/
    ├── caching/
    ├── unit-testing/
    └── flutter-pr-review/
```

---

# Prerequisites

Install either:

## Flutter

```bash
flutter --version
```

## FVM

```bash
fvm --version
```

The bootstrap script automatically prefers FVM and falls back to Flutter.

---

# Download Bootstrap Script

```bash
curl -O https://raw.githubusercontent.com/joshsoftware/ai-assistant-skilles/tree/main/flutter/bootstrap/create_flutter_project.sh
```

Make it executable:

```bash
chmod +x create_flutter_project.sh
```

---

# Create Cursor Project

```bash
./create_flutter_project.sh banking_app cursor
```

Open:

```bash
cd banking_app
cursor .
```

---

# Create Claude Project

```bash
./create_flutter_project.sh banking_app claude
```

Open:

```bash
cd banking_app
claude
```

---

# Available Skills

| Skill             | Purpose                                 |
| ----------------- | --------------------------------------- |
| project-bootstrap | Project initialization                  |
| architecture      | Architecture and feature generation     |
| api-standards     | APIs, repositories, models, datasources |
| auth-standards    | Authentication and authorization        |
| data-storage      | Hive and Secure Storage                 |
| caching           | Offline support and caching             |
| unit-testing      | Unit, widget and integration testing    |
| flutter-pr-review | Pull request review                     |

---

# Developer Workflow

## Step 1

Initialize the project:

```text
Initialize this project
```

The AI automatically:

* Loads project-bootstrap
* Loads architecture
* Creates the project foundation

---

## Step 2

Create a feature:

```text
Create Customer feature
```

The AI automatically:

* Creates domain layer
* Creates data layer
* Creates presentation layer
* Creates providers
* Creates routing
* Creates tests when required

---

## Step 3

Create authentication:

```text
Create Login feature
```

The AI automatically applies:

* architecture
* auth-standards
* data-storage
* unit-testing

---

## Step 4

Add caching:

```text
Add caching to Customer feature
```

The AI automatically applies:

* caching

---

## Step 5

Generate tests:

```text
Generate tests for Customer feature
```

The AI automatically applies:

* unit-testing

---

## Step 6

Review code:

```text
Review current branch changes
```

The AI automatically applies:

* flutter-pr-review

---

# Example Prompts

```text
Initialize this project

Create Login feature

Create Customer feature

Create Dashboard feature

Add caching to Customer feature

Generate tests for Customer feature

Review current branch changes
```

---

# Architecture

The architecture specification is defined in:

```text
skills/architecture/SKILL.md
```

This is the source of truth for:

* Clean Architecture
* Feature First Structure
* Dependency Rules
* Riverpod
* GoRouter
* Dio
* Hive
* Secure Storage
* Testing Standards

All generated code must follow this specification.

---

# Project Priorities

1. Security
2. Scalability
3. Clean Architecture
4. Testability
5. Maintainability

All skills and generated code must follow these priorities.
