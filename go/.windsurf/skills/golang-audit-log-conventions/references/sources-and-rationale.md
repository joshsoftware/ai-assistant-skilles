# Sources & Rationale

This skill is **engineering conventions, not a standard.**

## What this skill draws on

- **OWASP logging and audit guidance** — structured, tamper-evident logging; apply cryptographic hashing (HMAC, SHA-256) to log integrity; store in append-only / write-once media; forward to a centralised SIEM.
- **Compliance frameworks' audit-trail requirements** — PCI-DSS, SOX, GDPR, HIPAA all require tamper-resistant audit trails; the common fundamentals (who, what, when, outcome; immutability; retention) are consistent across them.
- **Hash-chaining / secure audit log literature** — Schneier & Kelsey's "Secure audit logs to support computer forensics" (1999) is the foundational work; subsequent research refines tamper-evident logging with MACs and append-only schemes.
- **Go standard library** — `crypto/hmac`, `crypto/sha256`, `sync.Mutex` for the writer, `log/slog` for emission.
- **BFSI obligations** — RBI ITG-RC&AP audit-trail immutability and retention, CERT-In logging requirements, via `golang-bfsi-bindings` go-F-logging.md.

## What is genuinely standardised vs convention

- **Standardised (cryptographic):** HMAC-SHA256, SHA-256 hashing — these are NIST/IETF standards. The tamper-evidence *mechanism* rests on real cryptography.
- **Standardised (compliance):** the *requirement* for tamper-resistant, retained audit trails appears in PCI-DSS, SOX, and (for Indian BFSI) RBI/CERT-In. The requirement is mandated; the implementation is not.
- **Convention:** the Go event model, the chained-record structure, the canonical-serialisation approach, the query interface — all engineering convention.

## Where reasonable people differ

- **Hash chain vs Merkle tree vs external notary** — a simple hash chain is sufficient for most BFSI services and is what this skill shows. Higher-assurance systems use Merkle trees (for efficient partial verification) or anchor to an external timestamp/notary service. The skill makes chaining a SHOULD and anchoring a SHOULD, not MUST.
- **Synchronous in-transaction vs outbox-forwarded** — the *record* must be committed with the action (synchronous). Forwarding it to the central store can be asynchronous via an outbox. The skill requires the former and permits the latter.
- **HMAC vs asymmetric signature** — HMAC is simpler and sufficient when the verifier is trusted; an asymmetric signature lets untrusted parties verify without the ability to forge. The skill mentions both.

## Relationship to BFSI skills

`golang-bfsi-bindings` go-F-logging.md covers audit trails with the regulatory citations (RBI ITG-RC&AP Chapter III audit-trail rules, CERT-In Phase II logging requirements, retention mandates). This skill is the fuller engineering reference for *how* to build a tamper-evident audit subsystem in Go. When both are active, the BFSI skill is authoritative on the regulatory obligations; this skill is the implementation guide.
