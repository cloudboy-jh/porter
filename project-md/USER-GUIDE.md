# Porter User Guide

Complete guide to using Porter - the AI agent orchestrator for GitHub Issues.

## What is Porter?

Porter lets you delegate GitHub issues to AI coding agents with a simple comment:
```
@porter opencode
```

Porter handles the rest:
- Clones your repository
- Spawns an AI agent (Opencode, Claude Code, Cursor, etc., with Aider optional)
- The agent makes changes, runs tests, creates a PR
- Porter updates the issue with the PR link

**Result:** You review the PR instead of writing code.

---

## Getting Started

### Prerequisites

1. **GitHub Account** - For repositories and issues
2. **Porter Installed** - Desktop daemon + web dashboard
3. **Agent Installed** - At least one AI agent (Opencode or Claude Code recommended)
4. **GitHub Token** - PAT with `repo` scope

### First Time Setup

1. **Install Porter Desktop**
   - Download from releases (Mac: `.dmg`, Windows: `.msi`, Linux: `.AppImage`)
   - Launch the application
   - It runs in the background as a daemon

2. **Configure GitHub Token**
   - Generate a Personal Access Token (see [GitHub Token Guide](./GITHUB_APP_SETUP.md))
   - Add to `.env`: `GITHUB_TOKEN=ghp_your_token_here`
   - Restart Porter Desktop

3. **Verify Installation**
   - Open web dashboard at `http://localhost:5173` (or your hosted URL)
   - Connection status in header should show 🟢 **connected**
   - If 🔴 **disconnected**, ensure Porter Desktop is running

---

## Basic Usage

### 1. Create an Issue

Create a GitHub issue as usual. Be descriptive - the more context, the better the result.

**Good Issue Example:**
```markdown
## Add user authentication to the app

We need a complete authentication system including:

- User registration with email verification
- Login with email/password
- Session management with JWT tokens
- Password reset functionality

### Context
The user model already exists in `src/models/user.ts`.
Frontend login component is ready at `src/components/Login.svelte`.
Use our existing API structure in `src/api/`.

### Expected Output
1. Registration endpoint at `/api/auth/register`
2. Login endpoint at `/api/auth/login`
3. JWT service for token generation/validation
4. Password reset flow with email
5. Unit tests for all auth functions
```

**Bad Issue Example:**
```
Fix login
```

### 2. Assign to Porter

Add a comment on the issue with `@porter` and the agent name:

```
@porter opencode
```

**What happens:**
- GitHub sends a webhook to Porter
- Porter creates a task
- Porter Desktop picks up the task
- The agent starts working

**Task appears in web dashboard immediately:**
```
● RUN  Add user authentication  myrepo  opencode  ███░ 15%
```

### 3. Monitor Progress

Open the Porter web dashboard to watch real-time progress:

**Task List View:**
- See all tasks across repositories
- Filter by status (Running, Queued, Completed, Failed)
- Sort by time, priority, or repository

**Expanded Task View:**
Click a task to see:
- Task details (issue number, repository, agent, start time)
- Live streaming logs from the agent
- Progress bar updating in real-time

**Example Logs:**
```
14:32:01  INFO     Starting task execution
14:32:03  INFO     Cloning repository
14:32:15  INFO     Analyzing codebase structure
14:32:22  SUCCESS  Created auth router at src/auth/router.ts
14:32:35  SUCCESS  Implemented JWT service
14:33:10  SUCCESS  Created login endpoint
14:33:25  SUCCESS  Added unit tests
14:34:05  INFO     Running tests...
14:34:45  SUCCESS  All tests passing
14:35:10  INFO     Creating pull request...
```

### 4. Review the PR

When the agent completes, a PR is created on GitHub:

**PR Title:**
```
Add user authentication to the app (closes #123)
```

**PR Description:**
```markdown
Implements complete authentication system including:

- User registration with email verification
- Login with email/password
- Session management with JWT tokens
- Password reset functionality

### Changes
- `src/auth/router.ts` - Authentication routes
- `src/auth/service.ts` - Business logic
- `src/auth/middleware.ts` - JWT validation
- `src/models/user.ts` - Added auth methods
- Tests in `src/auth/` directory

### Testing
All unit tests passing. Verified:
- Registration flow works
- Login generates valid JWT
- Password reset sends email
- Token validation correct

Closes #123
```

**Review Steps:**
1. Click the PR link in the issue comment
2. Review the code changes
3. Check that tests pass
4. Request changes if needed, or approve and merge

### 5. Merge and Close

Merge the PR when satisfied. The task in Porter dashboard updates to:
```
✓ DONE  Add user authentication  myrepo  opencode  ████████ 100%
```

---

## Advanced Usage

### Multiple Tasks in Parallel

Assign different issues to different agents:

**Issue #45 (Frontend bug):**
```
@porter cursor
```

**Issue #67 (Backend feature):**
```
@porter opencode
```

**Issue #89 (Full-stack refactor):**
```
@porter claude
```

Each task runs independently:
- Different repositories
- Different agents
- Different priorities
- All tracked in the same dashboard

### Priority Control

Urgent tasks can be prioritized:

```
@porter opencode --priority=high
```

Priority levels:
- **high** - Executes before other queued tasks
- **medium** - Normal priority (default)
- **low** - Executes after all higher priority tasks

### Stopping Tasks

If a task is going in the wrong direction:

**Option 1: Stop via web dashboard**
1. Click on the task
2. Click the red **"Stop"** button
3. Task is canceled immediately

**Option 2: Stop via GitHub comment**
```
@porter stop
```

### Retrying Failed Tasks

If a task fails (e.g., test error, compilation error):

**Option 1: Retry via web dashboard**
1. Click on the failed task
2. Click the gray **"Restart"** button
3. Task re-enters the queue and starts again

**Option 2: Retry via GitHub comment**
```
@porter retry
```

### Checking Status

Get the current status of a task:

```
@porter status
```

Porter responds with:
- Current status (queued, running, completed, failed)
- Progress percentage
- Agent being used
- Estimated time remaining

---

## Choosing the Right Agent

Different agents excel at different tasks. Here's a guide:

### Opencode (Default)

**Best for:**
- Full-stack applications
- Multi-language projects
- General purpose tasks
- Cross-language refactoring

**Strengths:**
- Works well across languages
- Good at understanding broader context
- Flexible with different frameworks
- Solid all-rounder

**Example use:**
```
@porter opencode
```

**Task:**
```markdown
Refactor the user authentication system to use OAuth providers.
```

### Claude Code

**Best for:**
- Complex architectural changes
- Multi-file refactoring
- Design pattern implementation
- Documentation generation

**Strengths:**
- Strong reasoning about code structure
- Good at explaining changes
- Excellent for architectural decisions
- Handles complexity well

**Example use:**
```
@porter claude
```

**Task:**
```markdown
Implement a microservices architecture by splitting the monolith.
```

### Cursor

**Best for:**
- TypeScript/JavaScript projects
- Frontend development (React, Vue, Svelte)
- UI component creation
- State management

**Strengths:**
- Deep understanding of modern frontend frameworks
- Excellent at component patterns
- Good with TypeScript types
- Strong UI/UX awareness

**Example use:**
```
@porter cursor
```

**Task:**
```markdown
Create a reusable Button component with:
- Disabled state styling
- Loading spinner
- Tooltip support
- All theme variants
```

### Windsurf

**Best for:**
- AI/ML projects
- Data science workflows
- Experimentation and prototyping

**Strengths:**
- Specialized for AI/ML workflows
- Good with Jupyter notebooks
- Understands data science patterns
- Experiment-friendly

**Example use:**
```
@porter windsurf
```

**Task:**
```markdown
Add a recommendation engine using collaborative filtering.
```

### Aider (Optional)

**Best for:**
- Python projects
- CLI tools and scripts
- Database migrations

**Strengths:**
- Solid Python ergonomics
- Fast iteration cycles

**Example use:**
```
@porter opencode
```

**Task:**
```markdown
Add a REST API endpoint for user registration with input validation.
```

---

## Task Management

### Dashboard Overview

**Active Tasks Page:**
- Shows all in-progress and recent tasks
- Real-time status updates
- Quick access to stop/restart actions

**Task History Page:**
- Review all completed and failed tasks
- See what each agent did
- Reference past solutions for similar issues

### Filtering and Sorting

**Filter by status:**
- All - Shows everything
- Running - Currently executing tasks
- Queued - Waiting to start
- Completed - Successfully finished
- Failed - Failed or stopped tasks

**Sort by:**
- Time - Most recent first
- Priority - High priority first
- Repository - Grouped by repo
- Agent - Grouped by agent

### Task Details

Each task shows:
- **Status Badge** - Current state (RUN, QUE, DONE, FAIL)
- **Repository** - Which repo the task is working on
- **Agent Icon** - Which agent is executing
- **Progress Bar** - Completion percentage
- **Started** - When the task began
- **Expanded Logs** - Full execution log

---

## Best Practices

### Writing Effective Issues

**Be Specific:**
```
Good:
Add JWT authentication to the login endpoint using the existing
User model. Store tokens in localStorage with a 24h expiration.

Bad:
Fix login.
```

**Provide Context:**
```
The authentication system should integrate with:
- Existing user model at `src/models/user.ts`
- Current session store in `src/lib/store.ts`
- Frontend login component at `src/components/Login.svelte`
```

**Define Expected Output:**
```
Expected behavior:
1. User enters email/password and clicks login
2. API validates credentials against database
3. On success, generates JWT with 24h expiration
4. Stores token in localStorage
5. Redirects to dashboard
```

**Include File References:**
```
Focus changes on:
- `src/api/auth.ts` - Add login/register endpoints
- `src/auth/jwt.ts` - Token generation/validation
- `src/components/Login.svelte` - Update to handle JWT
```

### Breaking Down Complex Tasks

For large features, split into smaller issues:

**Issue #1: Database Layer**
```
@porter claude
Task: Create user schema and migration scripts.
```

**Issue #2: API Endpoints**
```
@porter aider
Task: Implement authentication API endpoints.
```

**Issue #3: Frontend Integration**
```
@porter cursor
Task: Update login component to use new API.
```

**Benefits:**
- Faster execution per task
- Easier to review smaller PRs
- Better context for each issue
- Can mix agents (Opencode or Claude for backend, Cursor for frontend)

### Providing Examples

Help agents understand your code style by including examples:

```markdown
Follow our existing patterns:

Example API endpoint (src/api/users.ts):
```typescript
export async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

Create similar pattern for authentication.
```

### Defining Constraints

Set boundaries to prevent over-engineering:

```markdown
Constraints:
- Do not change the database schema
- Use existing `authMiddleware` for protection
- Frontend should use existing `Button` component
- No external dependencies beyond what's already installed
```

---

## Troubleshooting

### Task Not Starting

**Symptom:** `@porter opencode` comment but nothing happens

**Solutions:**
1. Check GitHub App is installed on the repository
2. Verify Porter Desktop is running (green connection status)
3. Check webhook delivery logs in GitHub App settings
4. Ensure GitHub token has `repo` scope

### Agent Fails

**Symptom:** Task shows ❌ **FAIL**

**Solutions:**
1. Review the error message in expanded task logs
2. Check if the issue description was clear enough
3. Try a different agent for the task
4. Retry with more specific instructions

### PR Not Created

**Symptom:** Task completes (100%) but no PR

**Solutions:**
1. Check agent output in logs for PR creation errors
2. Verify GitHub token has write permissions
3. Ensure repository allows external PRs
4. Check if agent supports PR creation

### Changes Are Wrong

**Symptom:** Agent created PR but changes are incorrect

**Solutions:**
1. Close the PR without merging
2. Update the issue with more specific requirements
3. Retry: `@porter opencode` with better context
4. Consider splitting the task into smaller pieces

### Performance Issues

**Symptom:** Tasks taking too long

**Solutions:**
1. Check if repository is very large (agent may need more time)
2. Consider providing smaller, more focused issues
3. Use `--priority=high` for urgent tasks
4. Monitor system resources (CPU, memory)

---

## Tips and Tricks

### Speed Up Execution

**Provide File Paths:**
```
Focus on src/auth/ directory only.
```

**Specify Language/Framework:**
```
This is a TypeScript/React application.
```

**Limit Scope:**
```
Only update the login form, not the entire auth flow.
```

### Improve Quality

**Include Tests:**
```
Add unit tests for all new functions.
```

**Require Code Review:**
```
Follow our existing code style and patterns.
```

**Add Documentation:**
```
Update README.md with new features.
```

### Batch Similar Tasks

If you have multiple similar issues:

```
@porter opencode --priority=high
Issue #45: Fix user registration bug
```

```
@porter opencode --priority=high
Issue #46: Fix password reset bug
```

Both can run while you review other work.

---

## Common Workflows

### Bug Fix Workflow

1. Create issue with reproduction steps
2. Tag with relevant files/modules
3. `@porter cursor` (for frontend bugs) or `@porter opencode` (for backend bugs)
4. Review the fix in the PR
5. Test the fix in your local environment
6. Merge if working, request changes if not

### Feature Addition Workflow

1. Write detailed issue with requirements
2. Include examples and constraints
3. `@porter opencode` for full-stack features
4. Review the implementation
5. Test edge cases
6. Merge and deploy

### Refactoring Workflow

1. Identify the code area to refactor
2. Explain the refactoring goal
3. `@porter claude` for complex architectural changes
4. Review the new structure
5. Ensure tests still pass
6. Merge

### Documentation Workflow

1. Create issue for missing documentation
2. Link to the code being documented
3. `@porter cursor` for UI/docs (good at markdown)
4. Review the documentation
5. Merge

---

## Security Considerations

### What Porter Accesses

**Desktop Daemon:**
- Repository code (cloned to temp directory)
- Issue descriptions and comments
- Agent output and logs

**Web Dashboard:**
- Task metadata (status, progress, agent)
- Agent logs (streamed via WebSocket)
- No source code stored

### What Porter Does NOT Access

- Your passwords or secrets (unless in issue)
- Other repositories on your machine
- Private data outside the specified repository
- Your GitHub account credentials

### Best Practices

- **Never** put secrets in issues or PRs
- Use environment variables for sensitive data
- Review all code changes before merging
- Keep your GitHub token secure (rotate regularly)
- Revoke tokens when no longer needed

---

## Integration with Your Workflow

### CI/CD Integration

Porter creates PRs that integrate with your existing CI/CD:

- PR triggers your automated tests
- Failing tests block merge
- Deployment starts on merge
- No changes to your pipeline

### Code Review Process

Porter doesn't replace code review:

- You still review every PR
- Request changes as needed
- Discuss with team
- Only merge when satisfied

### Team Collaboration

Multiple team members can use Porter:

- Each member installs Porter Desktop
- GitHub App provides webhook for all
- Tasks tracked centrally
- Everyone can monitor progress

---

## FAQ

### Can I use Porter without installing the desktop app?

No, Porter Desktop is required for local execution. The web dashboard alone cannot execute agents.

### Can I run multiple tasks at once?

Yes, you can assign multiple issues to Porter. They will queue and execute based on priority and available capacity.

### What happens if my computer shuts down?

The current task will stop. Restart the daemon and retry the task with `@porter retry`.

### Can I use custom agents?

Yes, Porter supports custom agent adapters. See [Agents Guide](./AGENTS.md) for implementation details.

### Is Porter free?

Yes, local execution is free. Cloud execution (future feature) will have usage-based pricing.

### Can Porter access private repositories?

Yes, if your GitHub token has the `repo` scope, Porter can work with private repositories.

### What if I'm not happy with the PR?

Don't merge it. Close the PR, update the issue with more specific requirements, and retry with `@porter`.

### Can I stop a task mid-execution?

Yes, use the red **"Stop"** button in the web dashboard or comment `@porter stop` on the issue.

### Does Porter keep my code?

No, Porter does not store your code. It clones repositories temporarily, executes the agent, and cleans up. Only tasks and logs are stored.

---

## Support and Resources

- [Main Specification](./MAIN-SPEC.md) - Technical details
- [GitHub App Setup](./GITHUB_APP_SETUP.md) - Webhook configuration
- [Local Testing Guide](./E2E-LOCAL-TESTING.md) - Manual task creation
- [GitHub App Workflow](./E2E-GITHUB-APP.md) - Production integration
- [Agents](./AGENTS.md) - Agent configuration

---

## Quick Reference

| Action | Command | Location |
|---------|----------|-----------|
| Create task | `@porter agent` | GitHub issue comment |
| High priority | `@porter agent --priority=high` | GitHub issue comment |
| Stop task | `@porter stop` | GitHub issue comment |
| Retry task | `@porter retry` | GitHub issue comment |
| Check status | `@porter status` | GitHub issue comment |
| Stop task | Red button | Web dashboard |
| Retry task | Gray button | Web dashboard |

---

**Happy Coding!** 🚀

Porter helps you ship features faster by delegating implementation to AI agents while you focus on review and direction.
