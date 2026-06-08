# A. Audit Event vs Application Log

Expands rules A1–A4.

## The fundamental distinction

| | Application log | Audit log |
|---|---|---|
| Question answered | What did the *system* do? | What did *actors* do to the system? |
| Primary purpose | Debugging, monitoring | Security, compliance, forensics |
| Mutability | Can be sampled, rotated, dropped | Append-only, immutable |
| Retention | Days to weeks | Months to years (regulator-set) |
| Integrity | Best-effort | Tamper-evident |
| Access | Developers, operators | Restricted, itself audited |
| Format | Whatever is useful | Structured, stable, queryable |

## A1 — Dedicated audit pipeline [MUST]

```go
// Application logging — for debugging
slog.InfoContext(ctx, "processing payment", slog.String("id", paymentID))

// Audit event — for the record. Separate pipeline.
audit.Emit(ctx, audit.Event{
    Actor:    caller.ID,
    Action:   audit.ActionPaymentCreated,
    Resource: "payment:" + paymentID,
    Outcome:  audit.OutcomeSuccess,
})
```

These go to different places. The application log may be sampled, rotated daily, and dropped after two weeks. The audit event is retained for years, is tamper-evident, and cannot be dropped.

## A3 — Synchronous, transactional recording [MUST]

For a state change, the audit event is written in the same database transaction as the change:

```go
func (s *Service) ReversePayment(ctx context.Context, id string) error {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil { return err }
    defer tx.Rollback()

    if err := s.repo.MarkReversed(ctx, tx, id); err != nil {
        return fmt.Errorf("mark reversed: %w", err)
    }

    // Audit event in the SAME transaction — committed atomically with the change
    if err := s.audit.EmitTx(ctx, tx, audit.Event{
        Actor:    callerFromContext(ctx).ID,
        Action:   audit.ActionPaymentReversed,
        Resource: "payment:" + id,
        Outcome:  audit.OutcomeSuccess,
    }); err != nil {
        return fmt.Errorf("audit: %w", err)
    }

    return tx.Commit()
}
```

If the audit write is fire-and-forget (a goroutine, a buffered channel that can drop), then a crash between the state change and the audit write leaves an unaudited action — an audit gap. For a financial reversal, that gap is a compliance failure. The transactional outbox pattern (see `golang-messaging-conventions` rule B1) can be used to forward the committed audit event to the central store asynchronously, but the *record* of it must be committed with the action.

## A4 — Application logs are not audit logs [SHOULD]

A common and dangerous shortcut: "we log everything to our application logs, so we have an audit trail." This fails because application logs are:
- Mutable and routinely deleted on a short cycle.
- Not tamper-evident — anyone with log access can alter them.
- Unstructured or inconsistently structured — not reliably queryable for "who did what".
- Often sampled under load — the very event an auditor needs may have been dropped.

## Common findings

1. Audit events written to the same stream as debug logs, sharing their short retention.
2. Audit event emitted in a fire-and-forget goroutine — lost on crash.
3. "We have logs" treated as "we have an audit trail".
4. Audit write outside the transaction of the change it records — gap on partial failure.
