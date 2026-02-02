# Next Steps (Feb 2, 2026)

## Where we are (per `project-mds/main-spec.md`)

### Phase 1: Core Infrastructure
- [ ] Docker image with all agents (Node 20 + CLI installs)
- [ ] Fly Machines integration (create machine + env injection)
- [ ] GitHub webhook handler for issue_comment events
- [ ] Callback endpoint for task completion
- [ ] Entrypoint flow (clone repo, run agent, report result)

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
- [ ] Validate Fly credentials before proceeding
- [ ] UI/UX polish (task feed + review feed + auth)

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
- implement Fly Machines create API with env injection
- wire callback endpoint to update task status and PR URL

### GitHub webhook integration
- verify webhook signatures
- parse @porter agent commands
- enqueue tasks and kick off Fly Machines

### UI readiness cues
- runtime readiness CTA for Fly token + API keys
- surface task run status + PR link in task detail
