# Step Up API architecture

Modular monolith with selective CQRS, transactional outbox, and a dedicated BullMQ worker.

## Processes

| Process | Entry | Responsibility |
|---------|-------|----------------|
| API | `src/main.ts` | HTTP, WebSocket, commands, queries. Writes outbox rows / enqueues jobs. No `@Processor`, no outbox poller. |
| Worker | `src/worker.main.ts` | Outbox claim → BullMQ, notification/projection/scheduled processors. Health-only HTTP. |

## Layering (per domain module)

```text
Controller
  → Application (commands / queries)
    → Domain (invariants)
    → Persistence (repository writes / query reads)
```

Example under `src/batches/`:

- `application/batch.commands.ts`, `batch.queries.ts`
- `domain/` — capacity, enrollment rules
- `persistence/batch.repository.ts`, `batch.query.ts`
- `dto/` — explicit request/response shapes

## Rules

1. Controllers never access Prisma directly.
2. List APIs are always paginated (`cursor` + `limit`, default limit ≤ 50).
3. List queries never load full User objects / PII blobs unless required; use `UserPresenter.presentLite` / `presentLiteMany` or denormalized display fields. (Future: denormalize `displayName` onto `BatchSummary` so discover cards can skip trainer PII decrypt — do not add columns until needed.)
4. Commands that modify state use transactions where invariants require it (`FOR UPDATE` for seat capacity).
5. Side effects leave the transaction through `OutboxEvent`.
6. Workers must be idempotent (`jobId` / outbox event id).
7. Heavy dashboard queries use read models (`BatchSummary`, `StudioRevenueSummary`, …).
8. No synchronous HTTP endpoint performs bulk background work (enqueue daily jobs instead).
9. Every new endpoint has an explicit DTO.
10. Every critical business flow has an E2E / `@http` / `@critical` test.

## CQRS (lightweight)

- **Commands** — transactional domain services; sync for payments, seat allocation, authz.
- **Queries** — purpose-built Prisma selects or projection tables; never reuse giant `include` graphs.

## Outbox → BullMQ

```text
Command
  → DB transaction
      ├── update domain
      └── insert OutboxEvent
            → Worker poll (SKIP LOCKED)
            → BullMQ handler (idempotent)
```

## Read models (hybrid)

- **Operational** (near real-time): `BatchSummary`, invoice list projections — updated in-command or via outbox handlers.
- **Analytics** (scheduled): retention/trainer rollups via repeatable BullMQ jobs on the worker.

## Non-goals

Kafka, Nest `@nestjs/cqrs`, per-domain microservices, event sourcing.
