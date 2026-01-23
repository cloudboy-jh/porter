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
- [x] Auth landing UI shell
- [x] Single-page onboarding wizard shell
- [x] Unauthenticated empty states (dashboard/history/settings)
- [ ] GitHub OAuth flow + session handling
- [ ] GitHub App install detection
- [ ] Persist onboarding configuration

### Phase 3: Core API + Task Model
- In progress (basic task API used in UI)

### Phase 4+: Modal Execution
- Not started

## Tomorrow (target ~1 hour)

### UI fixes
- Professionalize all buttons, font classes, and details across pages/components.
- Tighten timeline node + line visuals (clean, intentional, minimal effects).
- Refine failed/running/queued states for clarity.

### Phase alignment
- Keep iterating Phase 1 polish before starting tests.
- Identify any missing Phase 1 UI items (task detail view, empty states).

## Notes

- Cloud-native only: remove any local/daemon wording going forward.

## Summary (Latest)

- Git filter buttons added: Repository, Branch, Issue with dropdown type-ahead
- Colored circles around git icons (Porter orange)
- `|` separator between filter chips and git buttons
- URL persistence for all filters including git filters
- Clear button resets all filters
- Removed `repo:` from filter chips (now handled by git buttons)
- Added Vitest + Testing Library setup with TaskFeed component test
- Added Playwright scaffolding with a skipped history smoke test
- Tightened timeline nodes, status badges, and dashboard empty state polish
- Added auth landing and onboarding wizard UI shells
- Added unauthenticated empty states for Phase 2 screens
- History smart search, table header cleanup, and export placement polish.
- Agent configuration quick mode styling for dashboard modal.
- Continued UI refinements across cards, inputs, and status cues.
