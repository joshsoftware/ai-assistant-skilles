# B. Deadlines & Timeouts

Expands rules B1–B4.

## B1 + B2 — Deadline set and propagated [MUST]

**gRPC — deadline travels through the context automatically:**
```go
func (c *Client) GetAccount(ctx context.Context, id string) (*pb.Account, error) {
    // Derive from the parent ctx — preserves the remaining budget (B2)
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()

    return c.accounts.GetAccount(ctx, &pb.GetAccountRequest{Id: id})
    // gRPC serialises the deadline into the request; the downstream sees how much
    // time is left and can abandon work that would exceed it.
}
```

**REST — propagate the remaining budget explicitly:**
```go
func (c *Client) GetAccount(ctx context.Context, id string) (*Account, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+"/accounts/"+id, nil)
    if err != nil { return nil, err }
    // The context deadline applies to the round trip. If the inbound request
    // had 2s left, this call inherits that — it does not get a fresh 2s.
    resp, err := c.httpClient.Do(req)
    // ...
}
```

The key anti-pattern B2 prevents: service A (budget 2s) → calls B with a fresh 2s → B calls C with a fresh 2s. Now the chain can take 6s while A's caller gave up after 2s. Always derive from the inbound context.

## B3 — All HTTP transport timeouts [MUST]

```go
func newServiceClient() *http.Client {
    return &http.Client{
        Timeout: 10 * time.Second, // overall ceiling
        Transport: &http.Transport{
            DialContext: (&net.Dialer{Timeout: 2 * time.Second}).DialContext,
            TLSHandshakeTimeout:   2 * time.Second,
            ResponseHeaderTimeout: 5 * time.Second,
            IdleConnTimeout:       60 * time.Second,
            MaxIdleConnsPerHost:   10,
        },
    }
}
```

Go's default `http.Client` has NO timeout. A single unresponsive downstream holds a goroutine forever. Each timeout protects a different stage (see `golang-bfsi-bindings` go-H-comms-tls.md for the full matrix).

---

# C. Retries & Backoff

Expands rules C1–C5.

## C1 — Retry only idempotent operations [MUST]

```go
func isRetriable(method string, hasIdempotencyKey bool) bool {
    switch method {
    case http.MethodGet, http.MethodPut, http.MethodDelete:
        return true // idempotent by HTTP semantics
    case http.MethodPost:
        return hasIdempotencyKey // only if the downstream deduplicates on the key
    default:
        return false
    }
}
```

A blind retry of a non-idempotent `POST /payments` can create two payments. Retry it only if it carries an `Idempotency-Key` the downstream deduplicates on (see E4).

## C2 + C3 + C5 — Backoff with jitter, capped, context-aware [MUST]

```go
func retryWithBackoff(ctx context.Context, maxAttempts int, fn func() error) error {
    var lastErr error
    for attempt := 0; attempt < maxAttempts; attempt++ {
        if err := fn(); err == nil {
            return nil
        } else if !isTransient(err) {
            return err // permanent — do not retry (E5)
        } else {
            lastErr = err
        }
        // Exponential backoff with full jitter
        base := time.Duration(1<<attempt) * 100 * time.Millisecond
        sleep := time.Duration(rand.Int63n(int64(base)))
        select {
        case <-time.After(sleep):
        case <-ctx.Done(): // C5: respect cancellation during the sleep
            return ctx.Err()
        }
    }
    return lastErr
}
```

**gRPC built-in retry** (via service config) is preferred over hand-rolled loops where available:
```go
// Service config JSON enables transparent retries with backoff
const serviceConfig = `{
  "methodConfig": [{
    "name": [{"service": "accounts.AccountService"}],
    "retryPolicy": {
      "maxAttempts": 4,
      "initialBackoff": "0.1s",
      "maxBackoff": "1s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE"]
    }
  }]
}`
conn, _ := grpc.NewClient(target, grpc.WithDefaultServiceConfig(serviceConfig), ...)
```

## C4 — Retry budget [SHOULD]

Cap total retries to a fraction of total requests per window (e.g. retries ≤ 10% of requests to a downstream). During a partial outage, a naive "retry 3×" turns 1× load into up to 4× load on the struggling downstream, deepening the outage. A retry budget bounds the amplification.

---

# D. Circuit Breakers & Bulkheads

Expands rules D1–D5.

## D1–D3 — Per-downstream circuit breaker [SHOULD]

```go
import "github.com/sony/gobreaker"

func newBreaker(name string) *gobreaker.CircuitBreaker {
    return gobreaker.NewCircuitBreaker(gobreaker.Settings{
        Name:        name, // D3: one breaker per downstream
        MaxRequests: 3,    // half-open: allow 3 probe requests
        Interval:    10 * time.Second,
        Timeout:     30 * time.Second, // how long to stay open before half-open
        ReadyToTrip: func(c gobreaker.Counts) bool {
            return c.Requests >= 10 && float64(c.TotalFailures)/float64(c.Requests) >= 0.5
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            slog.Warn("circuit breaker state change",
                slog.String("breaker", name),
                slog.String("from", from.String()),
                slog.String("to", to.String()),
            ) // D2: log every transition
        },
    })
}

// Usage:
result, err := breaker.Execute(func() (any, error) {
    return client.GetAccount(ctx, id)
})
```

The three states (D2):
- **Closed:** requests flow normally; failures are counted.
- **Open:** the failure threshold was crossed; requests fail fast without calling the downstream, for the `Timeout` duration.
- **Half-open:** after `Timeout`, a few probe requests are allowed; success closes the breaker, failure re-opens it.

A separate breaker per downstream (D3) ensures a failing payments service does not trip calls to a healthy accounts service.

## D4 — Bulkheads [SHOULD]

Limit concurrency per downstream so one slow dependency cannot consume all the caller's goroutines:
```go
type Bulkhead struct {
    sem chan struct{}
}
func NewBulkhead(maxConcurrent int) *Bulkhead {
    return &Bulkhead{sem: make(chan struct{}, maxConcurrent)}
}
func (b *Bulkhead) Do(ctx context.Context, fn func() error) error {
    select {
    case b.sem <- struct{}{}:
        defer func() { <-b.sem }()
        return fn()
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

---

# E. Error Propagation & Idempotency

Expands rules E1–E5.

## E1 + E2 — Deliberate error mapping, no leakage [MUST]

```go
func (c *Client) GetAccount(ctx context.Context, id string) (*Account, error) {
    acc, err := c.accounts.GetAccount(ctx, &pb.GetAccountRequest{Id: id})
    if err != nil {
        st, _ := status.FromError(err)
        switch st.Code() {
        case codes.NotFound:
            return nil, ErrAccountNotFound          // map to a domain error
        case codes.PermissionDenied:
            return nil, ErrForbidden
        case codes.Unavailable, codes.DeadlineExceeded:
            return nil, fmt.Errorf("%w: %v", ErrTransient, err) // retriable
        default:
            // Do NOT pass st.Message() (downstream internal detail) to our caller
            return nil, ErrInternal
        }
    }
    return fromProto(acc), nil
}
```

A downstream `NotFound` becomes the caller's domain `ErrAccountNotFound`, which the caller's handler maps to its own `404` — not a `500`. The downstream's raw error message (which may contain its internal detail) never propagates outward.

## E3 — Correlation ID propagation [MUST]

```go
// gRPC — propagate via metadata
func correlationInterceptor(ctx context.Context, method string, req, reply any,
    cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
    corrID := correlationID(ctx)
    ctx = metadata.AppendToOutgoingContext(ctx, "x-correlation-id", corrID)
    return invoker(ctx, method, req, reply, cc, opts...)
}

// REST — propagate via header
req.Header.Set("X-Correlation-ID", correlationID(ctx))
```

## E4 — Idempotency key on financial calls [MUST]

```go
// A money-moving call carries an idempotency key the downstream deduplicates on.
// This makes the call safe to retry (C1).
req.Header.Set("Idempotency-Key", intent.IdempotencyKey)
```

See `golang-bfsi-bindings` go-L-money-idempotency.md for the downstream deduplication pattern.

---

# F. Client Construction & Security

Expands rules F1–F3.

## F1 — Construct once, reuse [MUST]

```go
// gRPC — one ClientConn for the life of the process, shared
conn, err := grpc.NewClient(target,
    grpc.WithTransportCredentials(creds),
    grpc.WithChainUnaryInterceptor(
        correlationInterceptor,
        timeoutInterceptor,
        retryInterceptor,
    ),
)
// store conn on the client struct; create the stub once
accountsClient := pb.NewAccountServiceClient(conn)
```

A new `ClientConn` per call re-does connection setup, TLS handshake, and load-balancer resolution every time, and exhausts connections.

## F2 + F3 — mTLS, never insecure in production [MUST]

```go
// PRODUCTION — mTLS
cert, _ := tls.LoadX509KeyPair(certFile, keyFile)
caPool := x509.NewCertPool()
caPool.AppendCertsFromPEM(caPEM)
creds := credentials.NewTLS(&tls.Config{
    MinVersion:   tls.VersionTLS12,
    Certificates: []tls.Certificate{cert},
    RootCAs:      caPool,
})
conn, _ := grpc.NewClient(target, grpc.WithTransportCredentials(creds))

// LOCAL DEV ONLY — never in a production code path
// conn, _ := grpc.NewClient(target, grpc.WithTransportCredentials(insecure.NewCredentials()))
```

`insecure.NewCredentials()` (gRPC) and `InsecureSkipVerify: true` (HTTP) are for local development only. Their presence in a production path is a P0 finding. See `golang-bfsi-bindings` rule H4 for the BFSI mTLS requirement.

## Common findings

1. Fresh timeout per hop instead of propagating the remaining budget — chain exceeds the caller's deadline.
2. Non-idempotent POST retried without an idempotency key — double execution.
3. Retry loop that sleeps without checking `ctx.Done()` — goroutine outlives the caller.
4. One shared circuit breaker for all downstreams — a healthy service is blocked by an unhealthy one.
5. Downstream error message passed straight through to the caller — internal detail leaked.
6. `insecure.NewCredentials()` left in a production gRPC client.
7. New gRPC `ClientConn` created per request.
8. No correlation-ID propagation — transactions cannot be traced across services.
