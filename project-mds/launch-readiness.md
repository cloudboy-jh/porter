# Porter Launch Readiness

Last updated: Feb 11, 2026

This checklist is the final pre-launch guide for Porter production.

---

## 1) Deploy web app to Cloudflare

### A. Prerequisites
- Cloudflare account with Pages + Workers enabled
- GitHub repo connected to Cloudflare Pages
- Production domain configured (optional but recommended)

### B. Build and runtime settings
- Project root: `web`
- Build command: `bun install && bun run build`
- Output directory: `.svelte-kit/cloudflare` (or adapter output path used in your build)
- Node/Bun compatibility: ensure Bun is available in Cloudflare build image
- Wrangler config: `web/wrangler.toml`
  - Deploy command: `bunx wrangler deploy`
  - Local preview: `bunx wrangler dev`

### C. Production URL
- Set `PUBLIC_APP_URL` to your public app URL (e.g. `https://porter.yourdomain.com`)
- This URL must match callback/webhook expectations because worker callback posts to:
  - `${PUBLIC_APP_URL}/api/callbacks/complete`

### D. Post-deploy smoke checks
- Load `/auth` and complete GitHub OAuth
- Confirm session creation and redirect to `/`
- Confirm `/api/tasks` and `/api/tasks/history` return data when authenticated
- Confirm webhook endpoint responds:
  - `POST /api/webhooks/github` (valid signature)

---

## 2) GitHub App final checks

### A. App config
- App installed on target org/user repos
- Webhook URL: `https://<your-domain>/api/webhooks/github`
- Webhook secret is set and matches `WEBHOOK_SECRET`

### B. Required repository permissions
- Contents: Read & Write
- Issues: Read & Write
- Pull requests: Read & Write
- Metadata: Read-only

### C. Webhook events
- `Issue comment` enabled (required)

### D. OAuth config
- Callback URL: `https://<your-domain>/api/auth/github/callback`
- OAuth app client ID/secret configured in production env

### E. Installation token flow check
- Confirm webhook payload includes `installation.id`
- Confirm Porter can mint installation token and:
  - read repo files (including optional `AGENTS.md`)
  - clone/push via `https://x-access-token:<token>@github.com/owner/repo.git`
  - create or find PRs
  - post issue comments/reactions

---

## 3) Production env vars (Porter server)

Set these in Cloudflare production environment for the web app.

### Required
- `SESSION_SECRET`
  - Used to sign user session cookies
  - Generate: `openssl rand -hex 32`
- `WEBHOOK_SECRET`
  - Must match GitHub App webhook secret
  - Generate: `openssl rand -hex 32`
- `GITHUB_CLIENT_ID`
  - From GitHub App OAuth section
- `GITHUB_CLIENT_SECRET`
  - From GitHub App OAuth section
- `GITHUB_APP_ID`
  - From GitHub App settings
- `GITHUB_APP_PRIVATE_KEY`
  - PEM private key from GitHub App (`Generate private key`)
  - Store with literal newlines or escaped `\\n`
- `PUBLIC_APP_URL`
  - Public Porter URL used for callbacks and links
- `PORTER_OAUTH_TOKEN_SECRET`
  - Encrypts persisted user OAuth tokens used to read private gists in webhook context
  - Generate: `openssl rand -hex 32`

### Strongly recommended
- `CALLBACK_SECRET`
  - Explicit secret for callback HMAC; otherwise falls back to `SESSION_SECRET`
- `PORTER_EXECUTION_STORE_PATH`
  - Persistent path for execution context state
- `PORTER_OAUTH_TOKEN_STORE_PATH`
  - Persistent path for encrypted OAuth token store
- `PORTER_WORKER_IMAGE`
  - Worker image tag (e.g. `registry.fly.io/porter-worker:latest`)

### Optional rollout controls
- `PORTER_PRODUCTION_ALLOWLIST`
  - Comma-separated GitHub logins to limit webhook-triggered runs
  - Leave empty for open production usage

---

## 4) User onboarding requirements (what each Porter user needs)

These are not server env vars. Users provide these in Porter settings and their private Gist config.

### Required per user
- Fly API token
  - Where: Fly dashboard -> Account -> Tokens
  - Used by Porter to create/destroy Fly Machines
- Fly app name
  - Where: existing Fly app name (or create one in Fly)
- Model provider key for chosen agent
  - Anthropic key for `opencode` / `claude-code`
  - Amp key for `amp`

### Where to get keys
- Anthropic API key:
  - https://console.anthropic.com/ -> API Keys
- OpenAI API key (if used):
  - https://platform.openai.com/api-keys
- Amp key (if used):
  - Sourcegraph Amp account settings

### GitHub-side requirement per user
- User must sign in via GitHub OAuth in Porter at least once
  - This stores encrypted OAuth token server-side
  - Webhook then uses it to read the user private Gist config

---

## 5) End-to-end launch test (must pass)

1. User signs in at `/auth` and finishes OAuth
2. User config exists in private Gist (Fly token/app + provider key)
3. User comments on an installed repo issue: `@porter opencode`
4. Porter webhook verifies signature and dispatches Fly machine
5. Worker runs agent with timeout, pushes `porter/<task-id>` branch
6. Worker callback arrives at `/api/callbacks/complete`
7. Porter creates PR if missing (or links existing PR)
8. Porter comments success on issue with PR reference
9. Dashboard/feed reflects final task status

If any step fails, capture logs from:
- Cloudflare app logs (webhook + callback)
- Fly machine launch + destroy events
- GitHub webhook delivery logs
