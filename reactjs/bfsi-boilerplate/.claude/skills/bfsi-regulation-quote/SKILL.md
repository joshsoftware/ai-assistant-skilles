---
name: bfsi-regulation-quote
description: Returns the verbatim (or close-paraphrase) text of a cited BFSI regulation passage — RBI Annex I §<n.m>, PCI-DSS v4.0 §<n.m.p>, IRDAI ICS §<n.m>, or OWASP A<NN>:<year> — by reading the local quoted reference files under `packages/claude-toolkit/references/`. Use when the user asks "what does RBI §X say", "show me the PCI requirement", "quote the IRDAI section", "verify this citation", or when an agent's claim cites a regulation and a reviewer wants to confirm the wording.
---

# BFSI Regulation Quote

Reference skill. Returns the actual quoted text behind any citation the toolkit's agents make, so claims like "RBI Annexure I §16 mandates audit log retention" can be verified instead of trusted blindly.

The toolkit ships five quoted-reference files under `packages/claude-toolkit/references/`:

| Reference                           | Citation grammar                      | Source                                                                      |
| ----------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `rbi-annexure-i.md`                 | `RBI Annexure I §<n>.<m>` (n = 1–24)  | RBI/2015-16/418 (June 2, 2016), Annex I — 24 baseline sections              |
| `pci-dss-v4.0-frontend-relevant.md` | `PCI-DSS v4.0 §<n.m.p>`               | PCI SSC, v4.0 (March 2022) / v4.0.1 (June 2024)                             |
| `irdai-cybersec-guidelines.md`      | `IRDAI ICS §<n.m>` (2023 numbering)   | IRDAI/GA&HR/GDL/MISC/88/04/2023 (April 2023) — supersedes the 2017 circular |
| `owasp-top-10-2024.md`              | `OWASP A<NN>:<year>` (2025 or 2021)   | OWASP Foundation, CC BY-SA 4.0                                              |
| `claude-code-changelog.md`          | `claude-code v<X.Y.Z>` (feature pins) | Anthropic CHANGELOG.md (verified) + community mirrors                       |

---

## Workflow

### Step 1 — Parse the citation

Identify which framework + which section the user (or another agent) is citing. The four citation grammars are listed in the table above; map each input to the right reference file.

Common normalisations:

- `§6.2` and `§ 6.2` and `section 6.2` and `6.2` are equivalent — strip leading symbols.
- For RBI, sub-items use `a, b, c` after the number (e.g. `§19.6(a)`). Preserve the parenthesised letter.
- For PCI v4.0, sub-requirements go three deep (e.g. `§10.2.1.4`). Don't auto-truncate to two.
- For OWASP, the year is part of the address — `A01:2021` and `A01:2025` may differ in scope.
- If the citation looks like legacy IRDAI 2017 numbering (`§4.1`, `§4.4`, `§5.2`, `§5.4`), use the mapping in `irdai-cybersec-guidelines.md`'s top-of-file table; report BOTH the legacy citation and the canonical 2023 anchor.

### Step 2 — Open the reference file

`Read` the relevant file under `packages/claude-toolkit/references/`. Don't fetch the upstream URL unless the user explicitly asks for the live version — the local copy is authoritative for verification.

### Step 3 — Locate the section

Each reference file uses Markdown headers as section anchors:

- RBI: `## §<n> — <title>` for top-level sections; sub-items appear as `**<n>.<m>**` in bold within the section.
- PCI: `## Req §<n.m.p>` per requirement.
- IRDAI: `## §<n.m> — <title>`.
- OWASP: `## A<NN>:<year> – <title>`.

If grep on the exact section header fails, fall back to a fuzzy search (e.g. `§16` matches both `§16` and `§16.x`).

### Step 4 — Return the passage

Format the response as:

```
**[<framework>] <citation>** — <section title from the file>

> <quoted passage, indented as a blockquote>

— from `packages/claude-toolkit/references/<file>`, retrieved <date from file's top>.
```

If the passage is long (more than ~300 words), include the first paragraph verbatim plus a "see full text" pointer rather than dumping the entire section. The user can read the file directly if they want more.

### Step 5 — Surface mismatches

If the calling agent's claim about what the section says **disagrees** with the actual text (e.g. agent claimed "§8 covers logging" but §8 is "User Access Control"), flag this explicitly:

```
⚠ Citation mismatch: the agent's claim "§8 — Logging" does not match the actual section
title "§8 — User Access Control / Management". Logging is in §16 + §17. Recommended fix:
update the agent's citation to `RBI Annexure I §16` (Audit log maintenance) or `§17`
(Audit log capture settings).
```

This is the skill's highest-leverage function — it catches drift between agent prompts and reality.

---

## Examples

### Verify an RBI claim

User: "The audit said this violates RBI Annexure I §6.2 — can you show me what §6.2 actually says?"

Skill response:

> **[RBI Annexure I] §6.2** — Application Security Life Cycle (Source code audits)
>
> > In respect of critical business applications, banks may consider conducting source code audits by professionally competent personnel/service providers or have assurance from application providers/OEMs that the application is free from embedded malicious / fraudulent code.
>
> — from `packages/claude-toolkit/references/rbi-annexure-i.md`, retrieved 2026-05-21.
>
> ⚠ Note: §6.2 specifically addresses **source-code audits**, not session timeouts. If the audit was about session timeout, the relevant anchors are `§6.4` (session management within ASLC) and `§8` (User Access Control / Management).

### Verify a PCI claim across v3.2.1 → v4.0

User: "Show me PCI-DSS req 6.5.10."

Skill response:

> **[PCI-DSS v4.0] §6.2.4 (was v3.2.1 §6.5.10)** — Broken authentication
>
> v3.2.1's standalone §6.5.10 ("Broken authentication and session management") was consolidated in v4.0 into §6.2.4, which lists multiple attack categories — injection, XSS, broken auth, etc. — as sub-bullets of a single requirement on bespoke / custom software engineering technique.
>
> > <verbatim v4.0 §6.2.4 text from the reference file>
>
> — from `packages/claude-toolkit/references/pci-dss-v4.0-frontend-relevant.md`. Use **v4.0 numbering** in new commits; the toolkit's older citations using v3.2.1 numbers are tracked in the v3.2.1 → v4.0 mapping table in that file.

### Verify an OWASP claim

User: "What's OWASP A01:2021?"

Skill response:

> **[OWASP] A01:2021** — Broken Access Control
>
> > <description from the reference file>
>
> — from `packages/claude-toolkit/references/owasp-top-10-2024.md`. (The current edition is 2025; A01 is still Broken Access Control. The reference file documents both editions with explicit cross-references where the categories differ.)

### Confirm a Claude Code feature version

User: "Does the `PostCompact` hook exist? What version added it?"

Skill response:

> **[Claude Code] PostCompact event** — first shipped in v2.1.76 (March 14, 2026).
>
> > <quoted changelog entry>
>
> — from `packages/claude-toolkit/references/claude-code-changelog.md`. The toolkit's current `engines.claude-code` pin is `>=2.1.85`, so PostCompact is available on every supported version.

---

## Conventions enforced

- **Cite the local reference file, not the upstream URL** — local copy is what the toolkit actually shipped on. If the upstream document has changed, the drift-detection workflow (planned `/bfsi-drift`) is the right tool, not this skill.
- **Preserve the original section numbering scheme** of each document. Don't translate RBI's `a, b, c` sub-items into bullet syntax; don't flatten PCI's three-level nesting.
- **Surface mismatches loudly** when an agent's claim diverges from the actual text. Quiet correction is worse than confident error — say "this is wrong, here is what it actually says".
- **Don't hallucinate sections that aren't in the file** — if the user asks for a section the file doesn't contain (e.g. PCI §11.x backend reqs intentionally omitted), say so and point at the upstream source.

---

## When NOT to use

- **Live regulation drift** — if the user wants "the latest RBI guidance as of today", this skill returns the _frozen_ local copy. Use the planned `/bfsi-drift` command (or fetch the upstream URL via WebFetch) for live state.
- **Backend-only requirements** — most of PCI's §1.x (firewalls), §2.x (system hardening), §9.x (physical security), §11.x (network testing), §12.x (policy) are intentionally absent from the frontend-relevant reference file. Don't fabricate them.
- **Legal interpretation** — these references are technical-compliance aids, not legal advice. The skill won't tell a user "you are in compliance" or "you are not"; it returns the text and lets the user (or `bfsi-compliance-auditor`) judge.

---

## References

- [`../references/rbi-annexure-i.md`](../references/rbi-annexure-i.md)
- [`../references/pci-dss-v4.0-frontend-relevant.md`](../references/pci-dss-v4.0-frontend-relevant.md)
- [`../references/irdai-cybersec-guidelines.md`](../references/irdai-cybersec-guidelines.md)
- [`../references/owasp-top-10-2024.md`](../references/owasp-top-10-2024.md)
- [`../references/claude-code-changelog.md`](../references/claude-code-changelog.md)
