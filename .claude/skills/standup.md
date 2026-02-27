# Standup

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Generate an async standup summary for the current engineer.

## Usage

```
/standup
```

## Instructions

1. **Identify the current engineer** from git config or ask.

2. **Gather "yesterday" data:**
   - Git commits from last working day: `git log --oneline --since="yesterday" --author="$(git config user.name)"` in the project's source directories
   - Jira tickets moved to Done or Code Review recently
   - PRs opened or merged

3. **Gather "today" data:**
   - Tickets assigned and in sprint that are In Progress or To Do
   - Any handover action items

4. **Identify blockers:**
   - Tickets stuck in same status for >2 days
   - PRs waiting for review
   - Dependencies on other team members

5. **Present the standup:**

```markdown
## Standup — {Engineer} — YYYY-MM-DD

### Yesterday
- Worked on [{KEY}-XX]: {description} — {status}
- Merged PR #{N}: {title}
- {other activity}

### Today
- Continue [{KEY}-XX]: {next steps}
- Start [{KEY}-YY]: {description}

### Blockers
- {any blockers, or "None"}
```
