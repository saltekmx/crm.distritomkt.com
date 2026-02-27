# PR Check

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Validate the current branch's PR against team conventions.

## Usage

```
/pr-check              → check the current branch's PR
/pr-check 42           → check PR #42
```

## Instructions

When this skill is invoked:

1. **Find the PR:**
   - If a PR number is given, use: `gh pr view {number} --json title,body,state,reviewDecision,statusCheckRollup,headRefName,baseRefName,files,additions,deletions,labels`
   - If no number, find PR for current branch: `gh pr view --json title,body,state,reviewDecision,statusCheckRollup,headRefName,baseRefName,files,additions,deletions,labels`
   - If no PR exists, report that and offer to create one

2. **Check branch naming:**
   - Must match: `feature/{KEY}-{N}-*`, `bugfix/{KEY}-{N}-*`, `hotfix/{KEY}-{N}-*`, or `release/v*` (where `{KEY}` is the Jira project key from CLAUDE.md)
   - Flag non-conforming branch names

3. **Check PR title:**
   - Should follow conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
   - Should be concise (<70 characters)

4. **Check PR body:**
   - Has a description of what changed? (not empty)
   - Has a "why" section or explanation?
   - Has testing instructions?
   - Links a Jira ticket? (look for `{KEY}-{N}` pattern matching the project's Jira key)

5. **Check CI status:**
   - All checks passing?
   - Any failing checks? Report which ones

6. **Check review status:**
   - Has at least 1 reviewer assigned?
   - Correct reviewer? (based on team review assignments from CLAUDE.md)
   - Any review comments that need addressing?

7. **Check for common issues:**
   - PR too large? (>500 lines changed → suggest splitting)
   - Sensitive files changed? (.env, credentials, secrets)
   - Missing test files? (code changes without corresponding test changes)

8. **Present the result:**

```
## PR Check: #{number} — {title}

### Branch
- Name: `{branch}` — {OK / non-standard naming}

### Title & Description
- Title format: {OK / needs conventional commit prefix}
- Description: {OK / missing / incomplete}
- Jira link: {{KEY}-XX found / missing}
- Test instructions: {present / missing}

### CI & Reviews
- CI status: {all passing / N failing}
- Reviewers: {assigned / not assigned} — {correct / wrong reviewer}
- Review decision: {approved / changes requested / pending}

### Size
- Files changed: {N}
- Lines: +{additions} -{deletions}
- Assessment: {OK / consider splitting}

### Issues Found
- {list of issues, if any}

### Verdict: {READY TO MERGE / NEEDS ATTENTION}
```
