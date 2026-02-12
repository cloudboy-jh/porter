# Next Steps (Feb 11, 2026)

## Where we are (per `project-mds/main-spec.md`)

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
- [x] Gist creation/management for credential storage
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
- [x] OAuth-token lookup for commenter private Gist config

### Phase 4: Polish
- [x] Error handling and retries (entrypoint + callback hardening)
- [x] Task history refinements (status propagation + timeout visibility)
- [x] Settings UX polish
- [x] Timeout watchdog for stale running tasks

## Notes

- Cloud execution is Fly Machines only; remove Modal references going forward.
- BYOC-only: users provide Fly + model API keys via a user-owned Gist.

## Next Focus

### Launch Readiness
- run one production dry-run from real `@porter` issue comment to merged PR
- verify required env vars exist in deployment (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `PORTER_OAUTH_TOKEN_SECRET`)
- monitor first live callbacks and watchdog timeout events in logs

### Nice-to-have follow-ups
- add targeted tests for watchdog and oauth token store edge cases
- tighten observability around machine lifecycle metrics
