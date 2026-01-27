# Porter - Main Specification

**Version:** 2.0.0
**Status:** Active Development
**Architecture:** Cloud-Native (SvelteKit + Modal)
**Last Updated:** January 24, 2026

---

## Overview

Porter is a cloud-native AI agent orchestrator for GitHub Issues. It brings the elegant `@mention` workflow (popularized by GitHub Copilot) to any AI coding agent - Opencode, Claude Code, Amp, and more.

**Core Value Proposition:**
- Comment `@porter <agent>` on any GitHub issue
- Porter runs the agent in the cloud (Modal containers)
- Agent opens a PR automatically
- Works 24/7, laptop can be closed

---

## The Problem

GitHub's `@copilot` workflow is brilliant:
1. Comment `@copilot` on an issue
2. Copilot analyzes the issue
3. Copilot opens a PR with changes
4. You review the PR

**But it only works with Copilot.**

Developers using Claude Code, Cursor, Amp, or other agents are stuck with manual workflows:
- Manually clone the repo
- Manually run the agent
- Manually create the PR
- No integration with GitHub Issues

---

## The Solution

Porter makes the `@mention` workflow universal:

```
Comment: @porter opencode
   ↓
Porter webhook receives it
   ↓
Enriches prompt with repo context
   ↓
Runs agent in cloud container (Modal)
   ↓
Agent makes changes and opens PR
   ↓
Porter updates issue with PR link
   ↓
You review the PR
```

**Works with any agent. Works 24/7. Zero local setup required.**

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────┐
│                    GITHUB                                │
│  • Issues (task definition)                             │
│  • PRs (task output)                                    │
│  • Webhooks (event notifications)                       │
│  • Gists (config storage)                               │
└────────────┬────────────────────────────────────────────┘
             │ webhooks
             ▼
┌─────────────────────────────────────────────────────────┐
│              PORTER (SvelteKit)                          │
│  • Web Dashboard (UI)                                   │
│  • API Routes (webhooks, tasks, config)                 │
│  • Server-side Logic (enrichment, orchestration)        │
└────────────┬────────────────────────────────────────────┘
             │ trigger execution
             ▼
┌─────────────────────────────────────────────────────────┐
│                MODAL (Execution Layer)                   │
│  • Ephemeral Containers                                 │
│  • Agent Execution (opencode, claude-code, amp)         │
│  • Git Operations (clone, commit, PR)                   │
└─────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Cloud-Native Execution**
   - All agents run in ephemeral Modal containers
   - Works 24/7, independent of user's machine
   - Isolated, reproducible environments

2. **GitHub as Source of Truth**
   - All state lives in GitHub (issues, PRs, branches)
   - Config + credentials stored in a user-owned GitHub Gist
   - No database required

3. **Agent Agnostic**
   - Porter orchestrates agents, doesn't run models
   - Clean adapter interface for new agents
   - Supports any CLI-based coding agent

4. **Monolithic Simplicity**
   - Single SvelteKit service (frontend + backend)
   - No microservices complexity
   - Easy to develop and deploy

---

## Tech Stack

### Frontend + Backend (Single SvelteKit Service)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | SvelteKit | Latest | Full-stack (UI + API routes) |
| UI Library | Svelte | 5.x | Reactive UI with runes |
| Runtime | Bun | Latest | Fast Node.js alternative |
| Language | TypeScript | 5.x | Type-safe application code |
| Styling | Tailwind CSS | 3.x | Utility-first styling |

### Execution Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container Platform | Modal | Serverless container orchestration |
| Agent Runtime | Python | Modal function execution |
| Container OS | Debian Slim | Lightweight base image |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Hosting | Vercel / Cloudflare Pages | Frontend + API serverless functions |
| Auth | GitHub OAuth | User authentication |
| Config Storage | GitHub Gists | User configuration + credentials |
| State Storage | GitHub Issues/PRs | Task state and history |
| Webhooks | GitHub Apps | Event notifications |

### Supported Agents

| Agent | Language Support | Provider | Status |
|-------|-----------------|----------|--------|
| Opencode | Multi-language | Anthropic (Claude) | Default ✓ |
| Claude Code | Multi-language | Anthropic (Claude) | Primary ✓ |
| Amp | Multi-language | Anthropic | Secondary ✓ |
| Cursor | Multi-language | Anthropic/OpenAI | Future |

---

## Repository Structure

```
porter/
├── web/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte                 # Dashboard
│   │   │   ├── tasks/
│   │   │   │   ├── +page.svelte             # Task list
│   │   │   │   └── [id]/+page.svelte        # Task detail
│   │   │   ├── settings/+page.svelte        # Settings
│   │   │   └── api/
│   │   │       ├── webhooks/
│   │   │       │   └── github/+server.ts    # GitHub webhook handler
│   │   │       ├── tasks/
│   │   │       │   ├── +server.ts           # List/create tasks
│   │   │       │   └── [id]/+server.ts      # Task CRUD
│   │   │       ├── agents/+server.ts        # Agent list
│   │   │       ├── config/+server.ts        # Config management
│   │   │       └── callbacks/
│   │   │           ├── task-update/+server.ts    # Modal status updates
│   │   │           └── task-complete/+server.ts  # Modal completion
│   │   ├── lib/
│   │   │   ├── server/                      # Server-only code
│   │   │   │   ├── modal.ts                 # Modal API client
│   │   │   │   ├── github.ts                # GitHub API client
│   │   │   │   ├── tasks.ts                 # Task store/management
│   │   │   │   ├── agents.ts                # Agent configs
│   │   │   │   └── prompt.ts                # WRAP enrichment
│   │   │   ├── components/                  # UI components
│   │   │   │   ├── TaskCard.svelte
│   │   │   │   ├── TaskTable.svelte
│   │   │   │   ├── StatusBadge.svelte
│   │   │   │   └── AgentIcon.svelte
│   │   │   ├── stores/                      # Client state
│   │   │   │   └── tasks.svelte.ts
│   │   │   └── types.ts                     # Shared types
│   │   └── app.css                          # Global styles
│   ├── static/
│   │   ├── logos/
│   │   │   └── porter-logo.png
│   │   └── favicon.png
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── package.json
│   └── bun.lockb
├── modal/
│   ├── app.py                           # Modal app definition
│   ├── agents/
│   │   ├── opencode.py                  # Opencode executor
│   │   ├── claude_code.py               # Claude Code executor
│   │   └── amp.py                       # Amp executor
│   └── utils/
│       ├── git.py                       # Git operations
│       └── github.py                    # PR creation
├── docs/
│   ├── MAIN-SPEC.md                     # This file
│   ├── ARCHITECTURE.md                  # Technical architecture
│   ├── AGENTS.md                        # Agent integration guide
│   └── API.md                           # API documentation
├── .github/
│   └── workflows/
│       ├── deploy.yml                   # CI/CD
│       └── test.yml                     # Tests
└── README.md
```

---

## Core Flow

### Standard Workflow

```
1. User creates or finds GitHub issue
   ↓
2. User comments: @porter opencode
   ↓
3. GitHub webhook fires to Porter
   ↓
4. Porter validates webhook signature
   ↓
5. Porter extracts: repo, issue, agent
   ↓
6. Porter enriches prompt (WRAP format)
   ↓
7. Porter triggers Modal function
   ↓
8. Modal spins up container with agent
   ↓
9. Container clones repo
   ↓
10. Agent analyzes issue and makes changes
   ↓
11. Agent commits changes to new branch
   ↓
12. Agent creates PR via GitHub API
   ↓
13. Modal calls Porter callback with PR URL
   ↓
14. Porter comments on issue: "✓ PR #123 created"
   ↓
15. User reviews and merges PR
```

**Total time: 2-10 minutes** (depends on issue complexity)

---

## Prompt Enrichment (WRAP)

Porter uses **WRAP** (Write, Refine, Assess, Pass) format to build effective prompts:

```markdown
## Issue
{issue title}
{issue body}
{issue comments if relevant}

## Repository Context
{from AGENTS.md if present}
{key files and directory structure}
{relevant documentation}

## Instructions
Complete this GitHub issue by making the necessary code changes.

1. Analyze the issue requirements
2. Make the minimal changes needed
3. Ensure changes follow existing code style
4. Create a PR with clear description
5. Reference this issue in the PR

Issue URL: {issue_url}
```

### Context Sources

**From Issue:**
- Issue title and body
- Labels (e.g., "bug", "feature")
- Assignees and mentions
- Linked issues/PRs

**From Repository:**
- `AGENTS.md` file (if exists) - agent-specific instructions
- `.porter/config.json` (if exists) - repo-specific config
- File tree (top 2 levels)
- README.md content

**From GitHub:**
- Repository description
- Primary language
- Branch structure

---

## Modal Execution Architecture

### Container Image

```python
from modal import Image

porter_image = (
    Image.debian_slim()
    # System dependencies
    .apt_install(
        "git",
        "curl",
        "build-essential",
    )
    # Python tools
    .pip_install(
        "opencode-cli",
        "amp-cli",
    )
    # Node.js (for some agents)
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
    )
)
```

### Agent Execution Function

```python
import modal
import subprocess
import os
import requests

app = modal.App("porter")

@app.function(
    image=porter_image,
    timeout=600,  # 10 minutes max
    memory=2048,  # 2GB RAM
    cpu=2.0,      # 2 CPU cores
    secrets=[
        modal.Secret.from_name("porter-github-token"),
    ]
)
def execute_agent_task(
    task_id: str,
    repo_url: str,
    repo_name: str,
    issue_number: int,
    agent_name: str,
    enriched_prompt: str,
    callback_url: str,
    github_token: str,
    credentials: dict[str, str],
):
    """
    Execute an AI coding agent task in isolated container.

    Steps:
    1. Load provider credentials from Gist (passed in)
    2. Clone repository
    3. Run specified agent with enriched prompt
    4. Agent makes changes and commits
    5. Agent creates PR via GitHub API
    6. Report results back to Porter via callback

    Returns: Task execution result
    """
    # Set environment
    os.environ["GITHUB_TOKEN"] = github_token
    if credentials.get("anthropic"):
        os.environ["ANTHROPIC_API_KEY"] = credentials["anthropic"]
    if credentials.get("openai"):
        os.environ["OPENAI_API_KEY"] = credentials["openai"]
    if credentials.get("amp"):
        os.environ["AMP_API_KEY"] = credentials["amp"]

    # Clone repository
    clone_dir = f"/tmp/{repo_name}"
    subprocess.run(
        ["git", "clone", repo_url, clone_dir],
        check=True
    )
    os.chdir(clone_dir)

    # Execute agent based on type
    if agent_name == "opencode":
        result = subprocess.run(
            ["opencode", "--prompt", enriched_prompt, "--create-pr"],
            capture_output=True,
            text=True
        )
    elif agent_name == "claude-code":
        result = subprocess.run(
            ["claude-code", "--prompt", enriched_prompt],
            capture_output=True,
            text=True
        )
    elif agent_name == "amp":
        result = subprocess.run(
            ["amp", "--prompt", enriched_prompt],
            capture_output=True,
            text=True
        )
    else:
        raise ValueError(f"Unknown agent: {agent_name}")

    # Parse output for PR URL
    pr_url = extract_pr_url(result.stdout)

    # Callback to Porter with results
    requests.post(callback_url, json={
        "task_id": task_id,
        "status": "success" if result.returncode == 0 else "failed",
        "pr_url": pr_url,
        "logs": result.stdout,
        "error": result.stderr if result.returncode != 0 else None
    })

    return {
        "pr_url": pr_url,
        "success": result.returncode == 0
    }
```

### Resource Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Timeout | 10 minutes | Most tasks complete in 2-5 minutes |
| Memory | 2GB | Sufficient for agent + repo + models |
| CPU | 2 cores | Shared, burstable |
| Storage | 10GB ephemeral | Fresh per task, auto-cleanup |
| Concurrency | 10 per user | Prevent abuse |

### Cost Estimation

**Modal Pricing (approximate):**
- Container startup: ~$0.001
- Compute: ~$0.01/minute
- Average task (3 min): ~$0.03

**Free tier covers:** ~300 tasks/month at Modal's current free credits

### Pricing Framework (Porter-Managed Compute)

**Principles:**
- Porter manages Modal infrastructure and billing for MVP.
- Users bring model API keys; compute pricing is bundled into Porter plans.

**Draft Tiers (MVP):**
- **Free:** 25 tasks/month, 10 min max runtime, best-effort queue
- **Pro:** 300 tasks/month, higher concurrency, priority queue
- **Team:** 1,500 tasks/month, shared org quotas, priority queue

**Overage:**
- Additional tasks billed per task (e.g., $0.10-$0.25) or per minute (e.g., $0.03/min).

### BYOC (Future Option)

- Users connect their own Modal account.
- Porter orchestrates tasks; compute billing is handled by the user.
- Pricing shifts to a lower subscription for orchestration only.

---

## API Design

### REST Endpoints

**Webhooks:**
```
POST /api/webhooks/github
  - Receives GitHub webhook events
  - Validates signature
  - Triggers task execution
  - Returns: 200 OK
```

**Tasks:**
```
GET  /api/tasks
  - List all tasks for authenticated user
  - Query params: status, repo, agent, limit, offset
  - Returns: Task[]

POST /api/tasks
  - Manually create task (not from webhook)
  - Body: { repo, issue, agent }
  - Returns: Task

GET  /api/tasks/:id
  - Get task details
  - Returns: Task with full logs

PUT  /api/tasks/:id/retry
  - Retry failed task
  - Returns: Task

DELETE /api/tasks/:id
  - Cancel running task (if possible)
  - Returns: 204 No Content
```

**Agents:**
```
GET /api/agents
  - List available agents
  - Returns: Agent[]

GET /api/agents/:name
  - Get agent details and status
  - Returns: Agent
```

**Config:**
```
GET  /api/config
  - Get user config from Gist
  - Returns: Config

PUT  /api/config
  - Update user config in Gist
  - Body: Config
  - Returns: Config
```

**Callbacks (from Modal):**
```
POST /api/callbacks/task-update
  - Modal calls this during execution
  - Body: { task_id, status, progress, logs }
  - Returns: 200 OK

POST /api/callbacks/task-complete
  - Modal calls this when task finishes
  - Body: { task_id, status, pr_url, error }
  - Returns: 200 OK
```

### Data Models

**Task:**
```typescript
interface Task {
  id: string                        // UUID
  status: TaskStatus                // queued | running | success | failed
  repo: string                      // "owner/repo"
  issueNumber: number               // GitHub issue number
  issueTitle: string
  issueBody: string
  agent: string                     // "opencode" | "claude-code" | "amp"
  priority: number                  // 1-5 (5 highest)
  progress: number                  // 0-100
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  createdBy: string                 // GitHub username
  prNumber?: number                 // Created PR number
  prUrl?: string                    // Created PR URL
  errorMessage?: string
  logs: LogEntry[]
}

type TaskStatus = "queued" | "running" | "success" | "failed"

interface LogEntry {
  timestamp: Date
  level: "info" | "warning" | "error" | "success"
  message: string
}
```

**Agent:**
```typescript
interface Agent {
  name: string                      // "opencode"
  displayName: string               // "Opencode"
  description: string
  provider: string                  // "Anthropic"
  languages: string[]               // ["python", "typescript", ...]
  status: AgentStatus               // available | unavailable | deprecated
  version: string
  icon: string                      // URL or emoji
}

type AgentStatus = "available" | "unavailable" | "deprecated"
```

**Config:**
```typescript
interface Config {
  version: string                   // "2.0.0"
  agents: {
    [name: string]: {
      enabled: boolean
      priority: number              // Default priority for this agent
      customPrompt?: string         // Append to enriched prompt
    }
  }
  credentials: {
    anthropic?: string              // Stored in user-owned Gist
    openai?: string                 // Stored in user-owned Gist
    amp?: string                    // Stored in user-owned Gist
  }
  repositories: {
    [repo: string]: {
      defaultAgent: string
      autoAssign: boolean          // Auto-run on new issues?
      skipLabels: string[]         // Don't run for these labels
    }
  }
  notifications: {
    email: boolean
    webhook?: string                // POST results here
  }
}
```

---

## User Interface

### Design System

**Color Palette:**
```css
--bg-primary: #000000;
--bg-secondary: #0a0a0a;
--bg-tertiary: #141414;
--border: #262626;
--text-primary: #fafafa;
--text-secondary: #a3a3a3;
--accent: #fb923c;              /* Porter amber */
--status-success: #22c55e;
--status-error: #ef4444;
```

**Typography:**
- UI Font: Inter
- Monospace: JetBrains Mono

### Key Pages

1. **Dashboard** (`/`)
   - Overview stats
   - Active tasks list
   - Quick actions

2. **Tasks** (`/tasks`)
   - Full task list
   - Filtering and sorting
   - Task detail view

3. **Settings** (`/settings`)
   - GitHub connection
   - Agent configuration
   - API keys (for Modal agents)
   - Usage & billing

---

## GitHub Integration

### GitHub App

Porter uses a GitHub App for authentication and webhooks.

**Required Permissions:**
- **Repository:**
  - Contents: Read & Write (clone, commit, PR)
  - Issues: Read & Write (comment, update)
  - Pull Requests: Read & Write (create, update)
  - Metadata: Read (repo info)
- **Organization:**
  - Members: Read (org membership)

**Webhook Events:**
- `issue_comment.created` - New @porter command
- `issues.opened` - Auto-run on new issues (if configured)
- `issues.closed` - Cancel related tasks
- `pull_request.merged` - Mark task complete

### Credential Storage (Cloud-Only)

Porter stores provider API keys in a private GitHub Gist owned by the user.

- Keys are never stored locally.
- Porter reads credentials from the user’s Gist to run agents in Modal containers.
- Users can revoke access by rotating keys or deleting the Gist.

### Command Syntax

**Grammar:**
```
@porter <agent> [flags]
```

**Flags:**
- `--priority=low|normal|high`
- `--no-tests`
- `--model=<name>`
- `--branch=<name>`

If `<agent>` is omitted, Porter uses the repo default agent from config.
If multiple commands are present in a comment, each line is parsed and queued separately.

**Basic:**
```
@porter opencode
@porter claude-code
@porter amp
```

**With options:**
```
@porter opencode --priority=high
@porter claude-code --no-tests
@porter amp --model=sonnet
```

**Control commands:**
```
@porter stop       # Stop current task
@porter retry      # Retry failed task
@porter status     # Get task status
```

### Bot Comments

Porter comments on issues to provide status updates:

**When task is queued:**
```
🤖 Porter

✓ Task queued
Agent: opencode
Status: https://porter.dev/tasks/abc123
```

**When task starts:**
```
🤖 Porter

▶️ Task started
Agent: opencode
Branch: porter/issue-123-opencode
```

**During execution (optional):**
```
🤖 Porter

… Running (45%)
Latest step: tests
```

**When task completes:**
```
🤖 Porter

✓ Task complete
Pull Request: #124
Review: https://github.com/user/repo/pull/124
```

**When task fails:**
```
🤖 Porter

✗ Task failed
Error: Agent timeout after 10 minutes
Retry: @porter retry
```

### Task Dispatch + Dashboard Feed

Porter treats GitHub as the source of truth for tasks.

- A valid `@porter` command creates a task and posts a queued comment.
- Status updates are reflected in issue comments and PR metadata.
- The dashboard feed reads from GitHub (issues, comments, PRs) and mirrors tasks in the UI.
- For local development, an in-memory task store can be used as a mock data layer.

---

## Testing Strategy

Porter uses a layered testing approach aligned with UI-first iteration:

- **Unit tests:** Utility functions, prompt enrichment, GitHub/Modal helpers
- **Component tests:** Svelte components with mocked stores and API responses
- **Integration tests:** API routes and webhook handlers with mocked GitHub payloads
- **E2E tests:** Auth, onboarding, and task lifecycle flows (Playwright)

---

## Development Roadmap

### Phase 1: UI Foundation + Testing Harness (Weeks 1-2)
**Goal:** UI-first iteration with reliable test scaffolding

- [ ] Changelog-style dashboard feed
- [ ] Task detail view and logs
- [ ] Filtering, actions, empty states
- [ ] Settings and auth page shells
- [ ] Mock data layer for UI development
- [ ] Component tests (Vitest + Testing Library)
- [ ] E2E test scaffolding (Playwright)

**Deliverable:** UI flows testable end-to-end with mock data

---

### Phase 2: Onboarding + Auth (Day 3)
**Goal:** First-run experience and authentication ready

- [ ] Sign in / sign up UI
- [ ] GitHub OAuth flow + session handling
- [ ] Onboarding wizard (connect GitHub, install app, choose agents, choose repos)
- [ ] Persist user configuration

**Deliverable:** New user can sign in and complete onboarding

---

### Phase 3: Core API + Task Model (Day 3)
**Goal:** Backend foundation for tasks and config

- [ ] Task CRUD API routes
- [ ] Task state storage and retrieval
- [ ] Config storage in Gists (agents + credentials)
- [ ] Agent registry (cloud-only) + enablement state
- [ ] Runtime readiness UI (Modal status)
- [ ] WebSocket status updates
- [ ] Webhook skeleton with signature validation

**Deliverable:** Task API and cloud config storage working

---

### Phase 4: Modal Execution (Day 3 or 4)
**Goal:** Cloud execution for a single agent

- [ ] Modal integration (container + execution function)
- [ ] Opencode agent adapter (Modal)
- [ ] Task callbacks + progress updates
- [ ] PR creation from container

**Deliverable:** Working @porter flow - webhook → Modal → PR

---

### Phase 5: GitHub App + Multi-Agent (Day 4)
**Goal:** Production-ready workflow and multiple agents

- [ ] GitHub App setup + webhook handlers
- [ ] Claude Code adapter (Modal)
- [ ] Amp adapter (Modal)
- [ ] Agent auto-detection and configuration
- [ ] Priority queue
- [ ] Error handling and retry logic

**Deliverable:** All agents working reliably through GitHub

---

### Phase 6: Polish + Launch Prep (Weeks 2-3)
**Goal:** Production-ready quality and launch materials

- [ ] Task history view
- [ ] Comprehensive error handling
- [ ] Email notifications
- [ ] Performance optimization
- [ ] UI/UX polish
- [ ] Documentation
- [ ] Demo video, launch post, screenshots, beta testing

**Deliverable:** Ready to launch Feb 24

---

### Phase 7: Post-Launch (March+)
**Future features based on feedback:**

- [ ] GitLab support (v2.0)
- [ ] Gitea support (self-hosted)
- [ ] Multiple cloud providers (Fly.io alternative)
- [ ] Team management features
- [ ] Usage tracking and billing

---

## Success Metrics

### MVP Success
- [ ] Successfully dispatch task from webhook
- [ ] Agent executes in Modal container
- [ ] PR is created and linked back to issue
- [ ] Error handling works (timeout, failure)
- [ ] Task history visible in dashboard

### Beta Success
- [ ] 3+ agents supported (Opencode, Claude Code, Amp)
- [ ] 100+ tasks processed successfully
- [ ] <30s task pickup latency (webhook → container start)
- [ ] 95%+ success rate for valid tasks
- [ ] Positive user feedback (5+ testimonials)

### Launch Success (Week 1)
- [ ] 500+ GitHub stars
- [ ] 20+ real users
- [ ] HN front page for 8+ hours
- [ ] 5+ dev influencers tweeting
- [ ] No critical bugs

---

## Deployment

### SvelteKit App

**Development:**
```bash
cd web
bun install
bun run dev
```

**Production:**
```bash
bun run build
# Deploy to Vercel
vercel deploy

# Or Cloudflare Pages
wrangler pages deploy
```

**Environment Variables:**
```
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
```

### Modal Functions

**Development:**
```bash
cd modal
modal serve app.py
```

**Production:**
```bash
modal deploy app.py
```

**Modal Secrets:**
```bash
modal secret create porter-github-token GITHUB_TOKEN=ghp_...
```

Provider keys are stored in the user’s GitHub Gist and injected at runtime.

---

## Open Questions

1. **Pricing Model:** Porter-managed compute tiers, overage pricing, and BYOC option?
2. **Multi-repo:** Support multiple repos per task?
3. **Team Features:** Shared queues? Org-level settings?
4. **Rate Limiting:** How to prevent abuse on free tier?
5. **Credential Handling:** Encryption, audit, and rotation workflows?
6. **Agent Versions:** How to handle agent updates?

---

**End of Specification**
