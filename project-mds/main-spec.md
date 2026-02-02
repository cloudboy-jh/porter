# Porter - Main Specification

**Version:** 3.0.0
**Status:** Active Development
**Architecture:** SvelteKit + Fly Machines
**Last Updated:** February 2, 2026

---

## Overview

Porter is a cloud-native AI agent orchestrator for GitHub Issues. Comment `@porter <agent>` on an issue and get a PR back.

**Core value:** Universal @mention workflow for any CLI-based coding agent, executed in the cloud.

---

## Architecture

```
GitHub (Issues, PRs, Webhooks)
           │
           ▼
    Porter (SvelteKit)
           │
           ▼
    Fly Machines API
           │
           ▼
    Docker Container
    (Agent CLI runs, creates PR)
           │
           ▼
    Callback to Porter
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web App | SvelteKit + Bun |
| Hosting | Vercel |
| Auth | GitHub OAuth |
| Execution | Fly Machines |
| Container | Docker (Node 20 + Agent CLIs) |
| Config Storage | GitHub Gist (user-owned) |

---

## Supported Agents

| Agent | Package | Headless Command |
|-------|---------|------------------|
| Opencode | `opencode-ai` | `opencode run --model anthropic/claude-sonnet-4 "prompt"` |
| Claude Code | `@anthropic-ai/claude-code` | `claude -p "prompt" --dangerously-skip-permissions` |
| Amp | `@sourcegraph/amp` | `amp -x "prompt" --dangerously-allow-all` |

---

## Docker Image

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y git curl && \
    npm install -g opencode-ai @anthropic-ai/claude-code @sourcegraph/amp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

**Image builds once, pushed to Fly registry, cached for all tasks.**

---

## Entrypoint

```bash
#!/bin/bash
set -e

# Clone repo
git clone "https://${GITHUB_TOKEN}@github.com/${REPO_FULL_NAME}.git" .
git checkout -b "porter/${TASK_ID}"

# Run agent
case "$AGENT" in
  opencode)
    opencode run --model anthropic/claude-sonnet-4 "$PROMPT"
    ;;
  claude)
    claude -p "$PROMPT" --dangerously-skip-permissions
    ;;
  amp)
    amp -x "$PROMPT" --dangerously-allow-all
    ;;
esac

# Callback
curl -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d "{\"task_id\": \"$TASK_ID\", \"status\": \"complete\"}"
```

---

## Core Flow

1. User comments `@porter opencode` on GitHub issue
2. GitHub webhook hits Porter
3. Porter reads user config from their Gist (API keys, preferences)
4. Porter builds enriched prompt from issue context
5. Porter calls Fly Machines API to create container
6. Container: clones repo, runs agent, agent creates PR
7. Container calls Porter callback with result
8. Porter comments on issue with PR link
9. Machine auto-destroys on exit

---

## Fly Machines Integration

**Create Machine:**

```
POST https://api.machines.dev/v1/apps/{app}/machines

{
  "config": {
    "image": "registry.fly.io/porter-worker:latest",
    "auto_destroy": true,
    "env": {
      "TASK_ID": "task_abc123",
      "REPO_FULL_NAME": "user/repo",
      "AGENT": "opencode",
      "PROMPT": "Fix the bug described in issue #42...",
      "GITHUB_TOKEN": "ghp_xxx",
      "ANTHROPIC_API_KEY": "sk-ant-xxx",
      "AMP_API_KEY": "amp_xxx",
      "CALLBACK_URL": "https://porter.dev/api/callbacks/complete"
    },
    "guest": {
      "cpu_kind": "shared",
      "cpus": 2,
      "memory_mb": 2048
    }
  }
}
```

**Headers:**

```
Authorization: Bearer {FLY_API_TOKEN}
Content-Type: application/json
```

---

## API Endpoints

### Webhooks

```
POST /api/webhooks/github    # Receives issue_comment events
```

### Tasks

```
GET    /api/tasks            # List tasks
POST   /api/tasks            # Create task (internal)
GET    /api/tasks/:id        # Get task
DELETE /api/tasks/:id        # Cancel task
```

### Callbacks

```
POST /api/callbacks/complete # Receives completion from container
```

### Config

```
GET /api/config              # Get user config from Gist
PUT /api/config              # Update user config in Gist
```

---

## Data Models

```typescript
interface Task {
  id: string
  status: "queued" | "running" | "complete" | "failed"
  repo: string
  issueNumber: number
  agent: string
  prompt: string
  machineId?: string
  prUrl?: string
  createdAt: Date
  completedAt?: Date
  error?: string
}

interface UserConfig {
  flyToken: string
  anthropicKey: string
  ampKey?: string
  openaiKey?: string
  defaultAgent: string
}
```

---

## Prompt Enrichment

Porter builds the prompt sent to the agent:

```markdown
## Task
{issue title}

## Description
{issue body}

## Repository Context
{from AGENTS.md if present}

## Instructions
Complete this GitHub issue by making the necessary code changes.
Create a branch, make commits, and open a pull request.
Reference issue #{issue_number} in the PR description.
```

---

## GitHub Integration

### GitHub App Permissions

- Contents: read/write
- Issues: read/write
- Pull Requests: read/write
- Metadata: read

### Webhook Events

- `issue_comment.created` (trigger on @porter mention)
- `issues.closed` (cancel running tasks)

### Command Syntax

```
@porter <agent>
@porter opencode
@porter claude
@porter amp
```

---

## User Onboarding

1. Sign in with GitHub OAuth
2. Install Porter GitHub App on repos
3. Create config Gist with API keys
4. Add Fly token to config
5. Comment `@porter opencode` on any issue

---

## Credential Storage

All credentials stored in user-owned private GitHub Gist:

```json
{
  "fly_token": "...",
  "anthropic_api_key": "...",
  "amp_api_key": "...",
  "default_agent": "opencode"
}
```

Porter reads Gist at runtime, injects into container env vars.

---

## Resource Limits

| Resource | Limit |
|----------|-------|
| Timeout | 10 minutes |
| Memory | 2 GB |
| CPU | 2 shared cores |
| Concurrent tasks per user | 5 |

---

## Cost Model

Porter is free. Users pay for:

| Service | Cost |
|---------|------|
| Fly Machines | ~$0.01-0.05 per task |
| Anthropic/OpenAI | Per-token pricing |
| Amp | Per Amp pricing |

---

## Development Phases

### Phase 1: Core Infrastructure
- Docker image with all agents
- Fly Machines integration
- Webhook handler
- Callback endpoint

### Phase 2: Web App
- SvelteKit scaffold
- GitHub OAuth
- Task list UI
- Gist config management

### Phase 3: GitHub App
- App registration
- Webhook verification
- Issue comment parsing
- PR link commenting

### Phase 4: Polish
- Error handling
- Retry logic
- Task history
- Settings UI

---

## Open Questions

1. How do agents handle PR creation? (Need to verify each agent's git workflow)
2. Should Porter create the branch/PR or let agents do it?
3. Rate limiting strategy for free tier abuse prevention

---

**End of Specification**
