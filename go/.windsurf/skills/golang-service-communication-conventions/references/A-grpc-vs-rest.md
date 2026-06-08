# A. Choosing gRPC vs REST

Expands rules A1–A4.

## A1 + A2 — When to use which

| Factor | gRPC | REST/JSON |
|---|---|---|
| Internal service-to-service (you own both ends) | Preferred | Acceptable |
| External / public API | No | Preferred |
| Consumers you don't control | No | Yes |
| Performance (latency, payload size) | Better (binary Protobuf, HTTP/2) | Heavier (text JSON) |
| Typed contract | Yes (`.proto`) | Via OpenAPI (separate artefact) |
| Streaming | Native (uni/bidirectional) | Limited (SSE, chunked) |
| Browser support | Needs gRPC-Web proxy | Native |
| Human-debuggable on the wire | No (binary) | Yes |
| Deadline propagation | Native through context | Manual |

For internal microservices where both ends are Go services under your control, gRPC's typed contract, native deadlines, and performance make it the default. For anything a third party or a browser consumes, REST.

## A3 — Backward-compatible contracts [MUST]

**gRPC / Protobuf:**
```protobuf
message Payment {
  string id = 1;
  int64 amount_minor = 2;
  string currency = 3;
  // Adding a field: use a NEW field number. Safe.
  string reference = 4;
  // NEVER reuse field number 2 for something else.
  // NEVER renumber existing fields.
  // To remove a field: reserve its number and name.
  reserved 5;
  reserved "old_field";
}
```

Protobuf compatibility rules:
- Adding a field with a new number is backward-compatible.
- Removing a field: `reserved` its number and name so they are never reused.
- Never change a field's number or type.
- Never reuse a retired field number.

**REST:** follow `golang-api-conventions` rule C (add optional fields only; new major version for breaking changes).

## A4 — Consistency [SHOULD]

A mesh where some services speak gRPC, some REST, and some both, chosen ad hoc, multiplies the operational surface: two sets of client libraries, two observability integrations, two security configurations. Pick a default (commonly gRPC internal, REST at the edge) and deviate only with reason.

## Common findings

1. Protobuf field number reused after a field was removed — silently misinterprets old data.
2. gRPC used for a browser-facing API without a gRPC-Web proxy.
3. Internal services using REST/JSON where gRPC's typed contract would prevent a class of integration bugs.
4. Ad hoc protocol choice per service with no consistency.
