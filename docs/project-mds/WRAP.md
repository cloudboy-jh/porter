# WRAP — Porter's Prompt Enrichment Pipeline

**Version:** 1.0.0  
**Status:** Specification  
**Last Updated:** February 10, 2026

---

## Overview

WRAP is Porter's prompt enrichment pipeline. It runs between webhook receipt and agent dispatch, transforming a raw GitHub issue into a structured, context-rich prompt that any agent can execute against.

Every agent — regardless of which one — receives a WRAP-formatted prompt. This is Porter's core value as a dispatcher: the agent doesn't need to understand GitHub issues, repo structure, or project conventions. Porter handles that translation.

```
GitHub Issue → [WRAP] → Enriched Prompt → Fly Machine → Agent
```

---

## The Pipeline

WRAP is a four-stage pipeline: **Write → Refine → Assess → Pass**.

### W — Write

Take the raw issue and normalize it into a clean task definition.

**Input:** GitHub webhook payload (issue title, body, labels, assignee, repo metadata)

**Actions:**
- Extract issue title and body
- Strip GitHub markdown artifacts that don't add context (badges, CI status lines, etc.)
- Preserve code blocks, file references, and technical requirements
- Capture issue number for branch naming and PR linking

**Output:** Clean task description with issue metadata

### R — Refine

Enrich the task with repository context the agent will need to do its work.

**Input:** Clean task description + repo access

**Actions:**
- Read `AGENTS.md` from the repo root if it exists (project-specific conventions, prohibited patterns, style guides)
- Pull the file tree / directory structure (depth-limited to keep prompt size reasonable)
- Identify relevant file paths mentioned in the issue body
- Include any repo-level configuration that affects how work should be done

**Output:** Task description + repo context bundle

**On AGENTS.md:** This is the emerging standard for telling AI agents how to work in a specific repo. Porter reads it and injects it into the prompt so agents that don't natively support AGENTS.md still get the benefit. If the file doesn't exist, Porter skips this step — no error, no fallback.

### A — Assess

Best-effort evaluation of whether the issue is agent-ready. Porter always dispatches regardless of the assessment score — the philosophy is that even a 50% clear issue is worth attempting. The agent can ask questions via the two-way flow if it gets stuck.

**Input:** Enriched task bundle

**Actions:**
- Check if the issue has enough specificity to act on (has file references? has acceptance criteria? has reproduction steps?)
- Flag ambiguities but don't block dispatch
- Optionally score readiness (internal metric, not exposed to user yet)

**Output:** Same enriched bundle, possibly with internal annotations

**Design decision:** Porter does not push back on vague issues. The agent is smart enough to make progress or ask for clarification. Blocking dispatch on quality thresholds would add friction to the core flow.

### P — Pass

Construct the final prompt and hand it to the Fly Machine as environment variables.

**Input:** Enriched, assessed task bundle

**Actions:**
- Build the structured prompt string (see Prompt Template below)
- Set environment variables for the Fly Machine:
  - `PROMPT` — the WRAP output
  - `REPO_URL` — clone target
  - `TASK_ID` — Porter's internal task identifier
  - `AGENT` — which agent to invoke (opencode, claude, amp)
  - `CALLBACK_URL` — where to POST completion status
  - `BRANCH` — branch name for the work (e.g., `porter/{task-id}`)
- Dispatch the Fly Machine via Fly API

**Output:** Running Fly Machine with agent executing against the enriched prompt

---

## Prompt Template

The final prompt passed to the agent follows this structure:

```
## Issue
{issue title}

{issue body — cleaned, preserving code blocks and technical detail}

## Repository Context
{contents of AGENTS.md if present}

{file tree / directory structure, depth-limited}

{any relevant file paths or context discovered during Refine}

## Instructions
Complete this issue by making the necessary changes.
Open a PR when done.
Branch: porter/{task-id}
```

The template is intentionally minimal. Agents have their own system prompts and capabilities — Porter provides context, not instruction on how to code.

---

## Fly Machine Entrypoint

The Fly Machine receives WRAP output via environment variables and executes:

```bash
#!/bin/bash
set -e

cd /workspace
git clone "$REPO_URL" .
git checkout -b "$BRANCH"

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

# Callback to Porter on completion
curl -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d "{\"task_id\": \"$TASK_ID\", \"status\": \"complete\"}"
```

Each agent runs headless. The entrypoint is agent-agnostic — the `$AGENT` variable determines which CLI gets invoked.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PROMPT` | WRAP-enriched prompt string | (see template above) |
| `REPO_URL` | Git clone URL | `https://github.com/user/repo.git` |
| `TASK_ID` | Porter task identifier | `task_abc123` |
| `AGENT` | Agent to invoke | `opencode`, `claude`, `amp` |
| `CALLBACK_URL` | Completion webhook | `https://porter.app/api/callbacks/complete` |
| `BRANCH` | Git branch for work | `porter/task_abc123` |

---

## Design Principles

**Porter is the WRAP layer.** No agent implements WRAP natively — Porter enriches every prompt before dispatch so agents get consistent, high-quality context regardless of how the issue was written.

**Best-effort, never blocking.** WRAP enriches what it can and ships. A missing AGENTS.md, a vague issue body, a repo with no clear structure — none of these stop dispatch. The agent handles ambiguity.

**Minimal instruction, maximum context.** The prompt template gives agents the "what" (issue + repo context) not the "how" (coding instructions). Agents are good at coding. They need context, not tutoring.

**Agents are interchangeable.** The same WRAP output works for any agent. The only thing that changes is the CLI command in the entrypoint. This is what makes Porter agent-agnostic.

---

## Future Considerations

- **Smarter Refine step:** Use lightweight code search to find files most relevant to the issue, not just the full tree
- **Prompt size management:** As repos grow, the file tree and AGENTS.md can bloat the prompt. May need token-aware truncation
- **Two-way WRAP:** When an agent asks a clarifying question, Porter could re-run WRAP with the question + user's answer to produce an updated prompt
- **Assessment metrics:** Track which issues succeed vs. fail by readiness score to improve the Assess step over time
- **Custom prompt templates:** Let users override the default template per repo or per agent
