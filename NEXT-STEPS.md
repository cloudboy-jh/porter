# Next Steps

## Phase 1 MVP - Local Loop (Current Focus)

**Goal**: Test complete flow locally without GitHub App

✅ Done:
- Desktop daemon with task store and WebSocket server
- Opencode adapter (default)
- Aider adapter (legacy)
- GitHub client for PR detection + issue commenting
- WebSocket client library
- .env.example and GitHub App docs

**Remaining (Local Loop)**:
- Integrate WebSocket client into web UI components
- Add manual task creation UI in web dashboard
- Show daemon connection status (connected/disconnected indicator)
- Test end-to-end: create task → daemon pickup → agent execution → PR → issue update

**After Local Loop Works**:
- GitHub App setup + webhook handler (issue comment intake)
- Config storage via GitHub Gists
- OAuth integration
- Webhook signature verification

## Phase 2 Multi-Agent
- Claude Code adapter
- Stable adapter interface for additional agents
- Agent auto-detection
- Priority queue

## Phase 3 Polish
- Task history view
- Error handling + retry flow
- Notifications
- Performance tuning

## Phase 4 Cloud Execution
- Choose container runtime
- Cloud agent execution
- Usage tracking
- Billing integration
