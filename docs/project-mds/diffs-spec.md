# Diffs Implementation — Porter Review Flow

**Date:** February 8, 2026
**Status:** Ready for implementation
**Dependency:** `@pierre/diffs` v1.0.10 + `@pierre/precision-diffs` v0.6.1

---

## Why This, Why Now

Porter's workflow ends at PR creation. The user gets a comment on their GitHub issue saying "✓ PR #123 created" and then bounces to GitHub to review. That context switch breaks the flow. The review feed should let you see what the agent changed without leaving Porter.

`@pierre/diffs` is a rendering library — it takes diff data and draws it beautifully with Shiki syntax highlighting, split/stacked views, and inline change highlighting. It's the visual layer. `@pierre/precision-diffs` is the diff engine — it computes the actual differences between two strings. Together they give Porter a GitHub-quality (better, actually) diff viewer without building one from scratch.

Porter is a SvelteKit app. Pierre's packages are TypeScript/browser-native using Shadow DOM and CSS Grid. They drop right in.

---

## Architecture Overview

```
GitHub API                    Porter Server                  Porter Client
───────────                   ─────────────                  ─────────────

GET /pulls/:number       →    +page.server.ts             →  ReviewDetail.svelte
  ├─ base.sha                   ├─ fetch PR metadata            ├─ file list sidebar
  ├─ head.sha                   ├─ fetch file list              ├─ DiffViewer.svelte
  └─ changed_files              ├─ fetch raw file contents      │   ├─ @pierre/diffs (render)
                                │   (base & head per file)      │   └─ @pierre/precision-diffs
GET /pulls/:number/files →      └─ return to client             │       (compute)
  ├─ filename                                                   └─ GitDiffBadge.svelte
  ├─ status (added/modified/removed)                                (summary stats)
  ├─ additions
  ├─ deletions
  └─ patch (unified diff string)
```

### Key Decision: Server-Fetched File Contents, Client-Side Diffing

We fetch the raw file contents (before/after) on the server via GitHub's raw content URLs, then send both strings to the client. `@pierre/precision-diffs` computes the diff client-side and `@pierre/diffs` renders it. This gives us:

- Full file context (not just the patch hunks)
- Character/word-level inline highlighting (Pierre's strength)
- Split and stacked view options
- No iframe embedding or external service dependency

Alternative considered: parsing the `patch` field from the GitHub files endpoint. Rejected because the patch is truncated for large files and doesn't support Pierre's arbitrary file diffing API which needs the full before/after content.

---

## Package Installation

```bash
bun add @pierre/diffs @pierre/precision-diffs
```

Both are pure ESM, TypeScript-first, Apache-2.0 licensed.

---

## New Routes

```
src/routes/review/
  +page.svelte              # Review feed — filtered task feed
  +page.server.ts           # Load tasks with status=success + prUrl
  [taskId]/
    +page.svelte            # Review detail — diffs viewer
    +page.server.ts         # Load PR metadata + file contents from GitHub
```

---

## Data Flow

### 1. Review Feed (`/review`)

The review feed reuses the existing `TaskFeed` component with a filter. Only tasks where `status === "success"` and `prUrl` is present appear here.

**`/review/+page.server.ts`**

```typescript
import type { PageServerLoad } from './$types';
import { getTasks } from '$lib/server/tasks';

export const load: PageServerLoad = async ({ locals }) => {
  const allTasks = await getTasks(locals.session);

  const reviewable = allTasks.filter(
    (t) => t.status === 'success' && t.prUrl
  );

  return { tasks: reviewable };
};
```

**`/review/+page.svelte`**

```svelte
<script lang="ts">
  import TaskFeed from '$lib/components/TaskFeed.svelte';
  import { goto } from '$app/navigation';

  export let data;

  const handleTaskClick = (taskId: string) => {
    goto(`/review/${taskId}`);
  };
</script>

<TaskFeed
  title="Review"
  tasks={data.tasks}
  onTaskClick={handleTaskClick}
/>
```

Each card in the review feed shows `GitDiffBadge` with `+additions` / `-deletions` counts. These come from git stats stored on the task when the callback fires (see Data Enrichment section).

---

### 2. Review Detail (`/review/[taskId]`)

This is the core new page. It loads the PR data from GitHub and fetches file contents for diffing.

**`/review/[taskId]/+page.server.ts`**

```typescript
import type { PageServerLoad } from './$types';
import { getTask } from '$lib/server/tasks';
import { getGitHubToken } from '$lib/server/github';
import { error } from '@sveltejs/kit';

interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  previous_filename?: string;
}

interface FileWithContent {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  before: string | null; // null for added files
  after: string | null;  // null for removed files
  language: string;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const task = await getTask(params.taskId);
  if (!task) throw error(404, 'Task not found');
  if (!task.prUrl) throw error(400, 'No PR associated with this task');

  const token = await getGitHubToken(locals.session);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Parse PR URL → owner/repo/number
  const prMatch = task.prUrl.match(
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!prMatch) throw error(400, 'Invalid PR URL');
  const [, owner, repo, prNumber] = prMatch;

  // 1. Fetch PR metadata (base/head SHAs)
  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers }
  );
  if (!prRes.ok) throw error(prRes.status, 'Failed to fetch PR');
  const pr = await prRes.json();

  const baseSha = pr.base.sha;
  const headSha = pr.head.sha;

  // 2. Fetch changed files list
  const filesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers }
  );
  if (!filesRes.ok) throw error(filesRes.status, 'Failed to fetch PR files');
  const files: PRFile[] = await filesRes.json();

  // 3. Fetch raw content for each file (before + after)
  const filesWithContent: FileWithContent[] = await Promise.all(
    files.map(async (file) => {
      const lang = inferLanguage(file.filename);

      let before: string | null = null;
      let after: string | null = null;

      // Fetch "before" (base version) — skip for added files
      if (file.status !== 'added') {
        const sourceFile = file.previous_filename ?? file.filename;
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${baseSha}/${sourceFile}`,
            { headers }
          );
          if (res.ok) before = await res.text();
        } catch {
          // File may not exist in base (edge case)
        }
      }

      // Fetch "after" (head version) — skip for removed files
      if (file.status !== 'removed') {
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${headSha}/${file.filename}`,
            { headers }
          );
          if (res.ok) after = await res.text();
        } catch {
          // File may not exist in head (edge case)
        }
      }

      return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        before,
        after,
        language: lang,
      };
    })
  );

  // 4. Compute aggregate stats
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return {
    task,
    pr: {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      htmlUrl: pr.html_url,
      baseSha,
      headSha,
      branch: pr.head.ref,
    },
    files: filesWithContent,
    stats: {
      additions: totalAdditions,
      deletions: totalDeletions,
      fileCount: files.length,
    },
  };
};

function inferLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    svelte: 'svelte',
    py: 'python',
    go: 'go',
    rs: 'rust',
    md: 'markdown',
    json: 'json',
    css: 'css',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    toml: 'toml',
    dockerfile: 'dockerfile',
  };
  return map[ext] ?? 'text';
}
```

---

## Components

### `DiffViewer.svelte`

The main component. Wraps `@pierre/diffs` for Svelte. Each file gets its own viewer instance.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { renderDiff } from '@pierre/diffs';
  import { diff as computeDiff } from '@pierre/precision-diffs';

  export let before: string | null;
  export let after: string | null;
  export let filename: string;
  export let language: string;
  export let layout: 'split' | 'stacked' = 'split';

  let container: HTMLDivElement;

  onMount(async () => {
    // Compute the diff between before and after
    const diffResult = computeDiff(before ?? '', after ?? '');

    // Render into the container using Pierre's Shadow DOM renderer
    await renderDiff(container, {
      diff: diffResult,
      filename,
      language,
      layout,
      // Style options
      changeStyle: 'bars',        // 'bars' | 'classic' | 'none'
      inlineChanges: 'word',      // 'word' | 'char' | false
      backgrounds: true,
      lineNumbers: true,
      wrapping: false,
      enableLineSelection: true,
    });
  });
</script>

<div
  bind:this={container}
  class="rounded-lg border border-border/60 overflow-hidden"
/>
```

**Important:** `@pierre/diffs` renders into Shadow DOM — it manages its own styling internally. The container just needs a mount point. The Shiki theme will be configured globally (see Theming section).

### `GitDiffBadge.svelte`

Small badge component showing `+N / -N` for additions/deletions. Used in both the review feed cards and the detail page header.

```svelte
<script lang="ts">
  export let additions: number;
  export let deletions: number;
</script>

<div class="flex items-center gap-2 text-xs font-mono">
  {#if additions > 0}
    <span class="text-green-400">+{additions}</span>
  {/if}
  {#if deletions > 0}
    <span class="text-red-400">-{deletions}</span>
  {/if}
</div>
```

### `FileList.svelte`

Sidebar or top-bar listing all changed files with their individual stats and status indicators.

```svelte
<script lang="ts">
  import GitDiffBadge from './GitDiffBadge.svelte';

  export let files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  export let activeFile: string;
  export let onSelect: (filename: string) => void;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'added': return 'A';
      case 'modified': return 'M';
      case 'removed': return 'D';
      case 'renamed': return 'R';
      default: return '?';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-400';
      case 'modified': return 'text-yellow-400';
      case 'removed': return 'text-red-400';
      case 'renamed': return 'text-blue-400';
      default: return 'text-muted-foreground';
    }
  };
</script>

<div class="space-y-1">
  {#each files as file}
    <button
      class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm
             hover:bg-muted/50 transition-colors
             {file.filename === activeFile ? 'bg-muted/70' : ''}"
      on:click={() => onSelect(file.filename)}
    >
      <span class="font-mono text-xs {statusColor(file.status)}">
        {statusIcon(file.status)}
      </span>
      <span class="truncate flex-1 text-left">{file.filename}</span>
      <GitDiffBadge additions={file.additions} deletions={file.deletions} />
    </button>
  {/each}
</div>
```

---

## Review Detail Page Layout

**`/review/[taskId]/+page.svelte`**

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Review Feed                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Task Header                                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Issue #42: Fix auth middleware                     │  │
│  │ cloudboy-jh/porter • opencode • PR #57            │  │
│  │ porter/fix-auth-middleware  +124 -38  3 files      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  PR Description (collapsible)                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ This PR fixes the auth middleware to properly...   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  File List                                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ M  src/lib/server/auth.ts          +82 -24        │  │
│  │ M  src/routes/api/webhooks/+server.ts  +31 -12    │  │
│  │ A  src/lib/server/middleware.ts     +11 -2         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Diff Viewer (per file, scrollable)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ src/lib/server/auth.ts        split | stacked     │  │
│  │ ┌──────────────────┬──────────────────┐           │  │
│  │ │ before           │ after            │           │  │
│  │ │ (base SHA)       │ (head SHA)       │           │  │
│  │ │                  │                  │           │  │
│  │ │  @pierre/diffs   │  @pierre/diffs   │           │  │
│  │ │  rendered view   │  rendered view   │           │  │
│  │ │                  │                  │           │  │
│  │ └──────────────────┴──────────────────┘           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Actions                                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [View PR on GitHub]   [View Issue]                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The layout is a single scrollable column using the same `max-w-[680px] mx-auto` constraint as the task feed. Each file's diff viewer is rendered in sequence. For PRs with many files, the file list at top acts as an anchor nav — clicking a file scrolls to that diff.

---

## Data Enrichment: Git Stats on Task Callback

When the Fly Machine calls back after task completion, Porter should fetch the PR's file stats and store them on the task. This lets the review feed show `GitDiffBadge` without an extra API call per card.

**In the callback handler (`/api/callbacks/task-complete/+server.ts`):**

```typescript
// After receiving callback with prUrl...
const prMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
if (prMatch) {
  const [, owner, repo, prNumber] = prMatch;
  const filesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );

  if (filesRes.ok) {
    const files = await filesRes.json();
    const git = {
      additions: files.reduce((s: number, f: any) => s + f.additions, 0),
      deletions: files.reduce((s: number, f: any) => s + f.deletions, 0),
      fileCount: files.length,
    };

    // Persist on task
    await updateTask(taskId, { git });
  }
}
```

The `Task` type gets a new optional field:

```typescript
interface Task {
  // ... existing fields
  git?: {
    additions: number;
    deletions: number;
    fileCount: number;
  };
}
```

---

## Theming

Pierre Diffs adapts to any Shiki theme. Porter should configure a theme that matches its existing dark UI.

```typescript
// src/lib/config/diffs.ts
import type { DiffsConfig } from '@pierre/diffs';

export const diffsConfig: DiffsConfig = {
  theme: {
    light: 'github-light',
    dark: 'github-dark',     // or 'pierre-dark' for the Pierre theme
  },
  defaults: {
    layout: 'split',
    changeStyle: 'bars',
    inlineChanges: 'word',
    backgrounds: true,
    lineNumbers: true,
    wrapping: false,
  },
};
```

If Porter adopts the Pierre theme pack (`@pierre/theme`), the diffs will match perfectly. Otherwise `github-dark` is a safe default that works with Porter's existing color scheme.

---

## Edge Cases & Limits

### Large PRs (10+ files)
Render all files in sequence. The file list at the top provides jump-to navigation. No pagination — let the browser handle scroll. Agent-generated PRs are typically focused (3-8 files).

### Very Large Files
GitHub's raw content API has no hard limit, but `@pierre/diffs` handles large files well due to Shadow DOM virtualization. For files >5000 lines, consider showing only the changed hunks with surrounding context (a Pierre config option).

### Binary Files
GitHub's files endpoint returns `patch: null` for binary files. The review detail should show a "Binary file changed" placeholder instead of attempting to render a diff.

### Added / Removed Files
For added files, `before` is null — show the entire file as additions. For removed files, `after` is null — show the entire file as deletions. Pierre handles this natively.

### GitHub API Rate Limits
Fetching raw content for N files means N+2 API calls per review detail load (1 PR metadata + 1 files list + N raw content fetches). For a 10-file PR, that's 12 calls. GitHub's authenticated rate limit is 5,000/hour — well within bounds. Consider caching raw content responses for the session.

### Diff Too Large (GitHub 406)
GitHub returns a 406 if the unified diff exceeds 3,000 lines. Since we fetch raw file contents instead of relying on the `patch` field, this doesn't affect us. Pierre computes the diff client-side from full file contents.

---

## Navigation

Add "Review" to the main nav alongside the existing task feed.

```
Dashboard (/)  →  Tasks  →  Review  →  Settings
```

The review feed gets its own nav item because it represents a distinct workflow: not "what's running" but "what needs my attention."

---

## Implementation Order

### Phase 1: Foundation (do first)
1. `bun add @pierre/diffs @pierre/precision-diffs`
2. Create `DiffViewer.svelte` — get a single diff rendering in isolation
3. Create `GitDiffBadge.svelte`
4. Create `FileList.svelte`

### Phase 2: Routes
5. Create `/review/+page.svelte` + server — filtered task feed
6. Create `/review/[taskId]/+page.svelte` + server — full detail page
7. Wire up GitHub API calls in the server load function
8. Add "Review" to main nav

### Phase 3: Data Enrichment
9. Update callback handler to fetch and store git stats
10. Update `Task` type with `git` field
11. Wire `GitDiffBadge` into review feed cards

### Phase 4: Polish
12. Add layout toggle (split/stacked) to diff viewer header
13. Add file-list anchor navigation (click file → scroll to diff)
14. Handle binary files gracefully
15. Add loading states for file content fetches
16. Test with real Porter-generated PRs

---

## Success Criteria

- Review feed shows only tasks with PRs, filtered from main task feed
- Review feed cards show `+N / -N` badges from stored git stats
- Clicking a task opens detail page with full diff viewer
- Diffs render with syntax highlighting via Shiki
- Split and stacked view toggle works
- Inline word-level change highlighting is visible
- File list shows all changed files with status indicators
- "View PR on GitHub" links out correctly
- Page loads in <3s for a typical 5-file PR
- Works with the existing Porter dark theme

---

## Files to Create/Modify

### New Files
```
src/routes/review/+page.svelte
src/routes/review/+page.server.ts
src/routes/review/[taskId]/+page.svelte
src/routes/review/[taskId]/+page.server.ts
src/lib/components/DiffViewer.svelte
src/lib/components/GitDiffBadge.svelte
src/lib/components/FileList.svelte
src/lib/config/diffs.ts
```

### Modified Files
```
src/lib/types.ts                              # Add git field to Task type
src/routes/api/callbacks/task-complete/+server.ts  # Enrich with git stats
src/routes/+layout.svelte                     # Add Review nav item
package.json                                  # @pierre/diffs, @pierre/precision-diffs
```
