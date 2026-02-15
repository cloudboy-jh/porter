# GitHub Auth + App Install Playbook

Last updated: Feb 14, 2026

This document is the source of truth for how Porter must handle GitHub OAuth and GitHub App installation.

## Before (what was broken)

- Users could get stuck in an `install_required` loop even when GitHub showed the app as installed (`Configure`).
- Installation checks treated many failures as `not installed` by default.
- Post-install return handling was weak, so install verification failures looked identical to true non-install states.
- Matching could fail if runtime app identity values were slightly inconsistent (slug vs ID vs install URL source).

## After (what we changed)

- Added tri-state installation resolution in `web/src/lib/server/github.ts`:
  - `installed`
  - `not_installed`
  - `indeterminate` (cannot verify right now)
- Added retry-aware verification (`attempts`, `delayMs`) so immediate post-install consistency lag does not cause false negatives.
- Strengthened app matching using all available signals:
  - `GITHUB_APP_ID`
  - `GITHUB_APP_SLUG`
  - slug parsed from `GITHUB_APP_INSTALL_URL` / `PUBLIC_GITHUB_APP_INSTALL_URL`
- Added explicit `install_check_failed` handling instead of misclassifying as `install_required`.
- Kept a dedicated post-install entrypoint: `web/src/routes/api/auth/github/installed/+server.ts`.
- Added diagnostics endpoint behavior in `web/src/routes/api/github/installations/+server.ts` with `status`, `reason`, and `matcher`.

## Root Cause We Solved

The loop happened because the system previously collapsed two different states into one:

- true non-install (`not installed`)
- temporary verification failure (`indeterminate`)

When verification failed, the code often defaulted to `false` and redirected users back into install-required paths.

## Always-Onboarding Rules (non-negotiable)

1. **OAuth first, app install second**
   - User signs in via `/api/auth/github`.
   - If install is missing, user is guided to install.

2. **Do not enable OAuth during app installation**
   - In GitHub App settings, `Request user authorization (OAuth) during installation` must stay unchecked.

3. **Always set Setup URL**
   - Must point to `/api/auth/github/installed` so Porter can refresh session install state after GitHub install/configuration.

4. **Never map verification errors to `not_installed`**
   - Use tri-state resolver and route indeterminate cases to reconnect/diagnostic flows.

5. **Never depend on slug alone**
   - Match using App ID and slug, with install-URL slug fallback.

6. **Protected routes should not hard-force GitHub install URL**
   - Route users to `/auth?error=install_required` and let auth CTA drive next action.

## Canonical User Flow

1. User opens `/auth`.
2. User clicks `Continue with GitHub` -> `/api/auth/github`.
3. OAuth callback (`/api/auth/github/callback`) sets session.
4. If installed: redirect to `/`.
5. If not installed: redirect to `/auth?error=install_required`.
6. User clicks continue/install CTA -> `/api/auth/github` -> GitHub install URL.
7. After install/config save, GitHub redirects to Setup URL: `/api/auth/github/installed`.
8. Porter re-verifies installation, updates session, redirects to `/settings?installed=1` (or `/`).

## Required GitHub App Settings

- Callback URL: `https://<your-domain>/api/auth/github/callback`
- Setup URL: `https://<your-domain>/api/auth/github/installed`
- Request OAuth during installation: **OFF**

## Required Runtime Env Vars

- `GITHUB_APP_ID` (exact app ID)
- `GITHUB_APP_SLUG` (exact slug)
- `GITHUB_APP_INSTALL_URL` (recommended: `https://github.com/apps/<slug>/installations/new`)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`

## Fast Debug Procedure

When install behavior is suspicious, check this first:

- `GET /api/github/installations`

Expected useful fields:

- `status`: `installed | not_installed | indeterminate`
- `reason`: error context when indeterminate
- `matcher`: resolved app matcher (`appId`, `slugs`)
- `total` and `installations`

Interpretation:

- `installed` + `total >= 1`: app match is working
- `not_installed` + `total = 0`: true non-install state
- `indeterminate`: verification/config issue; do not treat as non-install

## Anti-Patterns to Avoid

- Redirecting to install URL directly from every protected route check.
- Treating caught exceptions in installation checks as `false`/`not installed`.
- Relying on one identity field (slug only) for matching.
- Enabling OAuth during install when app already has an OAuth sign-in flow.
