# Next Steps (Jan 22, 2026)

## Where we are (per `project-mds/main-spec.md`)

### Phase 1: UI Foundation + Testing Harness
- [x] Changelog-style dashboard feed (timeline task feed)
- [x] Task history view (filters + table)
- [x] Settings page shell (cloud execution language)
- [x] Mock data layer for UI development
- [x] Git filter buttons (Repository, Branch, Issue) with dropdown + type-ahead
- [x] Component tests (Vitest + Testing Library)
- [x] E2E test scaffolding (Playwright)
- [ ] UI/UX polish (in progress - timeline + states)

### Phase 2: Onboarding + Auth
- [x] Auth landing UI shell (no sidebar)
- [x] GitHub OAuth flow + session handling
- [x] GitHub App install detection
- [x] Repo list from GitHub App installations
- [x] Persist onboarding configuration
- [x] Collapse onboarding into /auth with auto-configured repos/agents
- [ ] Unified settings page for Modal + API keys
- [ ] Gist creation/management for credential storage
- [ ] Validate Modal credentials before proceeding

### Phase 3: Core API + Task Model
- In progress (basic task API used in UI)
- [ ] Agent enablement + credential setup UI (Anthropic required)
- [ ] Runtime readiness CTA + refresh flow in Settings + Dashboard
- [ ] Config API reads/writes to user's Gist
- [ ] Credential validation endpoints

### Phase 4+: Modal Execution
- Not started
- [ ] Modal function receives credentials as parameter (no Modal secrets)
- [ ] Porter triggers Modal using user's Modal token


## Notes

- Cloud-native only: remove any local/daemon wording going forward.
- BYOC-only: users bring Modal + model API keys via a single user-owned Gist.
