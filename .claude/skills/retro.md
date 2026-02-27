# Retro

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Generate data for a sprint retrospective.

## Usage

```
/retro
```

## Instructions

1. **Gather sprint data:**
   - Completed tickets: `project = {JIRA_PROJECT_KEY} AND sprint in closedSprints() AND status = Done ORDER BY resolved DESC` (use the Jira project key defined in CLAUDE.md; limit to most recent sprint)
   - Sprint scope changes (items added/removed mid-sprint)
   - Velocity: planned vs actual points completed

2. **Gather process data:**
   - PRs: average time from open to merge
   - Code review: average review turnaround time via `gh pr list --state=merged --json createdAt,mergedAt`
   - Blockers: tickets that were blocked during the sprint

3. **Gather quality data:**
   - Bugs found during sprint
   - Tickets that bounced back from QA
   - Override log entries from `.saltek/metrics/override-log.md` (if the file exists)

4. **Present the retro data:**

```markdown
## Sprint Retrospective Data — {Sprint Name}

### Delivery
- Planned: {N} pts ({count} tickets)
- Completed: {N} pts ({count} tickets)
- Carry-over: {N} pts ({count} tickets)
- Velocity: {N} pts (vs average {N})

### Process Metrics
- Average PR merge time: {N} hours
- Average review turnaround: {N} hours
- Tickets blocked during sprint: {count}

### Quality
- Bugs found: {count}
- QA bounce-backs: {count}
- Agent overrides: {count}

### Highlights
- {Notable accomplishments}

### Discussion Points
- What went well?
- What could improve?
- What should we try differently?

### Agent Self-Assessment
{1-2 sentences on agent performance this sprint — accuracy, helpfulness, any errors}
```

5. **Do NOT auto-generate "what went well" or "what to improve"** — those are for the team to discuss. Only provide the data.
