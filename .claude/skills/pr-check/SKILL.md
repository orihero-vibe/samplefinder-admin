---
name: pr-check
description: Run the pre-merge gate for this project — type-check, lint, build, and dispatch the code-reviewer / security-reviewer / qa-engineer subagents in parallel against the current branch's diff. Use before opening a PR or asking for human review. Invoke as `/pr-check` or when the user says "ready to ship", "ready to merge", "open a PR", or similar.
---

# pr-check — pre-merge gate

The bar for "ready to merge" on this repo. Run this before opening a PR.

## Steps — do all of them, in order

1. **Sanity** — run in parallel:
   - `git status` — confirm working tree is clean (no uncommitted changes you forgot).
   - `git rev-parse --abbrev-ref HEAD` — confirm you're not on `main`.
   - `git fetch origin main && git log --oneline origin/main..HEAD` — list commits on this branch.

2. **Build gate** — run `npm run build`. This runs `tsc -b && vite build`, so it catches type errors and build failures in one shot. If it fails, **stop**, surface the error, and let the user fix it. Do not proceed to review.

3. **Lint gate** — run `npm run lint`. Treat warnings as informational, errors as blocking. Surface any output verbatim.

4. **Diff scope** — capture the diff that the reviewers will see:
   ```
   git diff --stat origin/main...HEAD
   git diff origin/main...HEAD
   ```
   Note the changed paths — you'll pass them to the subagents.

5. **Parallel review** — dispatch all three subagents in **a single message with multiple Agent tool calls** (this is required for parallelism):
   - `code-reviewer` — give it the branch name and the changed paths.
   - `security-reviewer` — give it the changed paths and flag if any touch `src/stores/authStore.ts`, `src/components/ProtectedRoute.tsx`, `appwrite/functions/`, or anything matching `account.*` / `databases.*` / `storage.*`.
   - `qa-engineer` — give it the changed paths and a one-sentence description of what the branch does.

6. **Synthesize** — once all three return, produce one consolidated report:
   ```
   ## PR readiness — <branch>

   - Build: PASS / FAIL
   - Lint: PASS / FAIL (N warnings)
   - Code review: N blocking, M suggestions
   - Security: N critical, M high
   - QA: N failing, M needs-human

   ### Must fix before merge
   - …

   ### Should fix
   - …

   ### Verify in browser
   - …
   ```

7. **Decision** — end with one of:
   - `READY` — build, lint, and all reviews are clean. Suggest the user open the PR (do not open it yourself unless explicitly asked).
   - `NOT READY` — one or more blocking items. List them.

## Rules
- Never auto-fix issues found by reviewers in this skill — surface them and let the user decide. The skill is a gate, not a remediator.
- Never push, force-push, or open the PR yourself. The user opens it.
- If `npm run build` or `npm run lint` fails, do not run the subagents — that wastes time on broken code.
- If the branch has zero diff against `origin/main`, stop and tell the user there's nothing to review.
