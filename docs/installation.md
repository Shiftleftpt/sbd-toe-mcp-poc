---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: documentation
produced_by: executor
slice_id: s13
---

# Installation Guide — @shiftleftpt/sbd-toe-mcp

## Quick Start (any MCP client)

**No environment variables required.** The server works zero-config with a single command:

```bash
npx -y @shiftleftpt/sbd-toe-mcp
```

The package bundles all semantic data locally — no Algolia, no API keys, no `.env` setup needed.

---

## Requirements

- **Node.js ≥ 20.9.0** — [nodejs.org/download](https://nodejs.org/download/)
- **A compatible MCP client** — Claude Desktop, Claude Code, VS Code + GitHub Copilot, Cursor, Windsurf, or Zed

Verify your Node.js version:

```bash
node --version   # must be v20.9.0 or higher
```

---

## Claude Desktop

Claude Desktop reads its MCP server list from a JSON config file.

### Config file location

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

### Configuration

Add the `sbd-toe` server to your existing `claude_desktop_config.json`:

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

If you already have other MCP servers configured, add `sbd-toe` as another entry inside `mcpServers`.

### After editing

Restart Claude Desktop completely (quit and reopen) to pick up the new server configuration.
Once running, you can ask Claude questions like:

```
What are the authentication requirements for an L2 application?
```

---

## Claude Code (CLI)

### Option A — one-line registration

```bash
claude mcp add sbd-toe -- npx -y @shiftleftpt/sbd-toe-mcp
```

This registers the server globally in your Claude Code config.

### Option B — project-level `.mcp.json`

Create `.mcp.json` at your project root:

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

This keeps the server scoped to the project and can be committed to version control.

### Verify the server is active

```bash
claude mcp list
```

You should see `sbd-toe` listed. Use `claude mcp remove sbd-toe` to unregister.

---

## VS Code + GitHub Copilot

Requires **VS Code ≥ 1.99** with the **GitHub Copilot** extension installed and enabled.

### Configuration

Copy [`examples/vscode.mcp.json`](../examples/vscode.mcp.json) to your project as `.vscode/mcp.json`:

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

VS Code picks up `.vscode/mcp.json` automatically when you open the folder.
No `envFile` is needed — all configuration has functional defaults.

### Notes

- The `type: "stdio"` field is required by the VS Code MCP integration
- The server name `sbdToe` is the display name inside the Copilot chat panel
- See VS Code docs for the current MCP configuration format if this guide becomes stale

---

## Cursor

Cursor supports MCP servers via a JSON config file.

### Config file location

| Scope | Path |
|---|---|
| Global | `~/.cursor/mcp.json` |
| Project | `.cursor/mcp.json` at project root |

### Configuration

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

Restart Cursor or reload the MCP server list after saving the config file.
Refer to the [Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol)
for the latest config path if it has changed.

---

## Windsurf

Windsurf uses a global MCP config file.

### Config file location

`~/.codeium/windsurf/mcp_config.json`

### Configuration

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

After saving, reload the Windsurf MCP configuration from the editor's settings panel.
Refer to [Windsurf MCP documentation](https://docs.codeium.com/windsurf/mcp) for the most
current config path and reload procedure.

---

## Zed / other MCP clients

Any client that supports the MCP `stdio` transport can use this server.

### Generic stdio configuration

```json
{
  "command": "npx",
  "args": ["-y", "@shiftleftpt/sbd-toe-mcp"]
}
```

For **Zed**, add an entry in the `context_servers` section of your `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "sbd-toe-mcp": {
      "command": {
        "path": "npx",
        "args": ["-y", "@shiftleftpt/sbd-toe-mcp"]
      }
    }
  }
}
```

For other clients, consult their documentation for how to register stdio MCP servers.
The key fields are always: `command: "npx"` and `args: ["-y", "@shiftleftpt/sbd-toe-mcp"]`.

---

## Optional Configuration

No environment variables are required. The server works fully out-of-the-box with `npx -y @shiftleftpt/sbd-toe-mcp`.

The following variables can be set to customise behaviour:

| Variable | Default | Description |
|---|---|---|
| `DEBUG_MODE` | `false` | Enable verbose debug output in tool responses |
| `MAX_CONTEXT_RECORDS` | `8` | Maximum number of semantic records returned per query |
| `SITE_BASE_URL` | built-in | Base URL for SbD-ToE site links in responses |
| `MANUAL_BASE_URL` | built-in | Base URL for manual chapter links |
| `CROSS_CHECK_BASE_URL` | built-in | Base URL for cross-reference links |
| `SBD_TOE_APP_ROOT` | auto-detected | Override the bundle root path (advanced; rarely needed) |

### How to pass environment variables

If your MCP client supports an `env` key in the server config, use it:

```json
{
  "mcpServers": {
    "sbd-toe": {
      "command": "npx",
      "args": ["-y", "@shiftleftpt/sbd-toe-mcp"],
      "env": {
        "DEBUG_MODE": "true",
        "MAX_CONTEXT_RECORDS": "12"
      }
    }
  }
}
```

Not all clients support `env` — check your client's MCP documentation.

---

## Troubleshooting

### `npx: command not found`

Node.js is not installed or not in your `PATH`.
Install Node.js ≥ 20.9.0 from [nodejs.org/download](https://nodejs.org/download/) and restart your terminal.

### Server fails to start / tools not available

1. Verify your Node.js version: `node --version` (must be ≥ v20.9.0)
2. Try updating to the latest package version: `npx -y @shiftleftpt/sbd-toe-mcp@latest`
3. Restart the MCP client completely (quit and reopen, not just reload)
4. Check the client's MCP log output for error messages

### Tools don't appear in the chat

- Restart the MCP client after adding the configuration
- Confirm the config file syntax is valid JSON (no trailing commas, correct nesting)
- Verify the server entry is inside `mcpServers` (Claude Desktop / Cursor) or `servers` (VS Code)

### Responses seem outdated

The semantic data is bundled inside the package. Run `npx -y @shiftleftpt/sbd-toe-mcp@latest` to
force-fetch the most recent published version.

### Debugging the server directly

Run the server manually in a terminal to see its startup output:

```bash
npx -y @shiftleftpt/sbd-toe-mcp
```

The server will log to `stderr`. If it starts successfully you will see a ready message.
Use `Ctrl+C` to stop it.
