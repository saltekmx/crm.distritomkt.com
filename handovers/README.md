# Handovers

Session handover files for passing context between engineers across timezones.

## How It Works

1. At the end of your work session (especially if there's in-progress work), run `/handover` in Claude Code
2. Claude Code generates a structured handover file here
3. Commit and push: `git add handovers/ && git commit -m "handover: {from} to {to}" && git push`
4. The recipient pulls and Claude Code reads the handover at the start of their session

## File Naming

```
YYYY-MM-DD-{from}-to-{to}.md
```

Example: `2026-02-26-gonzalo-to-roberto.md`

## Handover Format

Each handover file contains:

```markdown
# Handover: {From} → {To} — YYYY-MM-DD

## What I Worked On
- [KEY-XX] Description — status (merged / in progress / blocked)
- [KEY-YY] Description — status

## Current State
- What's in progress and where it stands
- What's ready for review
- What's blocked and why

## Decisions Made
- Key decisions and their reasoning
- Things tried that didn't work

## Action Items for {To}
- [ ] Specific next steps
- [ ] Tickets to pick up
- [ ] PRs to review

## Relevant Links
- PR #N: description
- KEY-XX: ticket link
```

## Cleanup

Handover files older than 2 weeks can be deleted. They're point-in-time context, not permanent documentation.
