# @shiftleftpt/sbd-toe-mcp

MCP server for the **SbD-ToE** (**Security by Design — Theory of Everything**) security manual — structured tools for Claude, GitHub Copilot, Cursor, Windsurf, Zed and any MCP-compatible client.

[![npm](https://img.shields.io/npm/v/@shiftleftpt%2fsbd-toe-mcp)](https://www.npmjs.com/package/@shiftleftpt/sbd-toe-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

---

## Quick Start

**Zero configuration required.** Works out-of-the-box with `npx`:

**Claude Code:**
```bash
claude mcp add sbd-toe -- npx -y @shiftleftpt/sbd-toe-mcp
```

**Claude Desktop / Cursor / Windsurf** — add to your MCP config:
```json
{
  "mcpServers": {
    "sbd-toe": {
      "command": "npx",
      "args": ["-y", "@shiftleftpt/sbd-toe-mcp"]
    }
  }
}
```

**VS Code + GitHub Copilot** — add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "sbdToe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@shiftleftpt/sbd-toe-mcp"]
    }
  }
}
```

For full installation instructions for all clients see [`docs/installation.md`](docs/installation.md).

**Requirements:** Node.js ≥ 20.9.0

---

## What it does

This MCP server gives any AI client structured access to the [SbD-ToE security manual](https://www.securitybydesign.dev/sbd-toe/sbd-manual/) — a 15-chapter (00–14) framework for Security by Design — Theory of Everything.

All data is bundled locally. No Algolia, no internet connection required at runtime, no API keys.

---

## Tools

| Tool | Description |
|---|---|
| `search_sbd_toe_manual` | Retrieval over the manual — returns grounded context with citations |
| `answer_sbd_toe_manual` | Retrieval + answer via MCP sampling (uses the user's model) |
| `inspect_sbd_toe_retrieval` | Debug tool — shows retrieval scores, selection and prompt |
| `list_sbd_toe_chapters` | Lists all 14 manual chapters with readable titles and risk levels |
| `query_sbd_toe_entities` | Queries structured entities (controls, requirements, patterns) |
| `get_sbd_toe_chapter_brief` | Returns a structured brief for a specific chapter |
| `map_sbd_toe_applicability` | Maps a project profile to applicable chapter bundles |
| `generate_document` | Generates a structured document skeleton (5 types × 3 risk levels) |
| `map_sbd_toe_review_scope` | Maps changed file paths to relevant SbD-ToE knowledge bundles |
| `plan_sbd_toe_repo_governance` | Produces an advisory governance plan for a repository |

### Resources

| Resource | Description |
|---|---|
| `sbd://toe/index-compact` | Compact chapter index (<5KB) — injectable into system prompts |
| `sbd://toe/skill-template` | Skill template for AI agent configuration (L1/L2/L3) |
| `sbd://toe/chapter-applicability` | Chapter applicability by risk level |

### Prompts

| Prompt | Description |
|---|---|
| `setup_sbd_toe_agent` | Slash command to configure an AI agent with SbD-ToE context |

---

## Architecture

```
AI client (Claude / Copilot / Cursor / ...)
    ↓  MCP stdio
sbd-toe-mcp server
    ↓  local read
data/publish/   ← semantic snapshots bundled in the package
```

1. The user asks a question in their AI client.
2. The client calls a tool (e.g. `search_sbd_toe_manual`).
3. The server reads the local snapshots in `data/publish/`.
4. Retrieval combines documentary and structured records.
5. The server returns grounded context with citations and links.
6. The user's model answers based on that context.

---

## Distribution

**Primary channel: npm**

```bash
npx -y @shiftleftpt/sbd-toe-mcp
```

**Secondary channel: GitHub Releases** — self-contained bundle for environments without internet access or `npx`. Each release publishes:

- `sbd-toe-mcp-vX.Y.Z-bundle.tar.gz`
- `sbd-toe-mcp-vX.Y.Z-bundle.zip`
- `sbd-toe-mcp-vX.Y.Z-bundle.sha256`

### Installing from a GitHub Release bundle

For environments without npm/npx:

1. Download `sbd-toe-mcp-vX.Y.Z-bundle.zip` from [GitHub Releases](https://github.com/Shiftleftpt/sbd-toe-mcp-poc/releases).
2. Extract the archive.
3. Point your MCP client to the extracted `dist/index.js`:
   ```json
   {
     "command": "node",
     "args": ["/path/to/extracted/dist/index.js"]
   }
   ```
4. No `npm ci` or `npm run build` needed — the bundle is self-contained.

---

## Optional configuration

No environment variables are required. The following can be overridden:

| Variable | Default | Description |
|---|---|---|
| `DEBUG_MODE` | `false` | Enable debug metadata in responses |
| `MAX_CONTEXT_RECORDS` | `8` | Max records returned per query |
| `SITE_BASE_URL` | `https://www.securitybydesign.dev/` | Override base URL |
| `MANUAL_BASE_URL` | `https://www.securitybydesign.dev/sbd-toe/sbd-manual/` | Override manual URL |
| `CROSS_CHECK_BASE_URL` | `https://www.securitybydesign.dev/sbd-toe/cross-check-normativo/` | Override cross-check URL |
| `SBD_TOE_APP_ROOT` | auto (resolved from `dist/`) | Override app root path |

Copy `.env.example` to `.env` and adjust as needed.

---

## Relation to the SbD-ToE ecosystem

| Repository | Role |
|---|---|
| `Shiftleftpt/SbD-ToE-Manual` | canonical editorial source of the manual |
| `sbd-toe-knowledge-graph` | builder/publisher of semantic snapshots |
| `@shiftleftpt/sbd-toe-mcp` | MCP server — consumes snapshots, exposes tools |

This project **consumes** artefacts already produced by `sbd-toe-knowledge-graph`. It does not re-index the manual, does not rebuild semantics and does not replace the builder.

Maintainers who want to update the bundled snapshots from a local checkout of `sbd-toe-knowledge-graph`:

```bash
npm run checkout:backend
```

---

## Development

```bash
npm ci
npm run check
npm run build
npm run test
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution workflow.

---

## Security

See [`SECURITY.md`](SECURITY.md). Vulnerabilities must be reported privately by email, never via public issue.

---

## Licence

Split licensing:

- code and runtime: [`LICENSE`](LICENSE) (`Apache-2.0`)
- documentation and bundled snapshots: [`LICENSE-DATA`](LICENSE-DATA) (`CC BY-SA 4.0`)
- mapping and attribution note: [`LICENSE-NOTE.md`](LICENSE-NOTE.md)
