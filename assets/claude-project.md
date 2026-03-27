---
# Installation: copy this file to CLAUDE.md in your project root
# Claude Code reads CLAUDE.md automatically on every session
---

# SbD-ToE Context

This project uses the **SbD-ToE MCP server** (`@shiftleftpt/sbd-toe-mcp`).

**SbD-ToE = Security by Design — Theory of Everything** — a 15-chapter framework
for secure-by-design software development.

## Important — scope of SbD-ToE

**SbD-ToE guides security practices only.** It does not impose development standards,
testing requirements, coding conventions, or architecture decisions unrelated to security.
Project rules always take precedence. An L1 risk level reduces required *security controls*,
not code quality or testing expectations.

## How to answer security questions

When the user asks about security, secure development, SbD-ToE controls, threat
modelling, SBOM, CI/CD security, containers, or any topic covered by the manual:

1. **Always call a tool first** — never answer from training knowledge
2. Use `search_sbd_toe_manual` for conceptual questions
3. Use `map_sbd_toe_applicability` to determine which chapters apply to this project
4. Use `list_sbd_toe_chapters` to navigate the manual structure
5. Use `query_sbd_toe_entities` to find specific controls or artefacts
6. Use `generate_document` to produce document skeletons
7. Use `map_sbd_toe_review_scope` when reviewing changed files

## Load the full skill guide

For detailed workflow patterns and examples, load the skill:

```
/skill sbd-toe-skill
```

(requires `assets/claude-skill.md` copied to `.github/skills/sbd-toe-skill/SKILL.md`)
