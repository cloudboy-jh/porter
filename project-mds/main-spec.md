# Porter - Main Specification

**Version:** 2.0.0
**Status:** Active Development
**Architecture:** Cloud-Native (SvelteKit + Modal)
**Last Updated:** January 26, 2026

---

## Overview

Porter is a cloud-native AI agent orchestrator for GitHub Issues. It brings the @mention workflow to any CLI-based coding agent and produces PRs automatically.

**BYOC-only model:** Porter does not manage compute or model billing. Users connect their own Modal account and LLM API keys stored in a user-owned GitHub Gist.

**Core value:** Comment `@porter <agent>` on an issue and get a PR back, without running the agent locally.

---

## Problem and Solution

GitHub's @copilot workflow is great but locked to Copilot. Teams using Claude Code, Opencode, Amp, or other agents are stuck with manual cloning and PR creation. Porter makes the @mention workflow universal and cloud-executed.

---

## Core Principles

1. **BYOC Execution**
   - Users bring Modal and LLM credentials.
   - Porter orchestrates, users pay for compute and model usage.

2. **GitHub as Source of Truth**
   - Issues and PRs store task state.
   - Config and credentials live in a user-owned private Gist.

3. **Agent Agnostic**
   - Clean adapter interface for any CLI-based agent.

4. **Monolithic Simplicity**
   - Single SvelteKit service (UI + API).

---

## Architecture

### High-Level System Design

```
GitHub Issues/PRs/Webhooks/Gists
           │
           ▼
Porter (SvelteKit UI + API)
           │
           ▼
Modal (ephemeral containers running agents)
```

### Core Flow

```
1. User comments: @porter <agent>
2. GitHub webhook triggers Porter
3. Porter validates, enriches prompt, reads user Gist
4. Porter triggers Modal with user credentials
5. Container runs agent, creates branch and PR
6. Modal calls back with PR URL
7. Porter comments on the issue with the PR
```

Typical execution time: 2-10 minutes depending on issue scope.

---

## Tech Stack

### Web App (SvelteKit)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | SvelteKit | UI + API routes |
| Runtime | Bun | Server runtime |
| Language | TypeScript | Application code |
| Styling | Tailwind CSS | UI styling |

### Execution Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containers | Modal | Serverless execution |
| Agent Runtime | Python | Agent orchestration |
| Base OS | Debian Slim | Lightweight images |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Hosting | Vercel or Cloudflare Pages | Web + API |
| Auth | GitHub OAuth | User authentication |
| Config Storage | GitHub Gists | User config and credentials |
| State Storage | GitHub Issues/PRs | Task state |
| Webhooks | GitHub App | Events |

### Supported Agents

| Agent | Provider | Status |
|-------|----------|--------|
| Opencode | Anthropic | Default |
| Claude Code | Anthropic | Primary |
| Amp | Anthropic | Secondary |
| Cursor | Anthropic/OpenAI | Future |

---

## User Model and Credentials

**Users provide:**
- GitHub OAuth
- Modal token ID and secret
- LLM API keys (Anthropic required, OpenAI optional)

**Porter provides:**
- Orchestration and UI
- GitHub App integration
- Unified settings management

**Credential storage:**
- Stored in a single private GitHub Gist owned by the user
- Read at runtime and injected into Modal containers
- Users can revoke by rotating keys or deleting the Gist

---

## Prompt Enrichment (WRAP)

Porter builds prompts in WRAP format:

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

Context sources:
- Issue metadata (title, body, labels, comments)
- Repository docs (`AGENTS.md`, `.porter/config.json`, README)
- Repository summary (top-level tree, primary language)

---

## Modal Execution

### Container Image (illustrative)

```python
from modal import Image

porter_image = (
    Image.debian_slim()
    .apt_install("git", "curl", "build-essential")
    .pip_install("opencode-cli", "amp-cli")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
    )
)
```

### Execution Function (illustrative)

```python
@app.function(image=porter_image, timeout=600, memory=2048, cpu=2.0)
def execute_agent_task(task_id, repo_url, repo_name, issue_number,
                       agent_name, enriched_prompt, callback_url, credentials):
    os.environ["GITHUB_TOKEN"] = credentials["github_token"]
    os.environ["ANTHROPIC_API_KEY"] = credentials["anthropic_api_key"]
    if credentials.get("openai_api_key"):
        os.environ["OPENAI_API_KEY"] = credentials["openai_api_key"]

    clone_dir = f"/tmp/{repo_name}"
    subprocess.run(["git", "clone", repo_url, clone_dir], check=True)
    os.chdir(clone_dir)

    if agent_name == "opencode":
        result = subprocess.run(["opencode", "--prompt", enriched_prompt, "--create-pr"],
                                capture_output=True, text=True)
    elif agent_name == "claude-code":
        result = subprocess.run(["claude-code", "--prompt", enriched_prompt],
                                capture_output=True, text=True)
    elif agent_name == "amp":
        result = subprocess.run(["amp", "--prompt", enriched_prompt],
                                capture_output=True, text=True)
    else:
        raise ValueError(f"Unknown agent: {agent_name}")

    pr_url = extract_pr_url(result.stdout)
    requests.post(callback_url, json={
        "task_id": task_id,
        "status": "success" if result.returncode == 0 else "failed",
        "pr_url": pr_url,
        "logs": result.stdout,
        "error": result.stderr if result.returncode != 0 else None,
    })
```

### Resource Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Timeout | 10 minutes | Most tasks complete quickly |
| Memory | 2GB | Agent + repo |
| CPU | 2 cores | Burstable |
| Storage | 10GB ephemeral | Fresh per task |
| Concurrency | 10 per user | Prevent abuse |

### Cost Model

Porter is open source and free to run. Users pay for Modal and LLM usage:

| Service | Purpose | Cost |
|---------|---------|------|
| Modal | Container execution | ~ $0.03 per 3-minute task |
| Anthropic | LLM inference | Per-token pricing |
| OpenAI (optional) | LLM inference | Per-token pricing |

---

## API Design

### REST Endpoints

**Webhooks**
```
POST /api/webhooks/github
```

**Tasks**
```
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id/retry
DELETE /api/tasks/:id
```

**Agents**
```
GET /api/agents
GET /api/agents/:name
```

**Config**
```
GET /api/config
PUT /api/config
```

**Callbacks (from Modal)**
```
POST /api/callbacks/task-update
POST /api/callbacks/task-complete
```

### Data Models

```typescript
interface Task {
  id: string
  status: "queued" | "running" | "success" | "failed"
  repo: string
  issueNumber: number
  issueTitle: string
  issueBody: string
  agent: string
  priority: number
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  createdBy: string
  prNumber?: number
  prUrl?: string
  errorMessage?: string
  logs: LogEntry[]
}

interface LogEntry {
  timestamp: Date
  level: "info" | "warning" | "error" | "success"
  message: string
}

interface Agent {
  name: string
  displayName: string
  description: string
  provider: string
  languages: string[]
  status: "available" | "unavailable" | "deprecated"
  version: string
  icon: string
}

interface Config {
  version: string
  modal: { tokenId: string; tokenSecret: string }
  agents: { [name: string]: { enabled: boolean; priority: number; customPrompt?: string } }
  credentials: { anthropic: string; openai?: string }
  repositories: {
    [repo: string]: { defaultAgent: string; autoAssign: boolean; skipLabels: string[] }
  }
  notifications: { email: boolean; webhook?: string }
}
```

---

## GitHub Integration

### GitHub App Permissions

- Contents: read/write
- Issues: read/write
- Pull Requests: read/write
- Metadata: read
- Members: read

### Webhook Events

- issue_comment.created
- issues.opened (auto-run optional)
- issues.closed (cancel)
- pull_request.merged (mark complete)

### Command Syntax

```
@porter <agent> [flags]
```

Flags:
- --priority=low|normal|high
- --no-tests
- --model=<name>
- --branch=<name>

Control commands:
- @porter stop
- @porter retry
- @porter status

---

## User Interface

### Key Pages

1. **Dashboard** (`/`): overview stats, active tasks, quick actions
2. **Tasks** (`/tasks`): list, filtering, detail view
3. **Settings** (`/settings`): GitHub connection, agents, Modal/LLM keys

### Onboarding Flow

1. Sign in with GitHub OAuth
2. Install Porter GitHub App
3. Connect Modal and add LLM keys
4. Select repositories
5. Start using @porter comments

---

## Testing Strategy

- Unit tests: prompt enrichment, GitHub/Modal helpers
- Component tests: Svelte components with mocked data
- Integration tests: API routes + webhooks
- E2E tests: onboarding and task lifecycle (Playwright)

---

## Development Roadmap

### Phase 1: UI Foundation + Testing
- Dashboard feed, task detail view, filtering, mock data, component tests, Playwright scaffolding

### Phase 2: Onboarding + Auth
- GitHub OAuth, onboarding wizard, config persistence

### Phase 3: Core API + Task Model
- Task CRUD, Gist config storage, agent registry, webhook validation, WebSocket updates

### Phase 4: Modal Execution
- Modal integration, Opencode adapter, callbacks, PR creation

### Phase 5: GitHub App + Multi-Agent
- App setup, Claude Code and Amp adapters, priority queue, retry handling

### Phase 6: Polish + Launch Prep
- Task history, error handling, notifications, performance, docs, launch assets

### Phase 7: Post-Launch
- GitLab/Gitea support, additional providers, team features, billing

---

## Success Metrics

### MVP
- Webhook dispatch to Modal
- Agent runs and creates PR
- Error handling for timeouts and failures
- Task history visible

### Beta
- 3+ agents supported
- 100+ tasks completed
- <30s webhook-to-start latency
- 95%+ success rate on valid tasks

### Launch (Week 1)
- 500+ GitHub stars
- 20+ real users
- No critical bugs

---

## Deployment

### SvelteKit App

```bash
cd web
bun install
bun run dev
```

Production:

```bash
bun run build
vercel deploy
```

Environment variables:

```
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
PUBLIC_APP_URL=https://<domain>
```

### Modal Functions

```bash
cd modal
modal serve app.py
```

Production:

```bash
modal deploy app.py
```

Provider keys are always read from the user Gist at runtime.

---

## Open Questions

1. Multi-repo tasks
2. Team-level queues and org settings
3. Rate limiting on free tier
4. Agent versioning and upgrades

---

**End of Specification**
