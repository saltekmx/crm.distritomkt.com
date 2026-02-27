# Morning Digest

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Generate a morning status briefing covering sprint progress, blockers, recent activity, and action items.

## Usage

```
/morning-digest
```

## Instructions

1. **Identify the current engineer** from git config or ask.

2. **Check for handovers** — read any recent files in `handovers/` addressed to the current engineer.

3. **Sprint status** — query Jira for current sprint:
   - `project = {JIRA_PROJECT_KEY} AND sprint in openSprints() ORDER BY priority DESC` (use the Jira project key defined in CLAUDE.md)
   - If the project has additional Jira projects, check those too (see CLAUDE.md for the list)
   - Calculate: total points, done points, in-progress, blockers, days remaining

4. **Recent activity** (last 24h):
   - Git commits: `git log --oneline --since="24 hours ago"` in the project's source directories
   - Open PRs: `gh pr list --state=open --repo {GITHUB_REPO}` (use the project's GitHub repo from CLAUDE.md)

5. **Blockers and stale tickets:**
   - Tickets in "In Progress" for >3 days
   - Tickets with "blocked" label
   - PRs waiting for review >24h

6. **Present the digest:**

```markdown
## Morning Digest — YYYY-MM-DD

### Handover
{Summary of handover from previous engineer, or "No handover pending"}

### Sprint: {Sprint Name} — {Health}
- Progress: {done}/{total} points ({%})
- Days remaining: {N}
- In Progress: {count} tickets
- Blockers: {count}

### Your Tickets
- [{KEY}-XX] Title — {status}
- [{KEY}-YY] Title — {status}

### Needs Attention
- {blockers, stale PRs, overdue reviews}

### Recent Activity
- {commits, merged PRs from last 24h}
```
