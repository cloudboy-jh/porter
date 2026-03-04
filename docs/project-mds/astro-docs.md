# Astro Docs - Handoff Spec

Keep public docs aligned with the current runtime:

- Worker front door
- Durable Object task execution
- Git Trees atomic commits
- D1-backed task/log/config persistence

## Required coverage

1. `@porter` and dashboard dispatch entry points
2. Worker -> DO handoff and lifecycle states
3. Model-first settings (default model + provider keys)
4. GitHub App + OAuth auth flow
5. Git Trees commit + PR open flow
6. Error/retry behavior via DO alarms

## Sync rule

When architecture or endpoint behavior changes:

1. update `main-spec.md`
2. update this handoff file
3. sync Astro docs in the docs repo in the same cycle
