# Incident

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Initiate the incident response workflow.

## Usage

```
/incident                      → prompted for details
/incident "login page is down" → start incident with description
```

## Instructions

Follow the incident response pattern from `.saltek/agent/AGENTS.md`.

1. **Classify severity:**
   - **P1:** System down — all users affected, no workaround
   - **P2:** Major feature broken — significant user impact
   - **P3:** Degraded performance — partial impact, workaround exists
   - **P4:** Minor issue — cosmetic or edge case

2. **Check for duplicates:**
   - Search Jira for similar recent incidents: `project = {JIRA_PROJECT_KEY} AND type = Bug AND priority in (Critical, High) AND created >= -7d` (use the Jira project key defined in CLAUDE.md)

3. **Create incident ticket in Jira** (with confirmation):
   - Type: Bug
   - Priority: based on severity classification
   - Title: `[P{N}] {brief description}`
   - Description: what's happening, impact, when it started
   - Labels: `incident`, `p{N}`

4. **Alert based on severity:**
   - P1/P2: Flag to entire team immediately in the current session
   - P3/P4: Include in next digest

5. **Track resolution:**
   - Keep the Jira ticket updated as investigation progresses
   - Log key findings and actions taken

6. **Post-resolution (P1/P2):**
   - Suggest creating a postmortem using template: `.saltek/workflows/document-templates/postmortem-template.md`
   - Categorize root cause: code bug / infrastructure / configuration / external dependency

7. **Present the incident report:**

```markdown
## Incident Report

- **Severity:** P{N}
- **Status:** {Investigating / Mitigated / Resolved}
- **Ticket:** {JIRA-KEY}
- **Description:** {what happened}
- **Impact:** {who/what is affected}
- **Timeline:**
  - {time} — Reported
  - {time} — Investigation started
  - {time} — Root cause identified
  - {time} — Fix deployed
- **Root Cause:** {if known}
- **Action Items:** {follow-up work}
```
