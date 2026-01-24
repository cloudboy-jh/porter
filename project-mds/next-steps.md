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

### Phase 3: Core API + Task Model
- In progress (basic task API used in UI)
- [ ] Agent install + setup UI
- [ ] Install command registry per agent (single source of truth)
- [ ] Install CTA + rescan flow in Settings + Dashboard

### Phase 4+: Modal Execution
- Not started


## Notes

- Cloud-native only: remove any local/daemon wording going forward.

## Summary (Latest)

- Git filter buttons added: Repository, Branch, Issue with dropdown type-ahead
- Colored circles around git icons (Porter orange)
- `|` separator between filter chips and git buttons
- URL persistence for all filters including git filters
- Clear button resets all filters
- Removed `repo:` from filter chips (now handled by git buttons)
- Auth pages now full-width, no sidebar shell.
- Sign-in page uses Porter logo and fuller product copy.
- Onboarding header added, app install required to unlock repo/agent steps.
- Onboarding removed; /auth now handles auto-config and redirects to app install.
- Webhook signature verification added for GitHub events.
- `.env.example` and setup guide updated for OAuth + webhooks.
- History smart search, table header cleanup, and export placement polish.
- Agent configuration quick mode styling for dashboard modal.
- Continued UI refinements across cards, inputs, and status cues.
