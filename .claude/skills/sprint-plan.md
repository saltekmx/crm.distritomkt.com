# Sprint Plan

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Help plan an upcoming sprint by analyzing velocity, backlog, and team capacity.

## Usage

```
/sprint-plan
```

## Instructions

Follow the sprint planning pattern from `.saltek/agent/AGENTS.md`.

1. **Review velocity** — query last 2-3 completed sprints to calculate average velocity:
   - Search for recent closed sprints in Jira
   - Calculate average story points completed per sprint

2. **Identify carry-over items:**
   - Tickets from current sprint that are not Done
   - Estimate how many points are carrying over

3. **Pull highest-priority backlog items:**
   - `project = {JIRA_PROJECT_KEY} AND sprint is EMPTY AND status = "Backlog" ORDER BY priority DESC, created ASC` (use the Jira project key defined in CLAUDE.md)
   - Get enough items to fill the velocity target minus carry-over

4. **Balance workload across team:**
   - Check who has capacity (see team members in CLAUDE.md)
   - Assign based on component ownership and current load
   - Ensure no one is overloaded (suggest max 60-70% of individual capacity)

5. **Propose a sprint goal:**
   - Based on the selected items, draft a 1-sentence sprint goal
   - Focus on the most impactful deliverable

6. **Present the sprint plan:**

```markdown
## Sprint Plan: {Sprint Name}

### Sprint Goal
{1-sentence goal}

### Velocity
- Average: {N} pts/sprint (last {N} sprints)
- Carry-over: {N} pts ({count} tickets)
- Available capacity: {N} pts

### Proposed Items

| Ticket | Title | Points | Assignee | Priority |
|--------|-------|--------|----------|----------|
| {KEY}-XX | Title | N | {Engineer A} | High |
| {KEY}-YY | Title | N | {Engineer B} | Medium |

**Total: {N} points**

### Workload
- {Engineer A}: {N} pts ({count} tickets)
- {Engineer B}: {N} pts ({count} tickets)
- Unassigned: {N} pts ({count} tickets)

### Risks
- {any risks identified — dependencies, unknowns, capacity constraints}
```

7. **Wait for team approval** before making any changes in Jira. This is a Plan-First workflow.
