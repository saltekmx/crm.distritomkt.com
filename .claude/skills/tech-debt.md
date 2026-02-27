# Tech Debt

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Scan and report technical debt across the codebase.

## Usage

```
/tech-debt
```

## Instructions

Refer to `.saltek/workflows/technical-debt.md` for the full workflow spec.

1. **Scan for code-level debt:**
   - Search for TODO/FIXME/HACK comments: use Grep for `TODO|FIXME|HACK|XXX|TEMP` in the project's source directories
   - Count and categorize by file/module

2. **Check Jira for tagged debt:**
   - `project = {JIRA_PROJECT_KEY} AND labels = "tech-debt" AND status != Done ORDER BY priority DESC` (use the Jira project key defined in CLAUDE.md)

3. **Identify common patterns:**
   - Missing tests (changed files without corresponding test files)
   - Outdated dependencies: check `requirements.txt` and `package.json`
   - Large files (>500 lines) that might need refactoring

4. **Present the report:**

```markdown
## Technical Debt Report — YYYY-MM-DD

### Code TODOs/FIXMEs
| File | Line | Type | Comment |
|------|------|------|---------|
| ... | ... | TODO | ... |

**Total:** {N} items (broken down by source directory)

### Jira Tech Debt Tickets
- [{KEY}-XX] Title — {priority} — {status}

### Areas of Concern
- {high-debt areas identified}

### Recommendations
1. {highest priority debt to address}
2. {next priority}
```

5. **Suggest creating Jira tickets** for any undocumented debt discovered. Get confirmation before creating.
