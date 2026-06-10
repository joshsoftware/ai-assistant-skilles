---
name: golang-service-communication-conventions
description: Go synchronous inter-service communication conventions — gRPC and REST-to-REST calls between services, deadlines and timeouts, retries with backoff, circuit breakers, idempotency, error propagation across service boundaries, client construction, and mTLS between services. Use whenever a Go service makes a synchronous call to another service, or when inter-service client code is being written or reviewed. Activate on mentions of gRPC, service-to-service, inter-service call, downstream service, RPC, service client, deadline, circuit breaker, retry budget, mTLS between services, or "how do I call another service in Go". These are engineering conventions built on gRPC documentation, resilience-pattern literature, and Go standard library practice. Covers SYNCHRONOUS communication only — for asynchronous messaging (queues, events, pub/sub) see golang-messaging-conventions.
---

# Go Inter-Service Communication Conventions (Synchronous)

Conventions for synchronous service-to-service calls in Go — gRPC and REST-to-REST. **These are conventions, not a standard.**

This skill covers synchronous request/response between services. For asynchronous communication (message queues, event streams, pub/sub), see `golang-messaging-conventions`. The boundary: if the caller waits for a response, it is this skill; if the caller fires and continues, it is the messaging skill.

## How to use this skill

1. Walk the rule categories when writing or reviewing inter-service client code.
2. **MUST** violations are blockers. **SHOULD** violations need a documented reason.
3. For BFSI: calls to payment switches, partner banks, and NPCI rails carry additional requirements (mTLS, idempotency, replay-safe retries) — see `golang-bfsi-bindings` category H.

## Sources

- gRPC documentation (deadlines, retry policy, interceptors, client-side load balancing).
- Resilience-pattern literature: circuit breaker, retry with backoff and jitter, bulkhead, retry budget (Nygard, "Release It!").
- Go standard library `net/http`, `context`, and the gRPC-Go libraries.
- `sony/gobreaker`, `go-grpc-middleware` (widely-used Go resilience libraries).

Full notes: `references/sources-and-rationale.md`.

## Rule categories

| # | Category | Reference file |
|---|---|---|
| A | Choosing gRPC vs REST | `references/A-grpc-vs-rest.md` |
| B | Deadlines & timeouts | `references/B-deadlines-timeouts.md` |
| C | Retries & backoff | `references/C-retries-backoff.md` |
| D | Circuit breakers & bulkheads | `references/D-circuit-breakers.md` |
| E | Error propagation & idempotency | `references/E-errors-idempotency.md` |
| F | Client construction & security | `references/F-client-security.md` |

---

## Rule index

### A. Choosing gRPC vs REST

- **A1 [SHOULD]** Use gRPC for internal service-to-service communication where both ends are under your control: it is faster (binary Protobuf), has a typed contract, and supports streaming and deadlines natively.
- **A2 [SHOULD]** Use REST/JSON for external-facing APIs and for consumers you do not control (see `golang-api-conventions`). Internal REST-to-REST is acceptable where gRPC adoption is not justified.
- **A3 [MUST]** Whichever is used, the contract is versioned and backward-compatible within a version (Protobuf field numbers are never reused or renumbered; REST follows `golang-api-conventions` rule C).
- **A4 [SHOULD]** Do not mix protocols arbitrarily. A consistent choice across the service mesh reduces operational and cognitive overhead.

### B. Deadlines & timeouts

- **B1 [MUST]** Every outbound call sets a deadline/timeout via `context.WithTimeout`. A call that can wait forever will eventually exhaust goroutines and cascade a failure across the system.
- **B2 [MUST]** The deadline is propagated, not reset, across the call chain. If service A has 2 seconds left, its call to service B must carry the remaining budget — not a fresh 2 seconds. gRPC propagates deadlines automatically through the context; REST callers must pass the remaining budget explicitly.
- **B3 [MUST]** For REST clients, set all the HTTP transport timeouts (dial, TLS handshake, response header, idle) plus an overall client timeout — not just one. *(Mirrors `golang-api-conventions` and `golang-bfsi-bindings` rule H5.)*
- **B4 [SHOULD]** Set timeouts based on the downstream's measured latency (e.g. p99 + margin), not a round guess. A timeout shorter than the downstream's normal p99 causes spurious failures; one far longer defeats the purpose.

### C. Retries & backoff

- **C1 [MUST]** Retry only idempotent operations. `GET`, `PUT`, `DELETE` and idempotent gRPC methods are safe; a non-idempotent `POST` or a money-moving call is retried only if it carries an idempotency key the downstream deduplicates on. *(Binds `golang-bfsi-bindings` rules L2/L5.)*
- **C2 [MUST]** Use exponential backoff with jitter between retries. Fixed-interval retries from many clients cause a synchronised thundering herd on a recovering service.
- **C3 [MUST]** Cap the number of retries and the total retry duration. Unbounded retries amplify load on an already-struggling downstream and turn a brief blip into an outage.
- **C4 [SHOULD]** Use a retry budget — limit retries to a small fraction (e.g. 10%) of total requests to a downstream per window. This prevents retries from multiplying load during a partial outage.
- **C5 [MUST]** The retry sleep respects context cancellation. A retry loop that sleeps without checking `ctx.Done()` keeps a goroutine alive after the caller has given up.

### D. Circuit breakers & bulkheads

- **D1 [SHOULD]** Wrap calls to each downstream in a circuit breaker. After a threshold of failures the breaker opens, failing fast instead of waiting for timeouts, and gives the downstream time to recover.
- **D2 [SHOULD]** The breaker has three states: closed (normal), open (failing fast), half-open (probing recovery with a few requests). Log every state transition.
- **D3 [SHOULD]** Use a separate breaker per downstream. A single shared breaker means one failing dependency trips calls to healthy ones.
- **D4 [SHOULD]** Use bulkheads — separate connection pools / concurrency limits per downstream — so one slow dependency cannot consume all the caller's goroutines or connections.
- **D5 [MUST]** When a breaker is open, return a clear, fast error to the caller (or a degraded fallback where one exists). Do not queue requests behind an open breaker.

### E. Error propagation & idempotency

- **E1 [MUST]** Map errors meaningfully across the boundary. A downstream `404` is not the caller's `500`. Translate downstream status/codes into the caller's domain errors deliberately. *(See `golang-api-conventions` rule E5.)*
- **E2 [MUST]** Do not leak a downstream's internal error detail to your own callers. The downstream's stack trace or SQL error must not surface in your response. *(Binds `golang-bfsi-bindings` rule G1.)*
- **E3 [MUST]** Propagate the correlation ID across service calls (gRPC metadata or an HTTP header) so a transaction can be traced end to end. *(Mirrors `golang-api-conventions` rule G3 and the audit-log skill's correlation requirement.)*
- **E4 [MUST]** State-changing calls across a financial boundary carry an idempotency key so a retry does not double-execute. The downstream deduplicates on it. *(Binds `golang-bfsi-bindings` rules H6/L2.)*
- **E5 [SHOULD]** Distinguish transient errors (retry) from permanent errors (do not retry) and ambiguous outcomes (reconcile, do not blindly retry) using typed errors, not string matching. *(Binds `golang-bfsi-bindings` rule L5.)*

### F. Client construction & security

- **F1 [MUST]** Construct service clients once at startup and reuse them. gRPC `ClientConn` and `http.Client` are designed for reuse and manage their own connection pools; creating one per call is a defect.
- **F2 [MUST]** Use mTLS for service-to-service communication carrying regulated data. Both ends authenticate via certificates. *(Binds `golang-bfsi-bindings` rule H4.)*
- **F3 [MUST]** Never disable TLS verification (`InsecureSkipVerify`, gRPC `insecure.NewCredentials()`) on a production code path. `insecure` credentials are for local development only.
- **F4 [SHOULD]** Apply cross-cutting concerns (timeout, retry, circuit breaker, correlation-ID propagation, tracing) as gRPC interceptors or HTTP middleware, not as code repeated at every call site.
- **F5 [SHOULD]** Use health checks (gRPC health checking protocol or a REST `/healthz`) and client-side load balancing to route around unhealthy instances.

## Out of scope

- Asynchronous messaging (queues, events, pub/sub) — see `golang-messaging-conventions`.
- Service mesh (Istio, Linkerd), service discovery infrastructure — infrastructure concern (per your scope choice).
- API gateway configuration.
- GraphQL federation.
