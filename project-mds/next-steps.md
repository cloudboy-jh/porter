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
- [ ] UI/UX polish (task feed + review feed + auth)

### Phase 2: Onboarding + Auth
- [x] Auth landing UI shell (no sidebar)
- [x] GitHub OAuth flow + session handling
- [x] GitHub App install detection
- [x] Repo list from GitHub App installations
- [x] Persist onboarding configuration
- [x] Collapse onboarding into /auth with auto-configured repos/agents
- [x] Unified settings page for Modal + API keys
- [x] Gist creation/management for credential storage
- [ ] Validate Modal credentials before proceeding
- [ ] Finalize auth layout (animation pacing, spacing, mobile stack)

### Phase 3: Core API + Task Model
- In progress (basic task API used in UI)
- [x] Agent enablement + credential setup UI (Anthropic required)
- [ ] Runtime readiness CTA + refresh flow in Settings + Dashboard
- [x] Config API reads/writes to user's Gist
- [x] Credential validation endpoints
- [x] Review feed + diff embed foundation
- [ ] Review detail polish + merge confirmation UX

### Phase 4+: Modal Execution
- Not started
- [ ] Modal function receives credentials as parameter (no Modal secrets)
- [ ] Porter triggers Modal using user's Modal token


## Notes

- Cloud-native only: remove any local/daemon wording going forward.
- BYOC-only: users bring Modal + model API keys via a single user-owned Gist.

## Next Focus

### Task feed refinement
- tighten card spacing + hierarchy across TaskFeed
- standardize action button placement and labels
- make diff badges more prominent and consistent alongside PR links/commit info
- normalize scrolling behavior (avoid ad-hoc internal scroll boxes)

### Review feed refinement
- align review feed visuals with TaskFeed (same rhythm + badges)
- polish empty/loaded states
- finalize diff pagination UI (5 per page) and controls
- surface mergeable state clearly + show permission gating

### Auth page finalization
- tune animation pacing + contrast on left panel
- refine right panel typography + spacing
- ensure mobile layout stacks cleanly with a clear primary CTA
