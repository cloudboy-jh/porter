# Next Steps (Post-Pivot)

## Immediate

- [ ] Finish Worker front-door handler for webhook + dashboard dispatch parity.
- [ ] Finalize Durable Object lifecycle state machine and D1 status writes.
- [ ] Complete Git Trees atomic commit flow (tree -> commit -> ref update).
- [ ] Ensure PR open/link flow is idempotent.

## Product

- [ ] Keep Settings model-first: default model + provider keys only.
- [ ] Remove remaining agent-control UI and Fly copy from all surfaces.
- [ ] Ensure dashboard dispatch uses model selection consistently.

## Reliability

- [ ] Add alarm retry tests for transient GitHub/LLM failures.
- [ ] Add E2E test: `@porter` comment -> DO run -> atomic commit -> PR opened.
- [ ] Add observability for lifecycle transitions and retry attempts.

## Archived Pre-Pivot (Fly Runtime)

These are retained for historical context only and are no longer active work:

- Docker image / machine lifecycle hardening
- callback reconciliation for machine completion
- Fly token/app setup and validation flows
