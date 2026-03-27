---
# Installation: copy this file to CLAUDE.md in your project root
# Claude Code reads CLAUDE.md automatically on every session
---

# SbD-ToE Context

This project uses the **SbD-ToE MCP server** (`@shiftleftpt/sbd-toe-mcp`).

**SbD-ToE = Security by Design — Theory of Everything** — a 15-chapter security guidance
framework for secure-by-design software development.

## Scope

SbD-ToE guides **security practices only**. It does not impose development standards,
testing requirements, coding conventions, or any non-security practice. Project rules
always take precedence. A lower risk level reduces required security controls —
not code quality or testing expectations.

## Operating modes

Use the SbD-ToE MCP in two ways:

**CONSULT** — when asked what the manual says, what applies, how to classify a project,
what controls or artefacts are required, or whether something is aligned with the manual.

**GUIDE** — when asked how to implement, design, structure, document, or review something
according to the manual. Always obtain applicable guidance before generating or modifying.

## Language

Always respond in the user's language. The manual content is in Portuguese — translate
and explain in the user's language regardless of the retrieved content language.

## Rules

- Do not answer SbD-ToE questions from training knowledge — always call a tool first.
- If the request touches security practices, risk classification, controls, requirements,
  artefacts, secure coding, governance, or validation: use the MCP.
- Always distinguish: **manual-grounded** / **observed** / **inferred** / **not verified**.
- Never mark controls as implemented unless directly verified.
- In governance or planning tasks: present the target artefact plan before modifying files.

## Session startup

```
1. Read: sbd://toe/index-compact          ← bootstrap chapter map
2. Run:  setup_sbd_toe_agent(riskLevel="<L1|L2|L3>", projectRole="<role>")
```

## Load the full skill guide

For detailed routing, tool chaining, chapter map and examples:

```
/skill sbd-toe-skill
```

(requires `assets/claude-skill.md` copied to `.github/skills/sbd-toe-skill/SKILL.md`)
