# Sprint Status

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Query Jira for current sprint progress and present a summary.

## Usage

```
/sprint-status
```

## Instructions

When this skill is invoked:

1. **Find the active sprint** by querying Jira:
   - Use `searchJiraIssuesUsingJql` with JQL: `project = {JIRA_PROJECT_KEY} AND sprint in openSprints() ORDER BY priority DESC, created ASC` (use the Jira project key defined in CLAUDE.md)
   - Request fields: `summary, status, assignee, priority, story_points, issuetype`

2. **Calculate metrics:**
   - Total tickets and story points
   - Breakdown by status: To Do, In Progress, Code Review, QA/Testing, Done
   - Breakdown by assignee
   - Identify blocked tickets (status hasn't changed in 2+ days or has "blocked" label)

3. **Assess sprint health:**
   - **On Track:** >50% of points done at midpoint, or >80% done in last 3 days
   - **At Risk:** <50% done at midpoint, or blockers exist
   - **Behind:** <30% done past midpoint

4. **Present the summary:**

```
## Sprint Status: {Sprint Name}

**Health:** {On Track / At Risk / Behind}
**Days remaining:** {N}

| Status | Tickets | Points |
|--------|---------|--------|
| Done | N | N |
| QA/Testing | N | N |
| Code Review | N | N |
| In Progress | N | N |
| To Do | N | N |
| **Total** | **N** | **N** |

### By Assignee
- {Engineer A}: N in progress, N done
- {Engineer B}: N in progress, N done
- Unassigned: N

### Blockers
- [{KEY}-XX] Description — reason blocked

### Stale (no update in 3+ days)
- [{KEY}-YY] Description — last updated YYYY-MM-DD
```

5. **If no active sprint found**, report that and suggest checking the Jira board.
