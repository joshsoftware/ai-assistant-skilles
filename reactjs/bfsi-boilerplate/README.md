# BFSI React Toolkit & Boilerplate Spec

This folder is the **canonical BFSI front-end toolkit** for the organisation. It
is no longer a clonable app — the boilerplate is **generated**, not copied.

It contains exactly two things:

- **`.claude/`** — the Claude Code toolkit: skills, agents, slash commands, and
  hooks that encode every BFSI convention.
- **`CLAUDE.md`** — the conventions contract + the template the bootstrap skill
  uses to write each new project's `CLAUDE.md`.

The complete application boilerplate (folder structure, HTTP/PII/i18n primitives,
routing, layouts, the `login` reference feature, and all config) is generated
from scratch by the **`bfsi-bootstrap`** skill — see
[`.claude/skills/bfsi-bootstrap/SKILL.md`](.claude/skills/bfsi-bootstrap/SKILL.md).

## Creating a new project — step by step

This mirrors the Flutter flow: `flutter create` + `project-bootstrap` skill ↔
`npm create vite` + `bfsi-bootstrap` skill.

### Prerequisites

- **Node.js** ≥ 20 and **npm** (bundled with Node)
- **git**
- The **[`claude`](https://code.claude.com)** CLI (needed for Step 2)
- On **Windows**, run the scripts from **Git Bash** or **WSL** (they are bash)

### Step 1 — Create the base project

Download the script (self-contained — it clones the `.claude/` toolkit itself):

```bash
curl -O https://raw.githubusercontent.com/joshsoftware/ai-assistant-skilles/main/reactjs/bootstrap/create_react_project.sh
chmod +x create_react_project.sh
```

From the folder where you want the project to live, run it:

```bash
./create_react_project.sh my-bank-app        # or: ./create_react_project.sh my-bank-app cursor
```

This generates a Vite + React + TS app, clones **only** this `.claude/` toolkit
into it, and runs `npm install`. (Pass `cursor` as a second arg for Cursor.)

### Step 2 — Generate the BFSI boilerplate (skill-driven)

Download the script:

```bash
curl -O https://raw.githubusercontent.com/joshsoftware/ai-assistant-skilles/main/reactjs/bootstrap/setup_architecture.sh
chmod +x setup_architecture.sh
```

Run it against the project (it takes the project dir as an argument — no `cd`):

```bash
./setup_architecture.sh my-bank-app
```

This drives Claude to run the **`bfsi-bootstrap`** skill, which builds the full
foundation — config, folder structure, HTTP/PII/i18n primitives, routing,
layouts, and the `login` reference feature.

> **Interactive alternative:** instead of Step 2, `cd my-bank-app`, open `claude`,
> and say **"set up the BFSI boilerplate"**.

### Step 3 — Configure environment

The skill creates `.env.local` from the sample. Open it and fill in real values
(at minimum `VITE_API_BASE_URL`):

```bash
# edit .env.local — the app throws at boot on missing/invalid env (Zod-validated)
```

### Step 4 — Run the application

```bash
npm run dev        # dev server on http://localhost:5173
```

Open http://localhost:5173 in your browser. The `login` reference feature is the
canonical pattern to build from.

### Step 5 — Verify the setup (optional but recommended)

```bash
npm run typecheck  # tsc --noEmit
npm test           # vitest run
npm run lint       # eslint, --max-warnings 0
npm run build      # production build
```

Inside a `claude` session, run `/bfsi-doctor` to confirm hooks, skills, and
agents are wired up.

### Step 6 — Build your first feature

```text
/bfsi-feature KycVerification
```

Set the canonical pattern in the first feature, commit it, then build the rest in
fresh sessions primed off that commit.

## Stack the skill generates

| Layer         | Choice                                                              |
| ------------- | ------------------------------------------------------------------- |
| Framework     | **React 19** + **Vite 5** + **TypeScript** (`strict`)               |
| Styling       | **Tailwind CSS** + **shadcn/ui** (`src/components/ui/`)              |
| Forms         | **React Hook Form** + **Zod**                                       |
| Routing       | **react-router-dom v6** with `<ProtectedRoute permission="...">`    |
| Server state  | **TanStack Query v5**                                               |
| Client state  | **Zustand v5** (UI-only)                                            |
| HTTP          | **axios**, single shared instance, in-memory token                  |
| i18n          | **react-i18next** (`en`, `hi`)                                      |
| Tests         | **Vitest** + **Testing Library** + **Playwright**                   |
| Lint / format | **ESLint 9** (`--max-warnings 0`) + **Prettier**                    |
| Git hooks     | **Husky** + **lint-staged** + **commitlint**                        |
| Package mgr   | **npm**                                                             |

## Critical BFSI conventions (baked into the toolkit)

1. Tokens never in `localStorage` — in-memory via `setAuthToken`.
2. PII fields display via `<PIIMaskedDisplay>` — never raw PAN/Aadhaar/account.
3. No card data in HTML inputs.
4. All routes `<ProtectedRoute permission="...">` with explicit permissions.
5. No `dangerouslySetInnerHTML` unless sanitised.
6. No `console.log` of PII (PAN, Aadhaar, account, password, OTP).
7. Network shapes are TS interfaces; Zod validates form input + env only.
8. No `any`. All user-facing strings via `t()`.
9. Conventional Commits with BFSI types. No `Co-Authored-By` trailer.

## The Claude toolkit (`.claude/`)

- **Slash commands** — `/bfsi-scaffold`, `/bfsi-feature`, `/bfsi-doctor`,
  `/bfsi-review`, `/bfsi-onboarding`, and more.
- **Skills** — action + reference skills for features, forms, PII, data layer,
  performance, testing, and the `bfsi-bootstrap` foundation generator.
- **Agents** — architect, security / compliance / performance / a11y reviewers,
  PR reviewer, PII scanner.
- **Hooks** — file-protection, secret + PII scanners, formatter, linter, and
  asset-location guards.

Run `/bfsi-doctor` in a generated project to confirm everything is wired.

## Project priorities

Security → Scalability → Clean Architecture → Testability → Maintainability.
