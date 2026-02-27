# Release Notes

> This skill reads project-specific values (Jira key, repo, team) from the project's CLAUDE.md.

Generate release notes from merged PRs and completed Jira tickets.

## Usage

```
/release-notes              → generate from recent activity
/release-notes v1.2.0      → generate for a specific version
```

## Instructions

1. **Gather completed work since last release:**
   - Find the last release tag: `gh release list --limit 1 --repo {GITHUB_REPO}` (use the project's GitHub repo from CLAUDE.md)
   - If no releases yet, use last 2 weeks of activity
   - List merged PRs since last release: `gh pr list --state=merged --base=main --json title,number,mergedAt,labels,body`

2. **Cross-reference with Jira:**
   - Extract Jira ticket keys from PR titles/bodies (pattern: `{KEY}-{N}` matching the project's Jira key(s) from CLAUDE.md)
   - Fetch ticket details for context

3. **Categorize changes:**
   - **Features:** PRs with `feat:` prefix or `feature` label
   - **Bug Fixes:** PRs with `fix:` prefix or `bugfix` label
   - **Improvements:** PRs with `refactor:`, `perf:` prefix
   - **Other:** docs, chores, tests

4. **Generate release notes** using template from `.saltek/workflows/document-templates/release-notes-template.md`:

```markdown
## Release {version} — YYYY-MM-DD

### Features
- {description} ([{KEY}-XX], PR #{N})

### Bug Fixes
- {description} ([{KEY}-YY], PR #{N})

### Improvements
- {description} (PR #{N})

### Contributors
- {list of PR authors}

### Migration Notes
- {any breaking changes or required actions}
```

5. **Present for review** before creating the GitHub release. This is a Plan-First workflow.
