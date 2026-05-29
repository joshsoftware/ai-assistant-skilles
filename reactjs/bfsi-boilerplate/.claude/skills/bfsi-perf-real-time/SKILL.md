---
name: bfsi-perf-real-time
description: Reference for handling real-time data feeds (WebSocket / SSE / polling) in a BFSI app without render-storms. Covers batching with requestAnimationFrame, `useSyncExternalStore` for tickers, subscription deduplication, cleanup-on-unmount, and the BFSI-specific patterns (transaction ticker, live balance, OTP delivery, activity feeds). Auto-loads when the user asks about WebSocket / SSE / EventSource / live data / ticker / streaming / push / polling / `useSyncExternalStore`.
---

# BFSI Perf — Real-Time Data

Tickers, balance streams, transaction notifications, OTP delivery, activity-feed dashboards. The naive way of writing these — `socket.on('message', (m) => setState(m))` — calls `setState` once per server message, which is fine at 1 msg/sec and catastrophic at 100 msg/sec.

This reference covers the patterns that scale, written for the BFSI use cases that drive them.

## Default architecture

```
WebSocket / SSE / poller
        │  (raw messages)
        ▼
   Store (module-scoped, NOT in React)  ← single subscription per app
        │  (snapshots)
        ▼
React via useSyncExternalStore         ← cheap subscription per component
        │
        ▼
        UI
```

The key inversion: don't put the socket in a React component. Put it in a module that owns the connection, batches updates, and exposes a `subscribe(listener) / getSnapshot()` pair. React components consume via `useSyncExternalStore`. Reasons:

1. **One connection per app**, not one per subscriber component. WebSocket limits per origin are 6 (Chrome), so per-component subscriptions burn the budget fast.
2. **Batching is centralised.** The store can buffer and flush at a rate that makes sense for the user (commonly 60 Hz, sometimes 4 Hz for true tickers).
3. **Lifecycle survives navigation.** The connection stays open even if the consuming component unmounts.
4. **Testable.** Mock the store, not the WebSocket.

## Pattern 1 — Coalesce with requestAnimationFrame

For data that updates faster than 60 Hz:

```ts
// src/shared/realtime/balanceStore.ts
let latestBalance: number | null = null;
let scheduled = false;
const listeners = new Set<() => void>();

function notify() {
  scheduled = false;
  listeners.forEach((l) => l());
}

function onSocketMessage(msg: { balance: number }) {
  latestBalance = msg.balance;
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(notify);
  }
}

export const balanceStore = {
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot(): number | null {
    return latestBalance;
  },
  getServerSnapshot(): number | null {
    return null; // SSR: no balance yet
  },
};
```

```tsx
// Consumer
import { useSyncExternalStore } from 'react';
import { balanceStore } from '@/shared/realtime/balanceStore';

export function LiveBalance() {
  const balance = useSyncExternalStore(
    balanceStore.subscribe,
    balanceStore.getSnapshot,
    balanceStore.getServerSnapshot,
  );
  return <span>{balance == null ? '—' : formatCurrency(balance)}</span>;
}
```

**Why this works:**

- `setState` is replaced by `useSyncExternalStore`, which React batches with concurrent rendering.
- The `rAF` flush coalesces every-100ms socket bursts down to one render per frame.
- Components that _don't_ read `balance` don't re-render at all.

## Pattern 2 — Throttled interval flush (for true tickers)

For market-data-style updates where a fixed cadence is better than rAF:

```ts
let buffer: TickerMessage[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function onMessage(m: TickerMessage) {
  buffer.push(m);
}

function startFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (buffer.length === 0) return;
    applyBuffer(buffer); // mutate snapshot
    buffer = [];
    notify(); // signal listeners
  }, 250); // 4 Hz — UI rate
}
```

Flush rates that map to BFSI flows:

| Flow                          | Rate     | Why                                                                  |
| ----------------------------- | -------- | -------------------------------------------------------------------- |
| Currency / equity ticker      | 4 Hz     | Users don't perceive faster than ~6 Hz; 4 Hz is safe.                |
| Account balance after deposit | On event | Single update; no need to throttle.                                  |
| Transaction notifications     | 1 Hz     | Show toasts; > 1/sec overwhelms the user. Batch into "3 new alerts". |
| Audit tail (admin dashboard)  | 2 Hz     | Append-only; smooth scroll-to-top on new items.                      |

## Pattern 3 — Polling without re-render storms

Polling looks innocent but in a poorly-written hook it triggers a render every tick even when data hasn't changed:

```tsx
// ❌ Re-renders every interval even if response identical
const [data, setData] = useState(null);
useEffect(() => {
  const id = setInterval(async () => {
    const r = await fetch('/api/balance').then((r) => r.json());
    setData(r); // setData with structurally-equal object still re-renders downstream
  }, 5000);
  return () => clearInterval(id);
}, []);
```

Fixes:

- **Compare before setState**: `setData(prev => deepEqual(prev, r) ? prev : r)`. Avoid this if data is big; use structural sharing from a query library instead.
- **Use TanStack Query's `refetchInterval`** for polling — it compares structurally and skips the render if the response is equal to the cached value.
- **Stop polling on `document.visibilityState !== 'visible'`** — saves battery + cost.
- **Back off on consecutive errors**: 5s → 15s → 60s → stop and surface to user.

## Pattern 4 — Cleanup on unmount (the leak prevention)

Every subscription, every interval, every `EventSource` MUST clean up:

```tsx
useEffect(() => {
  const sub = stream.subscribe(handle);
  const tick = setInterval(refresh, 5000);
  const onOnline = () => reconnect();
  window.addEventListener('online', onOnline);

  return () => {
    sub.unsubscribe(); // ← critical
    clearInterval(tick); // ← critical
    window.removeEventListener('online', onOnline);
  };
}, []);
```

Missing cleanups are the #1 source of "the app gets slow over time" bugs. Symptoms:

- After 20 minutes of use, every interaction lags.
- Memory grows linearly with navigation count.
- `setState on unmounted component` warnings in dev.

Find them with React DevTools' "Highlight unmounts" feature or Chrome's "Detached DOM nodes" snapshot.

## Pattern 5 — One subscription per app

Don't let components own connections:

```tsx
// ❌ Each KycList instance opens its own socket
function KycList() {
  useEffect(() => {
    const ws = new WebSocket('/ws/kyc-updates');
    // ...
  }, []);
}
```

Move the socket out:

```ts
// src/shared/realtime/kycStream.ts — module-scoped, one connection ever
const ws = new WebSocket('/ws/kyc-updates');
ws.onmessage = (e) => kycStore.apply(JSON.parse(e.data));
```

Then components subscribe to `kycStore`, not to the WebSocket. Bonus: HMR doesn't re-open the connection because the module is hot-replaced, not re-instantiated (depending on bundler — verify in your project).

## Pattern 6 — Backpressure on burst

If the server sends 10k messages in a burst (e.g. reconnection replay), buffering them all without bound = main-thread freeze when flushing. Bound the buffer:

```ts
function onMessage(m: T) {
  buffer.push(m);
  if (buffer.length > 1000) {
    // Drop oldest; or pause connection; or apply a partial flush mid-tick
    buffer = buffer.slice(-500);
  }
}
```

For activity-feed dashboards specifically: prefer paging older entries to a fetch (REST), keep the live stream for _new_ events only. Don't replay 10k historical entries through the WebSocket.

## BFSI-specific guidance

- **OTP delivery**: socket message arrives → store sets `otpAvailable: true`. Component shows "OTP delivered, check your phone". DO NOT auto-fill the OTP input from the socket — that's a security anti-pattern (channel binding violation). The customer must type it.
- **Balance after transfer**: don't wait for the polling tick after a successful mutation. Call `queryClient.invalidateQueries({ queryKey: ['balance'] })` in the mutation's `onSuccess` — the mutation triggers a fresh fetch; the polling layer is the safety net.
- **Cross-tab sync**: pair with `BroadcastChannel` — when one tab sees a logout event, every tab redirects. See `@<scope>/core/auth/crossTabSync.ts`.
- **No PII in WebSocket frames**: if the message includes a PAN / Aadhaar / account number, scrub before storing in the snapshot.
- **Audit the connection itself**: emit `realtime.connected` / `realtime.disconnected` events. Surfacing high disconnect rates on dashboards is operationally important.

## Tools

- **Network tab → WS panel** in Chrome DevTools — see frames live.
- **Performance tab** — record a 10s window with realistic traffic; look for long tasks during flush.
- **React DevTools Profiler** — commit duration should be flat regardless of inbound message rate (proves coalescing works).
- **`performance.mark` / `performance.measure`** — annotate "flush start" and "flush end" for custom flamegraph slices.

## Anti-patterns

```tsx
// ❌ One setState per message
socket.onmessage = (e) => setMessages((m) => [...m, JSON.parse(e.data)]);

// ❌ Polling stays running when tab is hidden
useEffect(() => { setInterval(refetch, 5000) }, []);

// ❌ Subscription owned by component (× number of mounted instances)
useEffect(() => { const ws = new WebSocket(...); return () => ws.close() }, []);

// ❌ Unbounded buffer
function onMessage(m) { buffer.push(m); }

// ❌ Auto-filling OTP from a push channel
socket.on('otp', (otp) => setOtpInput(otp));
```

## When NOT to use real-time

- **Data that updates < once per minute** — polling at a low interval is simpler, cheaper, debuggable.
- **Critical accuracy paths** (settlement amount, transaction confirmation) — request/response with strong consistency; don't rely on a push that might be delayed.
- **Behind firewalls that block WebSocket** — corporate / banking customer networks often disable `wss://` on non-443 ports. Have a polling fallback.

## References

- React docs — [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- MDN — [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- `bfsi-perf-react/SKILL.md` — for the surrounding perf methodology
