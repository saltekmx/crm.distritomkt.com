# Pick Work

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Show available Jira tickets for the current engineer to work on next.

## Usage

```
/pick-work             → picks work for current user
/pick-work {engineer}  → picks work for a specific team member
```

## Instructions

When this skill is invoked:

1. **Identify the engineer** from the argument, git config, or ask.

2. **Query Jira for assigned tickets** using `searchJiraIssuesUsingJql`:
   - First, tickets already assigned and in sprint: `project = {JIRA_PROJECT_KEY} AND assignee = "{user}" AND sprint in openSprints() AND status != Done ORDER BY priority DESC` (use the Jira project key defined in CLAUDE.md)
   - Fields: `summary, status, priority, issuetype, story_points`

3. **Query for unassigned tickets** available to pick up:
   - `project = {JIRA_PROJECT_KEY} AND assignee is EMPTY AND sprint in openSprints() AND status = "To Do" ORDER BY priority DESC`

4. **Check for in-progress work first** — if the engineer has tickets In Progress, recommend finishing those before picking new work.

5. **Present recommendations:**

```
## Your Work — {Engineer Name}

### In Progress (finish these first)
1. **[{KEY}-XX]** Description — {priority} — {story points} pts
   Status: In Progress since YYYY-MM-DD

### Ready to Start (assigned to you)
1. **[{KEY}-YY]** Description — {priority} — {story points} pts
2. **[{KEY}-ZZ]** Description — {priority} — {story points} pts

### Available to Pick Up (unassigned)
1. **[{KEY}-WW]** Description — {priority} — {story points} pts
   Suggested because: {reason — e.g., backend component, matches your skills}

### Recommendation
Start with [{KEY}-XX] — it's highest priority and already in progress.
```

6. **If asked to pick a ticket**, offer to move it to "In Progress" and assign it via Jira MCP.
