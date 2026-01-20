# Porter

Universal agent orchestrator for GitHub Issues. Assign any issue to any AI coding agent with `@porter`.

**Version:** 1.0.0
**Status:** Final
**Last Updated:** January 15, 2026

---

## The Problem

GitHub's Copilot coding agent only works with `@copilot`. Everyone using Opencode, Claude Code, Aider, or other agents is locked out of the `@assign` workflow. The "issues are prompts, PRs are prompt review" paradigm only works if you're on GitHub's agent.

## What Porter Does

Porter orchestrates AI coding agents to close GitHub issues by opening PRs. You `@porter <agent-name>` in any issue, Porter enriches the prompt, invokes the agent (locally or in the cloud), and tracks the PR back to completion.

**Porter is agent-agnostic.** It doesn't run models or execute code—it orchestrates agent tools (Opencode, Claude Code, Aider, etc.) that do the actual work.
**Opencode ships as the default adapter.** Claude Code is supported as a first-class secondary adapter, and the adapter interface is stable so teams can bring any agent later.

---

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  GitHub Issue   │
│ @porter opencode │
└────────┬────────┘
         │ webhook
         ▼
┌─────────────────┐
│   Porter Web    │◄──── GitHub OAuth
│   (SvelteKit)   │      Config in Gists
└────────┬────────┘
         │ task assignment
         ▼
┌─────────────────┐
│ Porter Desktop  │◄──── Wails (Go + Svelte)
│    (Daemon)     │      Runs locally
└────────┬────────┘
         │ spawns agent
         ▼
┌─────────────────┐
│  Agent Process  │      Opencode, Claude Code, Aider, etc.
│  (Local CLI)    │      Works on cloned repo
└────────┬────────┘
         │ commits + PR
         ▼
┌─────────────────┐
│   GitHub PR     │
│   for review    │
└─────────────────┘
```

### Key Principles

- **GitHub is source of truth** - All state lives in GitHub (issues, PRs, branches)
- **No database** - Config stored in GitHub Gists (portable, versionable)
- **Local-first execution** - Desktop daemon spawns agents on your machine
- **Cloud execution later** - TBD for Phase 2 (Modal/Fly/Railway)

### Tech Stack

| Component | Tech | Notes |
|-----------|------|-------|
| Web App | SvelteKit | Dashboard, config UI, OAuth |
| Desktop App | Wails (Go + Svelte) | Local daemon + monitoring |
| Auth | GitHub OAuth | Via GitHub App |
| Config Storage | GitHub Gist | Portable, versionable |
| Task Queue | GitHub Webhooks | No separate queue needed |
| State | GitHub (Issues, PRs) | Source of truth |

---

## Execution Modes

Porter supports two execution modes. User chooses based on their needs.

### Local Execution (Free)
- Desktop daemon runs on your machine
- Spawns agent tools as local processes (Opencode, Claude Code, Aider, etc.)
- Laptop must be on while agents work
- Full control, runs on your hardware
- No cloud costs

### Cloud Execution (Paid - Phase 2)
- Agents run in cloud containers (provider TBD)
- Fully async, works when laptop is off
- True background execution
- Usage-based pricing
- Porter manages infrastructure

**Both modes use the same flow and UI.** The only difference is where agents execute.

---

## Core Flow

1. User comments `@porter <agent-name>` on a GitHub issue
2. Porter (via GitHub App webhook) receives the assignment
3. Porter enriches the prompt (WRAP format): issue + AGENTS.md + repo context
4. If local mode: Desktop daemon picks up task, clones repo, spawns agent
5. Agent works, commits changes, opens PR
6. Porter updates issue with PR link and status
7. User reviews PR as normal

### WRAP Prompt Enrichment

Porter uses WRAP (Write, Refine, Assess, Pass) to build better prompts:

```
## Issue
{issue title}
{issue body}

## Repository Context
{from AGENTS.md if present}
{key files and structure}

## Instructions
Complete this issue by making the necessary changes.
Open a PR when done.
```

---

## GitHub Integration

### GitHub App

Porter uses a GitHub App for:
- Webhook events (`issue_comment.created`)
- OAuth authentication
- Repository access (clone, read, PR creation)

**Required Scopes:**
- `repo` - Full repository access
- `read:org` - Organization membership
- `write:discussion` - Comment on issues

### Command Syntax

```
@porter <agent>                    # Assign to agent
@porter <agent> --priority=high    # With priority
@porter stop                       # Stop current task
@porter retry                      # Retry failed task
@porter status                     # Get task status
```

### Webhook Events

- `issue_comment.created` - New @porter command
- `issues.closed` - Cancel related tasks
- `pull_request.merged` - Mark task complete

---

## User Interface

### Design System

**Color Palette:**
```css
/* Base - Pure Black */
--bg-primary: #000000;
--bg-secondary: #0a0a0a;
--bg-tertiary: #141414;
--bg-hover: #1a1a1a;

/* Borders */
--border: #262626;
--border-hover: #404040;

/* Text */
--text-primary: #fafafa;
--text-secondary: #a3a3a3;
--text-tertiary: #737373;

/* Accent - Amber */
--accent: #fb923c;
--accent-hover: #f97316;
--accent-light: #fdba74;

/* Status */
--success: #22c55e;
--warning: #facc15;
--error: #ef4444;

/* Agent Colors */
--agent-aider: #fb923c;
--agent-cursor: #8b5cf6;
--agent-windsurf: #3b82f6;
--agent-cline: #ec4899;
```

**Typography:**
- **UI Font:** Inter (400, 500, 600, 700)
- **Monospace:** JetBrains Mono (logs, code, repo names)
- **Base Size:** 14px
- **Line Height:** 1.5

**Spacing Scale:**
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

**Visual Style:**
- Rounded corners (6-12px radius)
- Subtle dot grid background (24px spacing, 1.5% opacity)
- Amber glow on active/running elements
- Shimmer animation on progress bars
- Pulsing status dots for running tasks

---

### Web Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar (260px)        │ Main Content                        │
│                        │                                      │
│ ┌────────────────────┐ │ ┌──────────────────────────────────┐│
│ │ @ Porter           │ │ │ Header                           ││
│ │   Task Orchestrator│ │ │ Porter › Active Tasks  [Settings]││
│ └────────────────────┘ │ │                        [+ New]   ││
│                        │ ├──────────────────────────────────┤│
│ PLATFORM               │ │ Status Pills                     ││
│ ▦ Dashboard      ←     │ │ [● 2 Running] [○ 1 Queued]       ││
│ ⚙ Settings             │ │ [✓ 1 Completed] [⚠ 1 Failed]     ││
│                        │ └──────────────────────────────────┘│
│ AGENTS                 │                                      │
│ [OC] opencode     (2)  │ ┌──────────────────────────────────┐│
│ [CC] claude       (1)  │ │ Filter: [All] [Running] [Queued] ││
│ [CR] cursor       (1)  │ │         [Completed] [Failed]     ││
│ [WS] windsurf          │ ├──────────────────────────────────┤│
│ [CL] cline             │ │                                  ││
│ [AI] aider             │ └──────────────────────────────────┘│
│                        │ │ Task Table                       ││
│ STATS                  │ │                                  ││
│ ┌──────────────────┐   │ │ STATUS │ TASK │ REPO │ AGENT │ % ││
│ │ 12    │ 87%     │   │ │ ───────┼──────┼──────┼───────┼───││
│ │ Today │ Success │   │ │ ● RUN  │ ...  │ ...  │opencode│65%││
│ ├───────┼─────────┤   │ │ ○ QUE  │ ...  │ ...  │ claude │ 0%││
│ │ 8m    │ 4h      │   │ │ ✓ DONE │ ...  │ ...  │windsurf│100││
│ │ Avg   │ Uptime  │   │ │ ✗ FAIL │ ...  │ ...  │ cursor │45%││
│ └──────────────────┘   │ │                                  ││
│                        │ └──────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Sidebar Components

**Logo Block:**
- Amber gradient icon with `@` symbol
- "Porter" title with "Task Orchestrator" subtitle
- Amber glow effect on icon

**Navigation:**
- Platform section: Dashboard (active), Settings
- Active state: darker background + border

**Agents List:**
- Colored avatar circles with 2-letter abbreviation
- Agent name
- Task count badge (amber pill) if tasks assigned

**Stats Grid:**
- 2x2 grid in tertiary background
- Large value + small label
- Metrics: Today (count), Success (%), Avg Time, Uptime

### Main Content Components

**Header:**
- Breadcrumb: "Porter › Active Tasks"
- Action buttons: Settings (secondary), + New Task (primary amber)

**Status Pills:**
- Horizontal row of pill badges
- Each shows: status dot + count + label
- Running pill: amber border + tinted background + pulsing dot
- Failed pill: red border + tinted background

**Filter Bar:**
- Row of filter buttons
- Active filter: amber background with glow
- Options: All, Running, Queued, Completed, Failed

**Task Table:**
- Columns: Status, Task, Repository, Agent, Progress, Actions
- Sortable column headers
- Row hover: darker background + show action buttons
- Running rows: 3px amber left border + subtle amber tint

### Table Row States

**Default Row:**
- Background: `--bg-secondary`
- Border bottom: `--border`

**Hover Row:**
- Background: `--bg-hover`
- Action buttons visible

**Running Row:**
- 3px amber left border
- Subtle amber background tint (3%)
- Status badge: amber with glow

**Expanded Row:**
- Darker background (`--bg-hover`)
- Expansion panel below

### Status Badges

```
┌─────────────────────────────────────────┐
│ ● RUNNING  │ Amber bg, black text, glow │
│ ○ QUEUED   │ Tertiary bg, border, gray  │
│ ✓ DONE     │ Green bg, black text       │
│ ✗ FAILED   │ Red bg, white text         │
└─────────────────────────────────────────┘
```

### Progress Bar

- Track: tertiary background with border, 8px height, full rounded
- Fill: amber gradient (left darker, right lighter)
- Running: shimmer animation overlay
- Success: green gradient
- Failed: red gradient
- Glow effect matching fill color
- Percentage label: monospace, secondary text

### Inline Row Expansion

Clicking a row expands details below it:

```
┌────────────────────────────────────────────────────────────┐
│ ● RUN │ Add user auth system │ porter #42 │opencode│ ██░ 65%│
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ EXPANSION PANEL (3px amber left border)               │ │
│ │                                                       │ │
│ │ Issue        Repository           Agent      Started  │ │
│ │ #42          jackgolding/porter   opencode   2m ago   │ │
│ │                                                       │ │
│ │ TASK LOGS                                             │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ 14:32:01  INFO     Starting task execution       │ │ │
│ │ │ 14:32:03  INFO     Analyzing codebase structure  │ │ │
│ │ │ 14:32:08  INFO     Found 23 relevant files       │ │ │
│ │ │ 14:32:18  SUCCESS  Created src/auth/provider.ts  │ │ │
│ │ │ 14:32:22  SUCCESS  Created src/auth/middleware.ts│ │ │
│ │ │ 14:32:35  WARNING  Test coverage at 78%          │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │                                                       │ │
│ │ [■ Stop]  [⟳ Restart]  [→ View in GitHub]            │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ ○ QUE │ Fix memory leak        │ churn #128 │ cursor │ 0% │
└────────────────────────────────────────────────────────────┘
```

**Expansion Panel Contents:**
1. **Metadata Grid:** 4 columns - Issue, Repository, Agent, Started
2. **Task Logs:** Scrollable container (max 300px), monospace font
   - Columns: timestamp (tertiary), level (colored), message (secondary)
   - Levels: INFO (amber), SUCCESS (green), WARNING (yellow), ERROR (red)
3. **Action Buttons:** Stop (danger), Restart, View in GitHub

### Settings Dialog

Modal dialog triggered from header or sidebar:

```
┌─────────────────────────────────────────────────────────┐
│ Settings                                           [✕] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ EXECUTION MODE                                          │
│ ○ Local (Desktop daemon)                                │
│ ○ Cloud (Coming soon)                                   │
│                                                         │
│ GITHUB CONNECTION                                       │
│ Status: ● Connected as @jackgolding                     │
│ [Disconnect]                                            │
│                                                         │
│ AGENT CONFIGURATION                                     │
│ Agents are auto-detected from your system.              │
│ [Refresh Agents]                                        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✓ opencode ~/.local/bin/opencode                   │ │
│ │ ✓ claude   ~/.claude/claude                        │ │
│ │ ✗ cursor   Not found                               │ │
│ │ ✗ aider    Not found                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                              [Cancel]  [Save Changes]   │
└─────────────────────────────────────────────────────────┘
```

---

### Desktop App (Wails)

The desktop app is a Wails application (Go backend + Svelte frontend) that:
- Runs as a daemon on your machine
- Picks up tasks assigned via the web app
- Spawns local agent processes
- Streams logs back to web app
- Shows system tray status

**Distribution:** GitHub Releases (DMG for Mac, MSI for Windows, AppImage for Linux)

**Desktop Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Porter                                        [─] [□] [✕] │
├────────────────────────────────────────────────────────────┤
│ Left Panel (flex)          │ Right Panel (320px)          │
│                            │                               │
│ CURRENT TASK               │ METRICS                       │
│ Add user auth system       │ ┌───────────┬───────────┐    │
│ porter #42 • opencode      │ │ 12 tasks  │ 87%       │    │
│                            │ │ today     │ success   │    │
│ ████████████░░░░░░ 65%     │ └───────────┴───────────┘    │
│                            │                               │
│ [■ Stop]  [⟳ Restart]      │ QUEUE (1)                     │
│                            │ ○ Fix memory leak             │
│ LOGS                       │                               │
│ ┌────────────────────────┐ │                               │
│ │ 14:32:01 INFO Starting │ │ AGENTS                        │
│ │ 14:32:03 INFO Analyzing│ │ ● opencode Active             │
│ │ 14:32:08 INFO Found 23 │ │ 14:32:18 ✓ Created ...        │
│ │ 14:32:22 ✓ Created ... │ │                               │
│ └────────────────────────┘ │                               │
├────────────────────────────────────────────────────────────┤
│ ● Connected │ ws://localhost:3000 │ 4h uptime              │
└────────────────────────────────────────────────────────────┘
```

**System Tray:**
- Icon states: Green (active), Yellow (idle), Red (error), Gray (paused)
- Right-click menu: Show Porter, Open Web Dashboard, Pause/Resume, Quit
- Left-click: Show/hide window

---

## API Design

### REST Endpoints

**Tasks:**
```
GET    /api/tasks                # List tasks (from GitHub)
POST   /api/tasks                # Create task (manual)
PUT    /api/tasks/:id/stop       # Stop task
PUT    /api/tasks/:id/retry      # Retry failed task
```

**Agents:**
```
GET    /api/agents               # List detected agents
GET    /api/agents/:name/status  # Get agent status
```

**Config:**
```
GET    /api/config               # Get config (from Gist)
PUT    /api/config               # Update config (to Gist)
```

### WebSocket Protocol

**Connection:** `ws://localhost:3000/ws`

**Server → Client Events:**
```typescript
// Task status update
{
  type: 'task_update',
  data: {
    id: 'task_123',
    status: 'running',
    progress: 45
  }
}

// Log entry
{
  type: 'log',
  data: {
    taskId: 'task_123',
    level: 'info',
    message: 'Analyzing codebase...',
    timestamp: '2026-01-15T14:32:03Z'
  }
}

// Agent status change
{
  type: 'agent_status',
  data: {
    agent: 'opencode',
    status: 'active',
    currentTask: 'task_123'
  }
}
```

**Client → Server Events:**
```typescript
// Subscribe to task updates
{
  type: 'subscribe',
  taskId: 'task_123' // or null for all
}
```

---

## Data Models

### Task (In-Memory / GitHub-Derived)

```typescript
interface Task {
  id: string;                    // Generated UUID
  status: 'queued' | 'running' | 'success' | 'failed';
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  agent: string;
  priority: 1 | 2 | 3 | 4 | 5;   // 5 is highest
  progress: number;              // 0-100
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;             // GitHub username
  prNumber?: number;             // If PR created
  errorMessage?: string;
}
```

### Agent Status

```typescript
interface AgentStatus {
  name: string;
  enabled: boolean;
  path: string;                  // Binary path
  status: 'active' | 'idle' | 'error';
  currentTaskId?: string;
}
```

### Config (Stored in Gist)

```typescript
interface PorterConfig {
  version: string;
  executionMode: 'local' | 'cloud';
  agents: {
    [name: string]: {
      enabled: boolean;
      path?: string;             // Auto-detected or manual
      args?: string[];
    }
  };
  settings: {
    maxRetries: number;
    taskTimeout: number;         // Minutes
    pollInterval: number;        // Seconds
  };
}
```

---

## Agent Integration

### Auto-Detection

Porter auto-detects installed agents by checking common paths:

```go
var agentPaths = map[string][]string{
    "opencode": {"~/.local/bin/opencode", "/usr/local/bin/opencode"},
    "claude":   {"~/.claude/claude", "/usr/local/bin/claude"},
    "aider":    {"/usr/local/bin/aider", "~/.local/bin/aider"},
}
```

### Agent Execution

```
1. Clone repo to temp directory
2. Build enriched prompt (WRAP format)
3. Spawn agent process with prompt
4. Stream stdout/stderr as logs
5. Monitor for completion
6. Detect PR creation
7. Update task status
8. Cleanup temp directory
```

### Agent Interface

Each agent adapter implements:

```go
type AgentAdapter interface {
    Name() string
    Detect() (path string, found bool)
    BuildCommand(task Task, repoPath string) *exec.Cmd
    ParseProgress(output string) int
}
```

---

## Deployment

### Web App (SvelteKit)

```bash
# Development
cd web
npm install
npm run dev

# Production
npm run build
# Deploy to Vercel/Cloudflare Pages
```

### Desktop App (Wails)

```bash
# Development
cd desktop
wails dev

# Build
wails build

# Output: build/bin/Porter.app (Mac)
```

### Distribution

- **Web App:** Hosted (Vercel/Cloudflare)
- **Desktop App:** GitHub Releases
  - Mac: `.dmg` (Universal binary)
  - Windows: `.msi`
  - Linux: `.AppImage`

---

## Development Roadmap // Progress 50%

### Phase 1: MVP (Weeks 1-4)
- [ ] GitHub App setup + webhook handler
- [ ] Web dashboard (SvelteKit)
- [ ] Desktop daemon (Wails)
- [ ] Opencode agent adapter
- [ ] Stable adapter interface
- [ ] Local execution flow
- [ ] Config storage in Gists
- [ ] WebSocket log streaming

### Phase 2: Multi-Agent (Weeks 5-6)
- [ ] Claude Code adapter
- [ ] Additional agent adapters
- [ ] Agent auto-detection
- [ ] Priority queue

### Phase 3: Polish (Weeks 7-8)
- [ ] Task history view
- [ ] Error handling + retry
- [ ] Notifications
- [ ] Performance optimization

### Phase 4: Cloud Execution (Future)
- [ ] Container runtime selection
- [ ] Cloud agent execution
- [ ] Usage tracking
- [ ] Billing integration

---

## Open Questions

1. **Container Provider:** Modal vs Fly vs Railway for cloud execution?
2. **Pricing Model:** Free tier limits? Per-task vs subscription?
3. **Multi-repo:** Support multiple repos per task?
4. **Team Features:** Shared queues? Org-level settings?

---

## Success Metrics

### MVP Success
- [ ] Successfully dispatch task to opencode (default adapter)
- [ ] View real-time logs in dashboard
- [ ] PR created and linked to issue
- [ ] Desktop daemon stable for 24h

### Beta Success
- [ ] 3+ agents supported
- [ ] 100+ tasks processed
- [ ] <5s task pickup latency
- [ ] Positive user feedback

---

**End of Specification**
