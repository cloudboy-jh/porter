# GitHub App Setup Guide

This guide walks you through setting up a GitHub App for Porter. The GitHub App is required for:
- Receiving webhook events when issues are commented with `@porter`
- OAuth authentication
- Repository access (clone, read, PR creation)

## Prerequisites

- A GitHub account
- Administrator access to a GitHub organization or personal account

## Step 1: Create the GitHub App

1. Navigate to [GitHub Developer Settings](https://github.com/settings/apps)
2. Click **"New GitHub App"**
3. Fill in the basic information:
   - **GitHub App name**: `Porter` (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (development) or your production URL
   - **Application description**: ``
4. Click **"Create GitHub App"**

## Step 2: Configure Permissions

In the GitHub App settings, scroll to **"Permissions"** and set the following:

### Repository Permissions
| Permission | Access Level |
|-----------|--------------|
| Contents | Read and write |
| Issues | Read and write |
| Pull requests | Read and write |

### Organization Permissions
| Permission | Access Level |
|-----------|--------------|
| Members | Read-only |

## Step 3: Configure Webhooks

Scroll to **"Webhooks"** and configure:

- **Active**: Checked
- **Webhook URL**: `https://your-domain.com/api/webhooks/github`
  - For local development: Use ngrok or similar tunneling service
- **Content type**: `application/json`
- **Secret**: Generate a secure secret and save it for later

### Webhook Events
Check the following events:
- `Issue comment`
- `Issues` (optional, for issue closing events)
- `Pull request` (optional, for PR merge events)

## Step 4: Configure OAuth App (Optional)

If you want OAuth authentication for users to sign in:

1. Scroll to **"OAuth App"** section
2. Click **"Generate a new client secret"**
3. Note down:
   - **Client ID**
   - **Client Secret**
4. Set **Callback URL**: `http://localhost:5173/api/auth/github/callback` (development)

## Step 5: Install the App

1. On the left sidebar, click **"Install App"**
2. Select the target:
   - **All repositories** (recommended for testing)
   - **Only select repositories** (for production)
3. Click **"Install"**

## Step 6: Configure Porter

Copy your `.env.example` to `.env` and add the following:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/api/auth/github/callback

# Session signing secret
SESSION_SECRET=replace-with-a-secure-random-string

# Webhook Secret (for verifying webhook signatures)
WEBHOOK_SECRET=your_webhook_secret

# GitHub App install link for onboarding
PUBLIC_GITHUB_APP_INSTALL_URL=https://github.com/apps/porter/installations/new

# GitHub Token (for desktop daemon)
GITHUB_TOKEN=ghp_your_personal_access_token
```

### Generate Personal Access Token

The desktop daemon needs a Personal Access Token (PAT):

1. Go to [GitHub Token Settings](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Set scopes:
   - `repo` (full control of private repositories)
   - `gist` (for config storage)
4. Generate and copy the token
5. Add to `.env` as `GITHUB_TOKEN`

## Step 7: Webhook Verification (Production)

For production, verify webhooks to prevent spoofing:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Local Development with ngrok

To test webhooks locally:

1. Install [ngrok](https://ngrok.com/)
2. Start ngrok:
   ```bash
   ngrok http 5173
   ```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update webhook URL in GitHub App settings to:
   - `https://abc123.ngrok.io/api/webhooks/github`

## Testing the Setup

1. Comment `@porter opencode` on an issue in an installed repository
2. Check that Porter receives the webhook:
   - Web dashboard should show a new queued task
   - Desktop daemon should pick up the task
   - Agent should start executing
3. When agent creates a PR:
   - Check the issue for a comment from Porter
   - Verify the PR is linked

## Troubleshooting

### Webhooks not firing
- Verify the webhook URL is accessible
- Check webhook delivery logs in GitHub App settings
- Ensure the secret matches (if using signature verification)

### Token authentication failed
- Verify `GITHUB_TOKEN` has `repo` scope
- Check token hasn't expired
- Ensure token is set in environment variables

### Agent not starting
- Check agent binary is installed and in PATH
- Verify `AIDER_PATH` if using Aider with a custom path
- Check desktop daemon is running: `wails dev`

### PR not detected
- Agent must include issue number in PR title (e.g., "Fix issue #42")
- Wait a few seconds for PR to be indexed by GitHub API
- Check logs for "Failed to find PR" errors

## Next Steps

After setup:
1. Start the desktop daemon: `cd desktop && wails dev`
2. Start the web dashboard: `cd web && bun run dev`
3. Test by commenting `@porter <agent>` on a GitHub issue

## Security Best Practices

1. **Rotate secrets regularly**
2. **Use environment variables** (never commit `.env`)
3. **Limit repository access** in production
4. **Enable IP allowlisting** for webhook endpoints
5. **Monitor webhook delivery** for suspicious activity
