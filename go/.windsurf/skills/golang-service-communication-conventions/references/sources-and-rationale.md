# Sources & Rationale

This skill is **engineering conventions, not a standard.**

## What this skill draws on

- **gRPC documentation** — deadlines/timeouts, retry policy via service config, client and server interceptors, the gRPC health checking protocol, client-side load balancing.
- **Protocol Buffers** — the schema-evolution rules (reserved field numbers, never renumber) are part of the Protobuf specification and are genuinely standardised.
- **Resilience-pattern literature** — circuit breaker, bulkhead, retry with backoff and jitter, retry budget. Michael Nygard's "Release It!" is the canonical source for these patterns; they are not formal standards but are universally accepted.
- **Go standard library** — `net/http` (transport timeouts), `context` (deadline propagation), and the gRPC-Go libraries.
- **Widely-used Go resilience libraries** — `sony/gobreaker` (circuit breaker), `go-grpc-middleware` (interceptors including retry). The skill shows patterns with these but mandates the pattern, not the library.
- **BFSI obligations** — mTLS, idempotency, and replay-safe retries for payment-switch and partner-bank calls, via `golang-bfsi-bindings` category H and L.

## What is genuinely standardised vs convention

- **Standardised:** HTTP method semantics (safety/idempotency, which underpins the retry rules), Protobuf wire compatibility rules, TLS 1.2+ for transport security.
- **Convention:** the resilience patterns (circuit breaker thresholds, retry budgets, backoff parameters), the choice of gRPC vs REST, the interceptor/middleware structure. All engineering practice with real variation between teams.

## Where reasonable people differ

- **gRPC vs REST internally** — strong opinions on both sides. The skill defaults to gRPC for internal service-to-service (typed contract, native deadlines, performance) but accepts internal REST. This is a SHOULD, not a MUST.
- **Built-in gRPC retry vs library vs hand-rolled** — gRPC's service-config retry is preferred where it suffices; a library (go-grpc-middleware) or hand-rolled loop is used for more complex policies. All are acceptable if they respect the rules (idempotent-only, backoff+jitter, capped, context-aware).
- **Circuit breaker thresholds** — the specific numbers (50% failure over 10 requests, 30s open timeout) are starting heuristics. The rule is *that* a breaker exists per downstream and is tuned to real metrics.

## Boundary with the messaging skill

This skill is synchronous request/response only. The boundary, restated: if the caller blocks waiting for a response, it is this skill (gRPC/REST). If the caller publishes and continues without waiting, it is `golang-messaging-conventions` (queues, events, pub/sub). Many systems use both — a synchronous gRPC call to read data, an asynchronous event to signal a state change. They are complementary, not alternatives.

## Service mesh / discovery

Per the agreed scope, service mesh (Istio, Linkerd) and service-discovery infrastructure are out of scope. Where a mesh is present, it may handle mTLS, retries, and circuit breaking at the sidecar layer — in which case some of these rules are satisfied by the mesh rather than the Go code. The skill's rules still describe the required behaviour; the mesh is one way to provide it.
