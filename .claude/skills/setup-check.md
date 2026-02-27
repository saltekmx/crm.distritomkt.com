# Setup Check

Verify that the engineer's environment is properly configured for the Saltek Agent.

## Usage

```
/setup-check
```

## Instructions

Run these checks in order and report results:

### 1. CLAUDE.md loaded
- Check if `CLAUDE.md` exists at the repo root
- Check if it still has `{{PLACEHOLDERS}}` (means it wasn't filled in)
- **Pass:** CLAUDE.md exists and has no `{{` placeholders
- **Fail:** Tell the engineer to edit CLAUDE.md and fill in project details

### 2. Saltek submodule
- Check if `.saltek/` directory exists and has content
- Check if `.saltek/agent/SOUL.md` exists
- **Pass:** Submodule is present and populated
- **Fail:** Run `git submodule update --init --recursive`

### 3. Skills installed
- Check if `.claude/skills/` directory exists and has .md files
- Count the number of skill files
- **Pass:** 13+ skill files present
- **Fail:** Run `.saltek/scripts/saltek-init.sh` to reinstall, or copy manually: `cp .saltek/templates/skills/*.md .claude/skills/`

### 4. Shared settings
- Check if `.claude/settings.json` exists
- **Pass:** File exists
- **Fail:** Copy from template: `cp .saltek/templates/settings.json .claude/settings.json`

### 5. GitHub CLI
- Run `gh auth status` via Bash
- **Pass:** Authenticated to github.com
- **Fail:** Tell engineer to run `gh auth login` in their terminal (outside Claude Code) and restart

### 6. Atlassian MCP (Jira)
- Try calling `getAccessibleAtlassianResources` to list available Atlassian sites
- **Pass:** Returns one or more cloud sites
- **Fail:** Tell engineer to go to https://claude.ai/settings/integrations, connect Atlassian, authorize their workspace, then restart Claude Code

### 7. Handovers directory
- Check if `handovers/` directory exists
- **Pass:** Directory exists
- **Fail:** Create it: `mkdir -p handovers`

### Report format

```markdown
## Saltek Agent — Setup Check

| Check | Status | Action needed |
|-------|--------|---------------|
| CLAUDE.md | PASS/FAIL | {action if fail} |
| Submodule (.saltek/) | PASS/FAIL | {action if fail} |
| Skills (.claude/skills/) | PASS/FAIL | {action if fail} |
| Shared settings | PASS/FAIL | {action if fail} |
| GitHub CLI (gh) | PASS/FAIL | {action if fail} |
| Atlassian MCP (Jira) | PASS/FAIL | {action if fail} |
| Handovers directory | PASS/FAIL | {action if fail} |

**Result:** {All checks passed — ready to work!} OR {N issues found — fix them and run /setup-check again}
```

### Auto-fix
For checks that can be fixed automatically (submodule, skills, handovers directory), offer to fix them. For checks that require engineer action (gh auth, Atlassian MCP, editing CLAUDE.md), provide clear step-by-step instructions.
