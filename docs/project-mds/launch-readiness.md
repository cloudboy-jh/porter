# Porter Launch Readiness

## Platform

- [ ] Cloudflare Worker deployed and reachable.
- [ ] Durable Object binding + migrations deployed.
- [ ] D1 binding present and schema ready.

## GitHub

- [ ] GitHub App installed on target repositories.
- [ ] Webhook configured to `/api/webhooks/github`.
- [ ] App permissions include issues, contents, pull requests.

## Environment

- [ ] `SESSION_SECRET`, `WEBHOOK_SECRET`
- [ ] `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- [ ] `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`
- [ ] `PORTER_OAUTH_TOKEN_SECRET`
- [ ] DO dispatch secret/binding values

## Product checks

- [ ] Settings page shows only model + provider key controls.
- [ ] Default model persists and is used by dispatch.
- [ ] Provider keys are encrypted and status-only in UI.

## End-to-end checks

- [ ] `@porter <prompt>` creates task and transitions lifecycle states.
- [ ] Task writes status/log updates to D1.
- [ ] One task produces one atomic commit and one PR.
