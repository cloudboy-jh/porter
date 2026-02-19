# Porter - Main Specification

**Version:** 3.2.0
**Status:** Active Development
**Architecture:** SvelteKit + Fly Machines
**Last Updated:** February 18, 2026

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
| Hosting | Cloudflare (Workers) |
| Auth | GitHub OAuth |
| Execution | Fly Machines |
| Container | Docker (Node 20 + Agent CLIs) |
| Config Storage | Cloudflare D1 (primary; settings + secrets + oauth token lookup) |
| Optional Mirror | GitHub Gist (best-effort, non-blocking) |

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
3. Porter resolves commenter OAuth token via D1 (`user_oauth_tokens`) and loads D1-backed config/secrets
4. Porter builds enriched prompt from issue context
5. Porter validates machine launch contract (`TASK_ID`, repo metadata, callback token/url, required provider keys, Fly credentials)
6. Porter calls Fly Machines API to create container
7. Container clones repo, runs agent, and prepares changes
8. Container calls Porter callback with result payload
9. Porter reconciles callback/watchdog state, updates labels/comments, and links PR
10. Machine auto-destroys on exit; stale running tasks are timed out by watchdog

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

### Auth / Session

```
GET  /api/auth/github                # OAuth start / reconnect
GET  /api/auth/github/callback       # OAuth callback
GET  /api/auth/github/installed      # Post-install redirect handling
GET  /api/auth/diagnostics           # Scope + installation diagnostics
POST /api/auth/logout                # Clear session
```

### Tasks

```
GET    /api/tasks            # List tasks
POST   /api/tasks            # Create task (internal)
GET    /api/tasks/history    # History/task feed
GET    /api/tasks/:id/status # Task status
POST   /api/tasks/:id/retry  # Retry task
POST   /api/tasks/:id/stop   # Stop task
```

### Callbacks

```
POST /api/callbacks/complete # Receives completion from container
```

### Config

```
GET /api/config              # Get user config from D1
PUT /api/config              # Update user config in D1
PUT /api/config/credentials             # Legacy credential surface (status-based response)
GET /api/config/provider-credentials     # Per-provider secret status map
PUT /api/config/provider-credentials     # Save provider credentials
PUT /api/config/fly                     # Save/validate Fly credentials
GET /api/config/providers               # Provider catalog
POST /api/config/validate/anthropic     # Anthropic key validation
POST /api/config/validate/fly           # Fly credential validation
```

### GitHub Data

```
GET /api/github/summary
GET /api/github/repositories
GET /api/github/installations
GET /api/github/orgs
GET /api/github/profile
GET /api/github/issues/:owner/:repo/:number
```

### Ops / Health

```
GET /api/startup/check      # Required env + D1 readiness check
GET /api/rate-limit         # GitHub API rate-limit info
```

---

## Data Models

```typescript
interface Task {
  id: string
  status: "queued" | "running" | "success" | "failed" | "timed_out"
  repoOwner: string
  repoName: string
  issueNumber: number
  issueTitle: string
  issueBody: string
  agent: string
  priority: number
  progress: number
  createdBy: string
  branch?: string
  prUrl?: string
  callbackAttempts?: number
  callbackMaxAttempts?: number
  callbackLastHttpCode?: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
}

interface PorterConfig {
  version: string
  executionMode: "cloud" | "priority"
  flyToken: string
  flyAppName?: string
  agents: Record<string, { enabled: boolean; priority?: "low" | "normal" | "high" }>
  providerCredentials?: Record<string, Record<string, string>>
  settings: { maxRetries: number; taskTimeout: number; pollInterval: number }
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
@porter opencode
@porter claude
@porter amp
@porter opencode --priority=high fix flaky test runner
@porter --priority=low clean up docs typos
```

Notes:

- If no agent is supplied, Porter defaults to `opencode`.
- Supported priorities: `low`, `normal`, `high`.

---

## User Onboarding

1. Sign in with GitHub OAuth
2. Install Porter GitHub App on repos
3. Save encrypted config and keys in Porter settings (D1-backed)
4. Add Fly token to config
5. Comment `@porter opencode` on any issue

---

## Credential Storage

All credentials are stored server-side in Cloudflare D1 with encryption-at-rest for secret values.
GitHub Gist is optional mirror/export only and is not required for save success.

Schema overview:

- `users`: user identity key and metadata anchor
- `user_settings`: non-secret user config JSON
- `user_secrets`: encrypted provider secrets (`encrypted_value`, `iv`, `tag`, `alg`, `key_version`)
- `user_oauth_tokens`: encrypted OAuth tokens keyed by `github_user_id` and normalized login

Example non-secret settings shape:

```json
{
  "version": "1.0.0",
  "executionMode": "cloud",
  "flyAppName": "porter-prod",
  "agents": {
    "opencode": { "enabled": true, "priority": "normal" },
    "claude-code": { "enabled": true, "priority": "normal" },
    "amp": { "enabled": false, "priority": "normal" }
  },
  "settings": { "maxRetries": 3, "taskTimeout": 90, "pollInterval": 10 },
  "onboarding": {
    "completed": true,
    "selectedRepos": [],
    "enabledAgents": ["opencode", "claude-code"]
  }
}
```

Porter decrypts and injects needed keys at runtime into container env vars.

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
- D1-backed config and key management

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

1. Verify production dry-run from real `@porter` mention through merged PR after D1 migration.
2. Add deeper failure-mode assertions for callback idempotency and stale-machine cleanup.
3. Expand lifecycle/auth observability (metrics + alerting thresholds) for launch.

---

**End of Specification**
