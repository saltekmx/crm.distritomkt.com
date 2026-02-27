# Triage

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Classify and enrich a Jira ticket with priority, component, estimation, and suggested assignee.

## Usage

```
/triage {KEY}-89       → triage a specific ticket
/triage                → triage all untriaged tickets in backlog
```

## Instructions

When this skill is invoked:

### Single Ticket Triage

1. **Fetch the ticket** using `getJiraIssue` with the provided key.

2. **Analyze the ticket** and determine:
   - **Priority:** Critical / High / Medium / Low — based on user impact and urgency
   - **Component:** backend / frontend / ai / infra / devops / whatsapp / payments
   - **Story Points:** Fibonacci estimate (1, 2, 3, 5, 8, 13) based on complexity
   - **Suggested Assignee:** Based on component ownership defined in CLAUDE.md (map components to team members as specified there; ask if unclear)
   - **Type classification:** Bug / Story / Task / Subtask

3. **Check for missing fields:**
   - Missing description? → Flag it
   - Missing acceptance criteria? → Draft suggested criteria
   - Duplicate? → Search for similar tickets and flag potential duplicates

4. **Present the triage result:**

```
## Triage: {KEY}-XX — {Title}

| Field | Current | Suggested |
|-------|---------|-----------|
| Priority | {current or unset} | {suggested} |
| Component | {current or unset} | {suggested} |
| Story Points | {current or unset} | {suggested} |
| Assignee | {current or unset} | {suggested} |
| Type | {current} | {suggested if different} |

### Missing Fields
- Description: {ok / needs detail}
- Acceptance Criteria: {ok / missing — suggested below}

### Suggested Acceptance Criteria
- [ ] ...
- [ ] ...

### Potential Duplicates
- {KEY}-YY: {title} — {similarity reason}

Apply these changes?
```

5. **If approved**, update the ticket via `editJiraIssue` with the triaged fields.

### Bulk Triage

1. Query untriaged tickets: `project = {JIRA_PROJECT_KEY} AND (priority is EMPTY OR component is EMPTY) AND status = "Backlog" ORDER BY created DESC` (use the Jira project key defined in CLAUDE.md)
2. Present a summary table of all tickets needing triage
3. Triage each one, presenting results for batch approval
