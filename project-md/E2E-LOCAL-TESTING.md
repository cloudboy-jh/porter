# End-to-End User Flow: Local Loop Testing

This guide walks through the complete local testing flow for Porter, from setup to task execution and PR creation.

## Prerequisites

### 1. GitHub Personal Access Token (PAT)

Create a GitHub token for the desktop daemon:

1. Go to [GitHub Token Settings](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Set the following scopes:
   - ✅ `repo` - Full control of private repositories
   - ✅ `gist` - For config storage (optional for now)
4. Generate the token and **copy it immediately** (you won't see it again)
5. Add to `.env` in the project root:
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   ```

### 2. Install Required Tools

**Git:** Ensure git is installed and in your PATH
```bash
git --version
```

**Agent Binaries:** Install at least one agent to test with (Opencode recommended):

- **Opencode:** Install from npm
  ```bash
  npm install -g opencode
  ```

- **Claude Code:** Install via your preferred CLI setup
  ```bash
  claude --version
  ```

- **Aider (optional):** [Installation Guide](https://docs.aider.chat/docs/install.html)
  ```bash
  pip install aider-chat
  ```

Verify installation:
```bash
opencode --version
# or
claude --version
```

### 3. Set Up a Test Repository

Create or choose a GitHub repository where you can push changes:

- Must have write access
- Can be private or public
- Clean slate is fine - we'll create a README as a test

## Start the Services

### Option 1: Desktop Daemon (Production Mode)

```bash
cd desktop
wails build
# Then run the built executable
./bin/Porter.exe  # Windows
./bin/Porter.app  # Mac
```

### Option 2: Desktop Daemon (Development Mode)

```bash
cd desktop
wails dev
```

This starts:
- HTTP server on `http://localhost:3000`
- WebSocket server for real-time updates
- Background task queue and execution

### Start Web Dashboard

```bash
cd web
bun run dev
```

Open `http://localhost:5173` in your browser.

## Verify Connection

1. Check the header in the web dashboard
2. You should see a connection badge:
   - 🟢 **connected** - Daemon is running and reachable
   - 🟡 **connecting** - Attempting to connect
   - 🔴 **disconnected** - Daemon not running
   - ❌ **error** - Connection failed

If disconnected:
- Verify daemon is running (check terminal output)
- Ensure no other process is using port 3000
- Check browser console for WebSocket errors

## Create a Test Task

### Step 1: Open Command Palette

- Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux)
- Or click the **"Dispatch"** button in the top-right

### Step 2: Configure Task

Fill in the form:

| Field | Value | Notes |
|-------|--------|-------|
| **Agent** | `opencode` or `claude` | Choose the agent you installed |
| **Repository** | `porter` or your test repo | Repository name (without owner) |
| **Prompt** | `Add a README.md file with project description` | Simple test task |

Example:
```
Agent: opencode
Repository: porter
Prompt: Add a README.md file with project description
```

### Step 3: Submit Task

Click **"Dispatch"** to create the task.

## Monitor Task Execution

### 1. Task Appears in Dashboard

Within seconds, the task should appear in the task list:

```
● RUN  Add a README.md file... porter  opencode  ████░ 0%
```

- **Status Badge:** Shows current state (RUN, QUE, DONE, FAIL)
- **Agent Icon:** Shows which agent is working
- **Progress Bar:** Updates in real-time

### 2. Expand Task for Logs

Click on the task row to expand and see logs:

```
┌─────────────────────────────────────────────────────────┐
│ Issue        Repository        Agent      Started   │
│ #1           jackgolding/porter   opencode   0s ago     │
│                                                     │
│ TASK LOGS                                          │
│ ┌───────────────────────────────────────────────────────┐│
│ │ 14:32:01  INFO     Starting task execution       ││
│ │ 14:32:03  INFO     Cloning repository          ││
│ │ 14:32:15  INFO     Analyzing codebase          ││
│ │ 14:32:22  SUCCESS  Created README.md          ││
│ └───────────────────────────────────────────────────────┘│
│                                                     │
│ [■ Stop]  [⟳ Restart]  [→ View in GitHub]         │
└─────────────────────────────────────────────────────────┘
```

### 3. Real-Time Updates

Watch the logs stream live as the agent:
- Clones the repository
- Analyzes the codebase
- Makes changes
- Commits changes
- Creates a pull request

### 4. Progress Bar Updates

The progress bar fills as the agent works:
- `0%` → Task queued
- `25%` → Cloning repository
- `50%` → Analyzing and making changes
- `75%` → Committing changes
- `100%` → PR created and task complete

## Verify Results

### 1. Check the Task Status

When complete, the task shows:
```
✓ DONE  Add a README.md file...  porter  opencode  ████████ 100%
```

### 2. View the Pull Request

Click **"View in GitHub"** or navigate manually:
1. Go to your repository on GitHub
2. Check **"Pull requests"** tab
3. You should see a new PR with changes

The PR title should reference the issue:
```
Add a README.md file with project description (closes #1)
```

### 3. Check Issue Comments

Go to the issue referenced in the task (e.g., `#1`):
```
✅ Task completed by @porter

PR created: #42

https://github.com/jackgolding/porter/pull/42
```

## Task Actions

### Stop a Running Task

If a task is taking too long or you want to cancel:

1. Expand the task
2. Click **"Stop"** (red button)
3. Task status changes to **FAIL** with message "stopped by user"

### Restart a Failed Task

To retry a failed or stopped task:

1. Expand the task
2. Click **"Restart"** (gray button)
3. Task re-enters queue and starts execution

### Filter Tasks

Use the filter buttons to see specific tasks:
- **All** - All tasks
- **Running** - Currently executing
- **Queued** - Waiting to start
- **Completed** - Successfully finished
- **Failed** - Failed or stopped

## Troubleshooting

### Daemon Not Connecting

**Symptom:** Connection badge shows 🔴 **disconnected**

**Solutions:**
1. Verify daemon is running: Check terminal for "Serving on http://localhost:3000"
2. Check port 3000 is not in use:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   # Mac/Linux
   lsof -i :3000
   ```
3. Check browser console (F12) for WebSocket errors
4. Ensure no firewall blocking localhost connections

### Task Stays Queued

**Symptom:** Task shows ○ **QUE** but never starts

**Solutions:**
1. Check daemon logs for errors
2. Verify agent is installed: `opencode --version`
3. Ensure GITHUB_TOKEN is set and valid
4. Check repository URL is correct

### Agent Fails to Start

**Symptom:** Task shows ❌ **FAIL** with "agent not found" error

**Solutions:**
1. Install the agent (see prerequisites)
2. If using custom path, set environment variable:
   ```bash
    AIDER_PATH=/custom/path/to/aider
   ```
3. Verify binary is executable

### PR Not Created

**Symptom:** Task completes (100%) but no PR appears

**Solutions:**
1. Check agent output in logs for errors
2. Verify agent supports PR creation
3. Check GitHub token has `repo` scope
4. Check repository permissions (must have write access)

### Issue Not Updated

**Symptom:** PR exists but issue has no comment from Porter

**Solutions:**
1. Verify GITHUB_TOKEN is set
2. Check token has `repo` scope
3. Check logs for "Failed to find PR" or "Failed to comment on issue"
4. Ensure PR title includes issue number (e.g., "Fix #42")

### Git Clone Fails

**Symptom:** Logs show "git clone failed"

**Solutions:**
1. Verify GITHUB_TOKEN is valid and not expired
2. Check repository URL is correct
3. Ensure repository exists and is accessible
4. If private, verify token has access

## Success Criteria

The local loop is working correctly when:

✅ Daemon starts without errors on `http://localhost:3000`  
✅ Web dashboard shows 🟢 **connected** status  
✅ Command palette opens with `⌘K`  
✅ Task can be created via CommandBar  
✅ Task appears in dashboard immediately  
✅ Logs stream in real-time  
✅ Progress bar updates from 0% → 100%  
✅ Agent creates a pull request in GitHub  
✅ Issue gets updated with PR link and success message  
✅ Stop button cancels running tasks  
✅ Restart button retries failed tasks  

## Next Steps

After local loop is confirmed working:

1. **GitHub App Integration** - Add webhook for `@porter` comments
2. **OAuth** - User authentication for multi-tenant support
3. **Gist Config** - Persistent configuration storage
4. **More Agents** - Claude Code, Cursor, Windsurf adapters
5. **Priority Queue** - Task scheduling and concurrency control

## Quick Reference Commands

```bash
# Start daemon (dev)
cd desktop && wails dev

# Start web dashboard
cd web && bun run dev

# Verify agent installation
opencode --version
claude --version
# Optional
aider --version

# Check git
git --version

# Test daemon API
curl http://localhost:3000/api/tasks

# Test WebSocket
wscat -c ws://localhost:3000/ws
```

## Additional Resources

- [Main Specification](./MAIN-SPEC.md) - Complete product specification
- [GitHub App Setup](./GITHUB_APP_SETUP.md) - Webhook and OAuth setup guide
- [Agents](./AGENTS.md) - Agent configuration and development
- [Environment Variables](/.env.example) - Configuration options
