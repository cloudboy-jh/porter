# Next Steps (Feb 5, 2026)

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
- [ ] Live Fly Machine creation for "Production" for just cloudboy-jh to start, To establish the container lifecycle. 
- [x] App registration
- [x] Webhook verification
- [x] Issue comment parsing for @porter commands
- [x] PR link commenting on completion

### Phase 4: Polish
- [ ] Error handling and retries
- [ ] Task history refinements
- [ ] Settings UX polish

## Notes

- Cloud execution is Fly Machines only; remove Modal references going forward.
- BYOC-only: users provide Fly + model API keys via a user-owned Gist.

## Next Focus

### UI/UX refinement sprint
- continue reviewing every web app surface for visual and interaction consistency
- refine typography, spacing, color tokens, and component behavior across light/dark themes
- tighten review feed and diff viewer polish until they match Porter design intent

### After UI/UX pass
- run final verification sweep for UI/UX regressions
- commit finalized UI/UX refinement changes
- push branch updates to remote repository
