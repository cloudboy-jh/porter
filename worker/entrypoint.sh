#!/usr/bin/env bash

set -Eeuo pipefail

log() {
  printf '[porter-worker] %s\n' "$*"
}

require_env() {
  local key="$1"
  if [ -z "${!key:-}" ]; then
    log "Missing required env var: ${key}"
    exit 2
  fi
}

json_escape() {
  node -e "process.stdout.write(JSON.stringify(process.argv[1] ?? ''))" "$1"
}

post_callback() {
  local status="$1"
  local summary="$2"
  local error_message="$3"
  local branch_name="$4"
  local commit_hash="$5"

  local attempt
  local max_attempts=5
  local sleep_seconds=2
  local last_http_code='000'

  for attempt in $(seq 1 "${max_attempts}"); do
    local payload
    payload="{"
    payload+="\"task_id\":\"${TASK_ID}\","
    payload+="\"execution_id\":\"${TASK_ID}\","
    payload+="\"status\":\"${status}\","
    payload+="\"branch_name\":$(json_escape "${branch_name}"),"
    payload+="\"base_branch\":$(json_escape "${BASE_BRANCH}"),"
    payload+="\"commit_hash\":$(json_escape "${commit_hash}"),"
    payload+="\"summary\":$(json_escape "${summary}"),"
    payload+="\"error\":$(json_escape "${error_message}"),"
    payload+="\"callback_attempt\":${attempt},"
    payload+="\"callback_max_attempts\":${max_attempts},"
    payload+="\"callback_last_http_code\":$(json_escape "${last_http_code}"),"
    payload+="\"callback_token\":\"${CALLBACK_TOKEN}\""
    payload+="}"

    local http_code
    http_code=$(curl --silent --show-error --output /tmp/callback-response.txt --write-out '%{http_code}' \
      -X POST "${CALLBACK_URL}" \
      -H 'Content-Type: application/json' \
      -H "x-porter-callback-token: ${CALLBACK_TOKEN}" \
      --data "${payload}" || true)

    if [ -z "${http_code}" ]; then
      http_code='000'
    fi
    last_http_code="${http_code}"

    if [ "${http_code}" -ge 200 ] && [ "${http_code}" -lt 300 ]; then
      if [ "${attempt}" -gt 1 ]; then
        log "Callback succeeded on attempt ${attempt}/${max_attempts} with status ${http_code}."
      else
        log "Callback succeeded with status ${http_code}."
      fi
      return 0
    fi

    log "Callback attempt ${attempt}/${max_attempts} failed (HTTP ${http_code})."
    if [ "${attempt}" -lt "${max_attempts}" ]; then
      sleep "${sleep_seconds}"
      sleep_seconds=$((sleep_seconds * 2))
    fi
  done

  log 'Callback failed after all retries.'
  return 1
}

fail_task() {
  local message="$1"
  local branch_name="${2:-${BRANCH_NAME}}"
  local commit_hash="${3:-}"
  log "Task failed: ${message}"
  post_callback 'failed' '' "${message}" "${branch_name}" "${commit_hash}" || true
  exit 1
}

run_agent() {
  local normalized_agent
  normalized_agent="$(printf '%s' "${AGENT}" | tr '[:upper:]' '[:lower:]')"

  case "${normalized_agent}" in
    opencode)
      command -v opencode >/dev/null 2>&1 || return 127
      opencode run --model anthropic/claude-sonnet-4 "${PROMPT}"
      ;;
    claude|claude-code)
      command -v claude >/dev/null 2>&1 || return 127
      claude -p "${PROMPT}" --dangerously-skip-permissions
      ;;
    amp)
      command -v amp >/dev/null 2>&1 || return 127
      amp -x "${PROMPT}" --dangerously-allow-all
      ;;
    mock)
      printf '%s\n' "[mock-agent] ${PROMPT}" > /tmp/mock-agent-output.txt
      printf 'porter smoke test %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > porter-smoke.txt
      git add porter-smoke.txt
      git commit -m "chore: porter worker local smoke test" >/tmp/mock-agent-commit.log 2>&1 || true
      ;;
    *)
      log "Unsupported agent: ${AGENT}"
      return 64
      ;;
  esac
}

require_env TASK_ID
require_env REPO_FULL_NAME
require_env AGENT
require_env PROMPT
require_env CALLBACK_URL
require_env CALLBACK_TOKEN

BRANCH_NAME="${BRANCH_NAME:-porter/${TASK_ID}}"
BASE_BRANCH="${BASE_BRANCH:-main}"
REPO_DIR="/workspace/repo"
if [ -n "${REPO_CLONE_URL:-}" ]; then
  REPO_URL="${REPO_CLONE_URL}"
else
  require_env GITHUB_TOKEN
  REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_FULL_NAME}.git"
fi
AGENT_LOG_PATH='/tmp/agent.log'

log "Starting task ${TASK_ID} on ${REPO_FULL_NAME} with ${AGENT}."

if git ls-remote --exit-code --heads "${REPO_URL}" "${BASE_BRANCH}" >/dev/null 2>&1; then
  true
elif git ls-remote --exit-code --heads "${REPO_URL}" master >/dev/null 2>&1; then
  BASE_BRANCH='master'
else
  fail_task "Could not find base branch (${BASE_BRANCH} or master)."
fi

rm -rf "${REPO_DIR}"
mkdir -p "${REPO_DIR}"

if ! git clone --depth 1 --branch "${BASE_BRANCH}" "${REPO_URL}" "${REPO_DIR}" >/tmp/git-clone.log 2>&1; then
  fail_task 'Failed to clone repository.'
fi

cd "${REPO_DIR}"

git config user.name 'porter[bot]'
git config user.email 'porter-bot@users.noreply.github.com'

if ! git checkout -B "${BRANCH_NAME}" >/tmp/git-checkout.log 2>&1; then
  fail_task "Failed to create branch ${BRANCH_NAME}."
fi

if ! run_agent >"${AGENT_LOG_PATH}" 2>&1; then
  failure_tail=$(tail -n 80 "${AGENT_LOG_PATH}" 2>/dev/null || true)
  fail_task "Agent run failed. ${failure_tail}" "${BRANCH_NAME}"
fi

if ! git push --set-upstream origin "${BRANCH_NAME}" >/tmp/git-push.log 2>&1; then
  fail_task "Agent completed but failed to push branch ${BRANCH_NAME}." "${BRANCH_NAME}" "$(git rev-parse --short HEAD 2>/dev/null || true)"
fi

commit_hash="$(git rev-parse --short HEAD 2>/dev/null || true)"
summary="Agent completed successfully. Branch ${BRANCH_NAME} pushed${commit_hash:+ at ${commit_hash}}."

if ! post_callback 'complete' "${summary}" '' "${BRANCH_NAME}" "${commit_hash}"; then
  exit 1
fi

log 'Task completed successfully.'
