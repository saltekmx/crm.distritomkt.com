# Risk Scan

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Scan for project risks across Jira, GitHub, and codebase.

## Usage

```
/risk-scan
```

## Instructions

Refer to `.saltek/workflows/risk-register.md` for the full workflow spec.

1. **Sprint risk:**
   - Check sprint progress vs remaining days
   - Flag if <50% complete past midpoint
   - Identify tickets blocked for >2 days

2. **Dependency risk:**
   - Check for external service dependencies (see CLAUDE.md for the project's external dependencies)
   - Check for cross-project dependencies (see CLAUDE.md for related Jira projects)

3. **Code risk:**
   - Open PRs without review for >48h: `gh pr list --state=open --json number,title,createdAt,reviewDecision`
   - Failing CI checks
   - Security advisories: `gh api repos/{GITHUB_REPO}/vulnerability-alerts` (use the project's GitHub repo from CLAUDE.md, if available)

4. **Team risk:**
   - Single points of failure (only one person knows a module)
   - Capacity issues (too many tickets assigned to one person)

5. **Present the risk report:**

```markdown
## Risk Scan — YYYY-MM-DD

### Sprint Risks
| Risk | Severity | Ticket | Mitigation |
|------|----------|--------|------------|
| ... | High/Med/Low | {KEY}-XX | ... |

### Dependency Risks
- {external service risks}

### Code Risks
- {stale PRs, failing CI, security}

### Team Risks
- {capacity, knowledge concentration}

### Recommendations
1. {highest priority action}
2. {next priority}
```
