---
name: senior-review
description: Self-review checklist before claiming any task is "done", "fixed", or "ready". Use after finishing an implementation and before reporting completion to the user. Invoke as `/senior-review` or proactively before saying things like "done", "implemented", "fixed", "ready to merge".
---

# senior-review — self-check before claiming done

The gap between "I wrote some code" and "this is production-ready" is filled by going through this list. Do not skip steps. Evidence beats assertions.

## 1. Did I do what was asked?
- Re-read the user's original request. Not the most recent message — the original ask.
- List what they asked for. List what you did. Are they the same set?
- Anything you added that wasn't asked for? Remove it unless it was strictly necessary.
- Anything you skipped? Either do it or surface it explicitly to the user.

## 2. Does it actually work?
- Run `npm run build`. If it fails, you are not done. Fix it.
- Run `npm run lint`. New errors introduced by your change? Fix them.
- For UI changes: have you actually loaded the page in a browser and clicked through it? If not, say so explicitly. Do not claim "tested" if you only ran the build.

## 3. Edge cases
For every change, walk through these in your head and write down what happens:
- Empty input / empty list / first-time user.
- One item, exactly the page-size limit, one over the limit.
- Network failure mid-request.
- User double-clicks the submit button.
- User navigates away while a fetch is in flight.
- Logged-out user, non-admin user (if relevant).

If any of these are broken or unverified, fix or call out explicitly.

## 4. Side effects and blast radius
- Did you touch a Zustand store? Search for every component that reads from it. They could regress.
- Did you change a function signature? Search for every caller.
- Did you change an Appwrite collection helper? Every page that uses it could be affected.
- Did you change a shared component (`src/components/`)? List the pages it appears on and confirm none broke.

## 5. Code quality (do this last, not first)
- No `console.log` left behind.
- No commented-out code.
- No `any` you didn't justify.
- No dead imports, unused variables.
- Names match what the value actually is.
- No comments explaining *what* the code does — only *why* if non-obvious. (See `CLAUDE.md` and the project's commenting conventions.)

## 6. Report honestly
When you tell the user you're done, your message should answer:
- What changed (one line).
- What you verified, and how (build / lint / browser / not verified).
- What you did **not** verify (be explicit — never claim coverage you don't have).
- Anything the user should sanity-check manually.

If something failed and you couldn't fix it, say so. Do not paper over it.

## Red flags — these mean you're not done

| You're tempted to say… | Reality |
|---|---|
| "Should work" | You haven't verified it works. |
| "I've made the change" | What does it do end-to-end? |
| "Tests pass" (when there are no tests) | Don't say this. There are no tests. |
| "All edge cases handled" | Name them. |
| "Build passes" (without running it) | Run it. Then say it. |

## When to skip
You can skip this for one-line typo fixes, doc-only edits, or pure renames where the diff is mechanically obvious. Anything else — go through the list.
