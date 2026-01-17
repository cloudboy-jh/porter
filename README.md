# Porter

![Porter](web/src/logos/porter-logo-readme.png)

Universal agent orchestrator for GitHub Issues. Assign any issue to any AI coding agent with `@porter` and let Porter coordinate local or cloud execution.

[![Docs](https://img.shields.io/badge/Docs-porter-fb542b?style=flat-square)](project-md/MAIN-SPEC.md)
[![GitHub last commit](https://img.shields.io/github/last-commit/cloudboy-jh/porter?style=flat-square&color=fb542b)](https://github.com/cloudboy-jh/porter/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-fb542b.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Made with Go](https://img.shields.io/badge/Made%20with-Go-fb542b?style=flat-square&logo=go)](https://go.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-fb542b.svg?style=flat-square)](https://github.com/cloudboy-jh/porter/pulls)

## Repo Layout
- `web/`: SvelteKit dashboard
- `desktop/`: Wails desktop daemon + UI
- `project-md/`: Product specification

---

## Development Status

### Current Phase: Phase 1 - MVP (In Progress)

| Component | Status | Notes |
|-----------|--------|-------|
| Web Dashboard | ● Active | SvelteKit + Svelte 5 runes migration |
| Desktop Daemon | ● Active | Wails scaffolding complete |
| Settings Architecture | ● Active | Consolidated platform section |
| GitHub Integration | ○ Pending | Webhook handler + OAuth |
| Agent Adapters | ○ Pending | Aider, Opencode, Claude Code |
| Config Storage | ○ Pending | Gist-based storage |
| WebSocket Streaming | ○ Pending | Real-time log streaming |

### Recent Activity (Last 10 Commits)

```
8265441  Updates to all web app
c30c7d1  Consolidate settings in Platform section with distinct icons
cad7fff  Remove unused UI components
bfd1670  Restructure settings architecture
4312f23  Migrate core components to Svelte 5 runes
020a082  WIP: Partial Svelte 5 migration before full automated migration
f4165ed  Ignore desktop build artifacts
ed19764  Remove generated build artifacts from repo
a349556  Updated readme
69e9cbe  Updated readme
```

### Technology Updates

- **Framework:** Svelte 5 migration in progress (runes-based reactivity)
- **UI Components:** New command bar, quick settings modal, theme toggle
- **Build:** Clean separation of build artifacts from source

---

## Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PORTER ROADMAP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: MVP                    ████████████░░░░ 60%                       │
│  ─────────────────                                                           │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ GitHub App + Webhook│ ○    │ Web Dashboard       │ ● Done               │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Desktop Daemon      │ ●    │ Aider Adapter       │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Local Execution     │ ○    │ Gist Config Storage │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ WebSocket Logs      │ ○    │ Task Tracking       │ ● Active             │
│  └─────────────────────┘      └─────────────────────┘                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 2: MULTI-AGENT          ████████░░░░░░░░░░ 40%                       │
│  ────────────────────────────                                               │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Opencode Adapter    │ ○    │ Claude Code Adapter │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Agent Auto-Detect   │ ○    │ Priority Queue      │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 3: POLISH                ████░░░░░░░░░░░░░░ 15%                       │
│  ─────────────────                                                           │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Task History View   │ ●    │ Error Handling      │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Retry Logic         │ ○    │ Notifications       │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐                                                     │
│  │ Performance Opt     │ ○ Pending                                          │
│  └─────────────────────┘                                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 4: CLOUD EXECUTION      ██░░░░░░░░░░░░░░░░░ 5%                        │
│  ──────────────────────────                                                   │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Container Runtime   │ ○    │ Cloud Execution     │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ Usage Tracking      │ ○    │ Billing Integration │ ○ Pending            │
│  └─────────────────────┘      └─────────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Legend: ● Active  ○ Pending  ✓ Done
```

### Milestone Timeline

```
Jan 2026          Feb 2026          Mar 2026          Apr 2026
    │                 │                 │                 │
    ▼                 ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────┐
│  MVP Release                                                ~60%│
│  • GitHub webhook handler                                    │   │
│  • Desktop daemon (Wails)                                    │   │
│  • Aider integration                                         │   │
└────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│  Multi-Agent Support                                       ~40%│
│  • Opencode, Claude Code adapters                            │   │
│  • Agent auto-detection                                      │   │
└────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────┐
│  Beta Release                                             ~15%│
│  • Task history & retry                                     │   │
│  • Notifications                                            │   │
│  • Performance tuning                                       │   │
└────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────┐
│  Cloud Execution                                          ~5% │
│  • Container orchestration (Modal/Fly/Railway)               │   │
│  • Usage tracking & billing                                  │   │
└────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Web Application
```bash
cd web
bun install
bun run dev
```

### Desktop Application
```bash
cd desktop
wails dev
```

---

## Documentation

- [Main Specification](project-md/MAIN-SPEC.md) - Complete product specification
- [Agent Configuration](project-md/AGENTS.md) - Agent integration guide

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [issues](https://github.com/cloudboy-jh/porter/issues) for good starting points.
