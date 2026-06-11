# BFSI React — Bootstrap Scripts

Two scripts that take you from nothing to a tailored, AI-ready BFSI React
project. They mirror the Flutter `bootstrap/` flow:

| Flutter                          | React (here)                                  |
| -------------------------------- | --------------------------------------------- |
| `flutter create` (bare app)      | `npm create vite` (bare React + TS app)       |
| copy skills from repo            | clone the `.claude` toolkit from repo         |
| `project-bootstrap` skill builds | `bfsi-bootstrap` skill builds the foundation  |

**The boilerplate is not cloned.** A fresh app is generated with **npm**, and the
`bfsi-bootstrap` skill — which contains the complete boilerplate setup spec —
drives Claude to build out the full BFSI foundation.

```text
reactjs/
├── bootstrap/
│   ├── create_react_project.sh   # 1. npm create vite + clone .claude toolkit
│   └── setup_architecture.sh     # 2. run the bfsi-bootstrap skill via Claude
└── bfsi-boilerplate/
    └── .claude/skills/bfsi-bootstrap/   # the "complete boilerplate setup" skill
```

## Prerequisites

- `git`, `node` (≥ 20), `npm`
- For step 2: the [`claude`](https://code.claude.com) CLI
- On Windows: run via **Git Bash** or **WSL**

## Step 1 — Create the base project

Generates a fresh Vite + React + TypeScript app with npm and clones **only** the
`.claude` toolkit (skills/agents/commands/hooks) from this repo.

### Download Bootstrap Script

```bash
curl -O https://raw.githubusercontent.com/joshsoftware/ai-assistant-skilles/main/reactjs/bootstrap/create_react_project.sh
```

Make it executable:

```bash
chmod +x create_react_project.sh
```

### Create Claude Project

```bash
./create_react_project.sh my-bank-app
```

Open:

```bash
cd my-bank-app
claude
```

### Create Cursor Project

```bash
./create_react_project.sh my-bank-app cursor
```

Open:

```bash
cd my-bank-app
cursor .
```

What it does:

1. `npm create vite@latest my-bank-app -- --template react-ts`.
2. Clones the repo (sparse — `.claude` only) and copies it into `my-bank-app/.claude/`.
3. `npm install` (skip with `NO_INSTALL=1`).

Cursor mode mirrors `.claude/skills` → `.cursor/skills` and writes the bootstrap
skill to `AGENTS.md`.

| Env var       | Default                              | Purpose            |
| ------------- | ------------------------------------ | ------------------ |
| `BFSI_BRANCH` | `main`                               | Branch to clone    |
| `BFSI_REPO`   | `joshsoftware/ai-assistant-skilles`  | Repo to clone      |
| `NO_INSTALL`  | _(unset)_                            | `1` to skip install|

## Step 2 — Generate the boilerplate (skill-driven)

Drives Claude Code headlessly and invokes the **`bfsi-bootstrap`** skill, which
builds the complete foundation from scratch — dependencies (npm), tooling config,
folder structure, HTTP/PII/i18n primitives, routing, layouts, and the `login`
reference feature — **without scaffolding business features**.

### Download Setup Script

```bash
curl -O https://raw.githubusercontent.com/joshsoftware/ai-assistant-skilles/main/reactjs/bootstrap/setup_architecture.sh
```

Make it executable:

```bash
chmod +x setup_architecture.sh
```

### Run it against the project

From the same directory (`setup_architecture.sh` takes the project dir as an
argument — no need to `cd` in):

```bash
./setup_architecture.sh my-bank-app                    # uses package.json name
./setup_architecture.sh my-bank-app --scope @my-bank   # set an npm scope
```

Or, interactively: `cd my-bank-app`, open `claude`, and say **"set up the BFSI
boilerplate"**.

| Arg / flag     | Default                  | Purpose                          |
| -------------- | ------------------------ | -------------------------------- |
| `project_dir`  | `.`                      | Project to bootstrap             |
| `--scope`      | derived from package name| npm scope / attribution          |
| `CLAUDE_MODEL` | _(claude default)_       | Passed to `claude --model`       |

## Step 3 — Build features

```text
/bfsi-feature KycVerification
```

Set the canonical pattern in the first feature, commit it, then build the rest in
fresh sessions primed off that commit (see the working discipline in the
generated `CLAUDE.md`). Run the app with `npm run dev`.
