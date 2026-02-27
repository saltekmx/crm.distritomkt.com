# Handover

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Generate a structured session handover for another engineer.

## Usage

```
/handover              → prompted for recipient name
/handover {engineer}   → handover for a specific team member
```

## Instructions

When this skill is invoked:

1. **Identify the recipient** from the argument or ask who the handover is for.

2. **Identify the current engineer** from git config (`git config user.name`) or ask.

3. **Gather context automatically:**
   - Run `git log --oneline --since="8 hours ago" --author="$(git config user.name)"` in the project's source directories to find recent commits
   - Run `git diff --stat HEAD~5` in each repo to see files changed
   - Check for any open PRs: `gh pr list --author=@me --state=open --repo {GITHUB_REPO}` (use the project's GitHub repo from CLAUDE.md)
   - Query Jira for tickets assigned to current user that are In Progress: use `searchJiraIssuesUsingJql` with `project = {JIRA_PROJECT_KEY} AND assignee = currentUser() AND status = "In Progress"` (use the Jira project key defined in CLAUDE.md)
   - Check for uncommitted changes: `git status` in each repo

4. **Generate the handover file** at `handovers/YYYY-MM-DD-{from}-to-{to}.md` with this structure:

```markdown
# Handover: {From} → {To} — YYYY-MM-DD

## What I Worked On
- [{KEY}-XX] Description — status (merged / in progress / blocked)

## Current State
- Summary of where things stand
- Any uncommitted work or WIP branches

## Decisions Made
- Key decisions and reasoning

## Action Items for {To}
- [ ] Specific next steps

## Relevant Links
- Links to PRs, tickets, docs
```

5. **Show the handover** to the engineer for review before writing.

6. **Remind the engineer** to commit and push:
   ```
   git add handovers/ && git commit -m "handover: {from} to {to}" && git push
   ```
