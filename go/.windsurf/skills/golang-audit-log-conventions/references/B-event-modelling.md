# B. Audit Event Modelling

Expands rules B1–B6.

## B1–B4 — The audit event type [MUST]

```go
package audit

type Action string
const (
    ActionLoginSuccess     Action = "LOGIN_SUCCESS"
    ActionLoginFailed      Action = "LOGIN_FAILED"
    ActionPaymentCreated   Action = "PAYMENT_CREATED"
    ActionPaymentReversed  Action = "PAYMENT_REVERSED"
    ActionRoleGranted      Action = "ROLE_GRANTED"
    ActionAccessDenied     Action = "ACCESS_DENIED"
    ActionConfigChanged    Action = "CONFIG_CHANGED"
    ActionDataExported     Action = "DATA_EXPORTED"
    ActionConsentWithdrawn Action = "CONSENT_WITHDRAWN"
)

type Outcome string
const (
    OutcomeSuccess Outcome = "SUCCESS"
    OutcomeFailure Outcome = "FAILURE"
    OutcomeDenied  Outcome = "DENIED"
)

// Event is an immutable audit record (B6).
type Event struct {
    Timestamp     time.Time      // UTC, set at construction
    Actor         string         // attributable identity (B2) — never empty
    ActorType     string         // "user", "service", "system"
    Action        Action         // typed enum (B3)
    Resource      string         // "payment:abc123"
    Outcome       Outcome        // explicit (B4)
    CorrelationID string         // ties to the request/transaction
    SourceIP      string
    Metadata      map[string]any // non-sensitive context only (D)
}

func NewEvent(actor string, action Action, resource string, outcome Outcome) Event {
    return Event{
        Timestamp: time.Now().UTC(),
        Actor:     actor,
        Action:    action,
        Resource:  resource,
        Outcome:   outcome,
    }
}
```

## B5 — Before/after for state changes [SHOULD]

```go
ev := audit.NewEvent(caller.ID, audit.ActionPaymentReversed, "payment:"+id, audit.OutcomeSuccess)
ev.Metadata = map[string]any{
    "status_before": "completed",   // non-sensitive
    "status_after":  "reversed",
    "reason_code":   "CUSTOMER_REQUEST",
}
```

Record the transition for non-sensitive fields. For sensitive fields, record only that they changed (see D4).

---

# C. Tamper-Evidence

Expands rules C1–C5.

## C1–C3 — Hash chain with HMAC [SHOULD/MUST]

```go
type ChainedRecord struct {
    Seq      uint64
    Event    Event
    PrevHash []byte // hash of the previous record
    HMAC     []byte // HMAC over (Seq || PrevHash || canonical(Event))
}

type AuditWriter struct {
    hmacKey  []byte         // held only by the writer
    lastHash []byte
    seq      uint64
    mu       sync.Mutex
}

func (w *AuditWriter) Append(ev Event) (ChainedRecord, error) {
    w.mu.Lock()
    defer w.mu.Unlock()

    w.seq++
    rec := ChainedRecord{Seq: w.seq, Event: ev, PrevHash: w.lastHash}

    // C3: canonical, deterministic serialisation
    payload, err := canonicalEncode(rec.Seq, rec.PrevHash, ev)
    if err != nil {
        return ChainedRecord{}, fmt.Errorf("canonical encode: %w", err)
    }

    // C2: HMAC with the writer's key
    mac := hmac.New(sha256.New, w.hmacKey)
    mac.Write(payload)
    rec.HMAC = mac.Sum(nil)

    // Next record chains off this record's hash
    h := sha256.Sum256(append(payload, rec.HMAC...))
    w.lastHash = h[:]

    return rec, w.persist(rec)
}
```

Verification (C-class, see F1):
```go
func Verify(records []ChainedRecord, hmacKey []byte) (brokenAt uint64, ok bool) {
    var prevHash []byte
    for _, rec := range records {
        if !bytes.Equal(rec.PrevHash, prevHash) {
            return rec.Seq, false // chain broken — a record was inserted/deleted/reordered
        }
        payload, _ := canonicalEncode(rec.Seq, rec.PrevHash, rec.Event)
        mac := hmac.New(sha256.New, hmacKey)
        mac.Write(payload)
        if !hmac.Equal(mac.Sum(nil), rec.HMAC) {
            return rec.Seq, false // record was altered
        }
        h := sha256.Sum256(append(payload, rec.HMAC...))
        prevHash = h[:]
    }
    return 0, true
}
```

## C3 — Canonical serialisation [MUST]

```go
// Deterministic: sorted keys, stable field order, fixed time format.
// A plain json.Marshal of a map has non-deterministic key order and will
// make HMAC verification fail spuriously.
func canonicalEncode(seq uint64, prevHash []byte, ev Event) ([]byte, error) {
    // Use a fixed field order and RFC3339Nano UTC timestamps.
    // For maps, sort keys before encoding.
    // ...
}
```

## C5 — Detection is not prevention [MUST]

Hash chaining tells you *that* tampering happened and *where*. It does not stop it. The complete control is: tamper-evidence (this section) + append-only/WORM storage (E1) + restricted access (E4). All three together.

---

# D. What to Log and What Never to Log

Expands rules D1–D5.

## D1–D3 — Fact and outcome, never the secret [MUST]

```go
// WRONG — logs the OTP
audit.NewEvent(userID, "OTP_VERIFY", "user:"+userID, "FAILURE").
    WithMetadata("otp", suppliedOTP) // ❌ secret in audit log

// RIGHT — logs the fact and outcome only
audit.NewEvent(userID, "OTP_VERIFY", "user:"+userID, audit.OutcomeFailure)
```

Never in an audit event: passwords, OTPs, PINs, CVV, full card PAN, full Aadhaar, full account number, session tokens, JWTs, keys.

## D2 + D4 — Masked references and non-sensitive deltas [MUST/SHOULD]

```go
ev := audit.NewEvent(caller.ID, audit.ActionPaymentCreated, "payment:"+id, audit.OutcomeSuccess)
ev.Metadata = map[string]any{
    "account_ref":    accountToken,       // tokenised, not the real number
    "amount_minor":   amount.Minor,       // amount is fine; account number is not
    "currency":       amount.Currency,
}
```

For a change to a sensitive field (e.g. a customer's stored mobile number), record only that it changed:
```go
ev.Metadata = map[string]any{"field_changed": "mobile_number"} // not the old/new value
```

---

# E. Storage, Retention & Access

Expands rules E1–E5.

## E1 — Append-only / WORM [MUST]

The audit store has no update or delete path within the retention window. Options:
- Database: an append-only table with no `UPDATE`/`DELETE` grants for the application role; deletes blocked by a trigger or by permissions.
- Object storage: S3 Object Lock (WORM) / GCS retention policy / Azure immutable blobs.
- A dedicated append-only log service.

```sql
-- Application DB role can INSERT and SELECT, never UPDATE or DELETE on audit_log
GRANT INSERT, SELECT ON audit_log TO payments_app;
-- No UPDATE, no DELETE granted
```

## E2 + E5 — Centralised, separated [MUST/SHOULD]

Forward audit events to a store separate from application data, promptly. A compromise of the application database (or its credentials) must not grant the ability to read or rewrite the audit trail. This separation is also why the audit HMAC key is held only by the audit writer, not by general application code.

## E3 — Retention [MUST]

Retain for the mandated period. For BFSI, regulator-set (commonly ~10 years for transaction trails — verify the applicable RBI direction). Retention is enforced by the store's lifecycle/retention policy, and the WORM lock period matches the retention requirement.

---

# F. Query, Replay & Verification

Expands rules F1–F4.

## F1 — Integrity verification routine [SHOULD]

Expose a routine (CLI or admin endpoint) that walks the chain and reports integrity — see the `Verify` function in section C. Run it on a schedule and on demand during an investigation. A broken chain is a high-severity alert.

## F2 + F3 — Query dimensions [SHOULD]

```go
type AuditQuery struct {
    Actor         string
    Action        Action
    Resource      string
    CorrelationID string
    From, To      time.Time
}
```

The correlation ID is what lets an investigator reconstruct an entire transaction's actions across services. Make sure the correlation ID is propagated into every audit event (it comes from the request context — see `golang-api-conventions` rule G3).

## Common findings

1. Audit log stored in a table the application role can `UPDATE`/`DELETE`.
2. Hash chain present but serialisation non-deterministic — verification fails spuriously and is abandoned.
3. HMAC key stored alongside the audit records — anyone who can read the log can forge it.
4. No verification routine — the chain is computed but never checked, so tampering would go unnoticed.
5. OTP / account number / token written into audit metadata.
6. Audit log in the same database as application data with shared access — a compromised app account reaches it.
