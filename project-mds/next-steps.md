# Next Steps (Feb 5, 2026)

## Where we are (per `project-mds/main-spec.md`)

### Phase 1: Core Infrastructure
- [ ] Docker image with all agents (Node 20 + CLI installs)
- [x] Fly Machines integration (create machine + env injection)
- [x] GitHub webhook handler for issue_comment events
- [x] Callback endpoint for task completion
- [ ] Entrypoint flow (clone repo, run agent, report result)
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
- [ ] App registration
- [ ] Webhook verification
- [ ] Issue comment parsing for @porter commands
- [ ] PR link commenting on completion

### Phase 4: Polish
- [ ] Error handling and retries
- [ ] Task history refinements
- [ ] Settings UX polish

## Notes

- Cloud execution is Fly Machines only; remove Modal references going forward.
- BYOC-only: users provide Fly + model API keys via a user-owned Gist.

## Next Focus

### Fly execution foundation
- finalize Docker image + entrypoint scripts
- persist machine/task state beyond in-memory execution maps
- add worker callback retries + timeout handling

### GitHub webhook integration
- enqueue tasks and kick off Fly Machines directly from webhook trigger
- align webhook parsing/flags with dashboard task creation path

### UI readiness cues
- surface callback failures and PR creation errors in task detail
- maintain feed density and responsiveness as task states expand
