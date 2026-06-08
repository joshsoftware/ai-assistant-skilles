---
name: golang-audit-log-conventions
description: Go audit log conventions — what an audit event is (distinct from application logs), audit event modelling, tamper-evidence via hash chaining and HMAC, append-only storage, what to log and what never to log, retention, and audit-log query and replay. Use whenever Go code records audit events, or when an audit-logging subsystem is being designed or reviewed. Activate on mentions of audit log, audit trail, audit event, tamper-evident, hash chain, append-only log, WORM storage, who-did-what, compliance logging, or "how do I record an audit trail in Go". These are engineering conventions built on widely-accepted security and compliance practice. Standalone skill — intentionally overlaps with golang-bfsi-bindings go-F-logging.md; if both are active the BFSI skill is authoritative on the regulatory obligations (RBI, CERT-In retention and immutability mandates).
---

# Go Audit Log Conventions

Conventions for audit logging in Go services. **These are conventions, not a standard.**

Audit logs are categorically different from application logs. Application logs tell you what the *system* did (for debugging). Audit logs tell you what *actors* did to the system (for security, compliance, and forensics). This skill is about the second kind.

The tamper-evidence techniques (hash chaining, HMAC, append-only/WORM storage) rest on established cryptographic and compliance practice. The Go implementation is engineering convention.

## How to use this skill

1. Walk the rule categories when designing or reviewing audit-logging code.
2. **MUST** violations are blockers. **SHOULD** violations need a documented reason.
3. For BFSI services, audit-trail immutability and retention are regulatory requirements — see `golang-bfsi-bindings` go-F-logging.md (binds RBI ITG-RC&AP audit-trail rules and CERT-In requirements).

## Sources

- OWASP logging and audit guidance (structured, tamper-evident logging).
- Compliance frameworks' audit-trail requirements (PCI-DSS, SOX, GDPR, and India's RBI/CERT-In via the BFSI skills).
- Hash-chaining and HMAC tamper-evidence literature (Schneier–Kelsey secure audit logs, and later work).
- Go standard library: `crypto/hmac`, `crypto/sha256`, `log/slog`.

Full notes: `references/sources-and-rationale.md`.

## Rule categories

| # | Category | Reference file |
|---|---|---|
| A | Audit event vs application log | `references/A-audit-vs-app-log.md` |
| B | Audit event modelling | `references/B-event-modelling.md` |
| C | Tamper-evidence | `references/C-tamper-evidence.md` |
| D | What to log and what never to log | `references/D-what-to-log.md` |
| E | Storage, retention & access | `references/E-storage-retention.md` |
| F | Query, replay & verification | `references/F-query-replay.md` |

---

## Rule index

### A. Audit event vs application log

- **A1 [MUST]** Audit events go to a dedicated audit pipeline, not the application log stream. They have different retention, access control, integrity, and format requirements.
- **A2 [MUST]** An audit event is recorded for: authentication events, authorisation decisions (especially denials), financial state changes, data access to regulated data, configuration changes, privileged actions, and consent changes. *(For BFSI, this list is mandated — see `golang-bfsi-bindings` rule F1.)*
- **A3 [MUST]** Audit events are recorded synchronously with the action they describe, within the same transaction where the action is a database change. An audit event lost because it was fire-and-forget is an audit gap.
- **A4 [SHOULD]** Application logs (debug, info, request traces) are explicitly NOT a substitute for audit events. They are mutable, short-retention, and not tamper-evident.

### B. Audit event modelling

- **B1 [MUST]** Every audit event is a structured, typed record with at minimum: timestamp (UTC), actor identity, action, resource, outcome, and a correlation ID. *(Binds `golang-bfsi-bindings` rule F2.)*
- **B2 [MUST]** The actor is always attributable to a real identity — a named user, a service identity, or a system process. "anonymous" is itself an attributable value; an empty actor field is a defect.
- **B3 [MUST]** The action is a typed enum (`PAYMENT_CREATED`, `LOGIN_FAILED`, `ROLE_GRANTED`), not free text. Free-text actions cannot be reliably queried or alerted on.
- **B4 [MUST]** The outcome is explicit: `SUCCESS`, `FAILURE`, `DENIED`. A failed or denied action is often more important to audit than a successful one.
- **B5 [SHOULD]** Include enough context to reconstruct the event without consulting other systems: the resource ID, the before/after for a state change (where not sensitive), and the source (IP, device).
- **B6 [SHOULD]** Audit events are immutable value objects in code — constructed once, never mutated. A mutable audit event can be altered between creation and persistence.

### C. Tamper-evidence

- **C1 [SHOULD]** Make the audit log tamper-evident with a hash chain: each record includes the hash of the previous record. Altering or deleting any record breaks the chain at that point and is detectable.
- **C2 [SHOULD]** Sign each record (or each chain link) with an HMAC using a key held only by the audit writer. A reader can verify the chain but cannot forge a record. For higher assurance, use an asymmetric signature so verification needs only the public key.
- **C3 [MUST]** The hash/HMAC computation covers all material fields of the record, in a canonical (deterministic) serialisation. A non-deterministic serialisation (map iteration order, unstable JSON) makes verification fail spuriously.
- **C4 [SHOULD]** Periodically anchor the chain — write the current chain-head hash to a separate, independently-controlled store (or a notary/timestamp service) so a wholesale rewrite of the entire log is also detectable.
- **C5 [MUST]** Tamper-evidence detects tampering; it does not prevent it. Pair it with append-only/WORM storage (category E) and strict access control so tampering is both hard and detectable.

### D. What to log and what never to log

- **D1 [MUST]** Never write secrets or full sensitive values into an audit event: passwords, OTPs, PINs, CVV, full card PAN, full Aadhaar, full account number, session tokens, JWTs, cryptographic keys. *(Binds `golang-bfsi-bindings` rule F3.)*
- **D2 [MUST]** Where a sensitive value must be referenced (e.g. "which account"), record a masked or tokenised reference, not the raw value.
- **D3 [SHOULD]** Record the *fact* and *outcome* of a sensitive operation, not its sensitive content. "OTP verification: FAILURE for user X" — never the OTP itself.
- **D4 [SHOULD]** For a state change, record the field that changed and a non-sensitive before/after (e.g. status `pending → completed`). Do not record before/after for sensitive fields; record only that they changed.
- **D5 [MUST]** Audit events are themselves subject to PII rules — apply the same typed-redaction approach used elsewhere (see `golang-credential-management` and the BFSI data skill).

### E. Storage, retention & access

- **E1 [MUST]** Audit events are stored in append-only or WORM (write-once-read-many) storage. No update or delete path exists for audit records within the retention window.
- **E2 [MUST]** Forward audit events to a centralised, access-controlled store (SIEM or a dedicated audit store) promptly, so a compromised host cannot erase its own trail.
- **E3 [MUST]** Retain audit events for the mandated period. For BFSI this is regulator-set (commonly ~10 years for banking transaction trails — verify the applicable direction). *(Binds `golang-bfsi-bindings` rule F5 / M3.)*
- **E4 [MUST]** Access to read the audit log is itself restricted and — ideally — itself audited. The audit log is high-value forensic evidence.
- **E5 [SHOULD]** Store audit events separately from application data so that application-level access (including a compromised application account) cannot reach or alter them.

### F. Query, replay & verification

- **F1 [SHOULD]** Provide a verification routine that walks the hash chain and confirms integrity end to end, reporting the first broken link if any.
- **F2 [SHOULD]** Support querying by actor, resource, action, time range, and correlation ID — these are the dimensions an investigator or auditor needs.
- **F3 [SHOULD]** Support reconstructing the sequence of actions for a single correlation ID across services, so a full transaction can be traced.
- **F4 [MAY]** Support exporting an audit-ready report for a given time range and scope, for regulator or auditor consumption.

## Out of scope

- Application/operational logging — that is `log/slog` usage for debugging; see `golang-documentation-conventions` and general logging practice.
- SIEM configuration, alerting rules — infrastructure / SOC concern.
- The full regulatory basis for BFSI audit trails — see `golang-bfsi-bindings` go-F-logging.md.
