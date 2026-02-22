# Next Steps (Feb 11, 2026)

## Where we are (per `docs/project-mds/main-spec.md`)

### Phase 1: Core Infrastructure
- [x] Docker image with all agents (Node 20 + CLI installs)
- [x] Fly Machines integration (create machine + env injection)
- [x] GitHub webhook handler for issue_comment events
- [x] Callback endpoint for task completion
- [x] Entrypoint flow (clone repo, run agent, report result)
- [x] Porter-created PR flow after callback success

### Phase 2: Web App
- [x] SvelteKit scaffold
- [x] Dashboard feed (timeline task feed)
- [x] Task history view (filters + table)
- [x] Settings page shell
- [x] Mock data layer for UI development
- [x] Git filter buttons (Repository, Branch, Issue) with dropdown + type-ahead
- [x] Component tests (Vitest + Testing Library)
- [x] E2E test scaffolding (Playwright)
- [x] Auth landing UI shell
- [x] GitHub OAuth flow + session handling
- [x] GitHub App install detection
- [x] Repo list from GitHub App installations
- [x] Persist onboarding configuration
- [x] Collapse onboarding into /auth with auto-configured repos/agents
- [x] Unified settings page for API keys
- [x] Initial Gist-based credential storage (legacy)
- [x] Validate Fly credentials before proceeding
- [x] UI/UX polish (task feed + review feed + auth)

### Phase 3: GitHub App
- [x] Local testing for Porter run E2E
- [x] Live webhook -> Fly Machine dispatch in production path
- [x] App registration
- [x] Webhook verification
- [x] Issue comment parsing for @porter commands
- [x] PR link commenting on completion
- [x] Installation-token auth for repo clone/push/PR creation
- [x] OAuth-token lookup for commenter D1-backed config/secrets access

### Phase 4: Polish
- [x] Error handling and retries (entrypoint + callback hardening)
- [x] Task history refinements (status propagation + timeout visibility)
- [x] Settings UX polish
- [x] Timeout watchdog for stale running tasks

## Notes

- Cloud execution is Fly Machines only; remove Modal references going forward.
- D1 is the authoritative persistence layer for settings/secrets/oauth token lookup; gist remains compatibility-only and non-blocking.

## Next Focus

### Launch-critical (Auth / Session + Config / Secrets)
- [x] wire Cloudflare D1 binding (`DB`) into server runtime and typed platform env
- [x] implement D1 config repository (`users`, `user_settings`, `user_secrets`) for read/write/update
- [x] migrate `getConfig`/`updateConfig` flows from gist-first to D1-first
- [x] keep gist sync best-effort only (no 503 on mirror failure)
- [x] migrate oauth token persistence from temp file to durable D1 table
- [x] add startup check endpoint for required env and D1 connectivity
- [x] add auth diagnostics endpoint (installation/runtime status + actionable next action)
- [x] remove scope-missing noise from settings and rely on installation/runtime health indicators

### Launch-critical (Container / Fly Lifecycle)
- [x] finalize machine startup contract validation (`TASK_ID`, repo info, callback secrets, provider keys)
- [x] ensure deterministic key injection from decrypted D1 secrets to machine env
- [ ] verify app auto-create/reuse flow for org token mode and deploy mode
- [x] tighten machine state transitions (`queued` -> `running` -> terminal) with watchdog + callback reconciliation
- [ ] run production dry-run from real `@porter` mention through merged PR
- [ ] add failure-mode assertions for callback retry/idempotency and stale machine cleanup

### Launch-critical (Settings UI)
- [x] update copy from "stored in Gist" to "encrypted and stored by Porter"
- [x] show masked key status from D1 (`configured` / `not configured`) without returning raw secrets
- [x] add key-management actions (add/update/remove) backed by `user_secrets`
- [x] remove gist mirror messaging from settings UX
- [x] add explicit save/validate states for Fly token + app name using D1-backed persistence
- [x] convert Fly setup guidance to accordion UI and production copy

### Nice-to-have follow-ups
- [ ] add targeted tests for watchdog and oauth token edge cases under D1 persistence
- [ ] tighten observability around machine lifecycle metrics and auth failures

### Docs sync guardrail
- [x] `docs/project-mds/astro-docs.md` aligned to current architecture and handoff workflow
- [x] `docs/project-mds/main-spec.md` aligned to current runtime behavior and endpoint surface
