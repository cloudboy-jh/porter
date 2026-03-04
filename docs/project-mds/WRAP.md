# WRAP - Prompt Enrichment Pipeline

WRAP runs before task execution and produces the final model prompt.

## Stages

1. **Write**: normalize issue title/body into a clean task statement.
2. **Refine**: add repository context (`AGENTS.md`, relevant file context).
3. **Assess**: detect ambiguity (non-blocking).
4. **Pass**: send final payload to task Durable Object.

## Pass Contract (Worker -> DO)

- `taskId`
- `repoOwner`
- `repoName`
- `issueNumber` (optional)
- `model`
- `priority`
- `prompt` (WRAP output)

DO then owns execution, status, retries, commit, and PR flow.
