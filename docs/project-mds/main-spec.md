# Porter - Main Specification

**Version:** 4.0.0  
**Status:** Architecture Pivot (Worker + DO)  
**Last Updated:** March 2026

## Overview

Porter executes GitHub issue tasks from `@porter` comments and dashboard dispatches.
Execution is now built on **Cloudflare Workers + Durable Objects**, with atomic commits through the **GitHub Git Trees API**.

## Core Architecture

1. **Worker (front door)**
   - validates GitHub webhook/dashboard payload
   - derives task id
   - routes request to a task-scoped Durable Object
   - returns immediately

2. **Durable Object (task owner)**
   - one task = one globally unique DO instance
   - owns full lifecycle: `queued -> reading -> running -> committing -> pr_opened -> done`
   - reads repo context via GitHub APIs
   - calls selected LLM model
   - writes logs/status to D1
   - retries with alarm-based backoff

3. **GitHub integration**
   - uses Git Trees API for one atomic commit per task
   - opens/links PR after commit

## Product Defaults

- Settings are **model-first** (default model + provider keys).
- Provider keys are encrypted and stored in D1.
- Dashboard/review UX remains unchanged as the user-facing surface.

## Non-Goals (Removed)

- Fly Machines
- container launch/runtime orchestration
- shell-based git execution for task commits
- agent enable/disable infrastructure controls in settings
