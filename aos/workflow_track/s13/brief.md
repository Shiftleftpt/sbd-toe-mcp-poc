---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s13
review_status: approved-by-sync
---

# Brief — s13: Installation docs + config examples

## Metadata

- **slice_id:** s13
- **produced_by:** sync
- **date:** 2026-03-27
- **target:** executor
- **depends_on:** s12 (closed)
- **epic:** Distribution

---

## Objective

Criar documentação de instalação completa e exemplos de configuração por cliente MCP.
O utilizador deve conseguir instalar e configurar o `sbd-toe-mcp` em ≤3 passos para qualquer
cliente suportado. Enfatizar o zero-config: nenhuma env var é obrigatória.

**Sem alterações em `src/`.** Sem alterações a ficheiros de código existentes.

---

## Contexto: zero-config confirmado

O audit de `src/config.ts` confirmou que **todos os parâmetros têm defaults funcionais**.
A config mínima para qualquer cliente é:
```json
{ "command": "npx", "args": ["-y", "sbd-toe-mcp"] }
```

Env vars **funcionais** que podem ser documentadas como opcionais:
- `DEBUG_MODE` (default: `false`) — logs de debug
- `MAX_CONTEXT_RECORDS` (default: `8`) — resultados por query
- `SITE_BASE_URL`, `MANUAL_BASE_URL`, `CROSS_CHECK_BASE_URL` — para deploys custom
- `SBD_TOE_APP_ROOT` — override do path do bundle (avançado)

Env vars **NÃO documentar** (dead code — não usadas em src/):
`DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`, `SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`

---

## Scope

### 13.1 — `docs/installation.md`

Ficheiro novo. Guia completo de instalação para todos os clientes suportados.

**Estrutura obrigatória:**

```markdown
# Installation Guide — sbd-toe-mcp

## Quick Start (qualquer cliente MCP)
## Requirements
## Claude Desktop
## Claude Code (CLI)
## VS Code + GitHub Copilot
## Cursor
## Windsurf
## Zed / outros clientes MCP
## Optional Configuration
## Troubleshooting
```

**Conteúdo por secção:**

**Quick Start:** snippet `npx -y sbd-toe-mcp` como zero-config. 1 passo.

**Requirements:**
- Node.js ≥ 20.9.0
- Um cliente MCP compatível

**Claude Desktop:**
- Path do config: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) / `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- Snippet:
  ```json
  {
    "mcpServers": {
      "sbd-toe": {
        "command": "npx",
        "args": ["-y", "sbd-toe-mcp"]
      }
    }
  }
  ```
- Instrução: reiniciar Claude Desktop após editar o ficheiro

**Claude Code (CLI):**
```bash
claude mcp add sbd-toe -- npx -y sbd-toe-mcp
```
Ou via `.mcp.json` no projecto:
```json
{
  "mcpServers": {
    "sbd-toe": {
      "command": "npx",
      "args": ["-y", "sbd-toe-mcp"]
    }
  }
}
```

**VS Code + GitHub Copilot:**
- Ficheiro `.vscode/mcp.json` (já em `examples/vscode.mcp.json`)
- Snippet do `examples/vscode.mcp.json` já corrigido em s12
- Nota: requer VS Code ≥ 1.99 com extensão GitHub Copilot

**Cursor:**
```json
{
  "mcpServers": {
    "sbd-toe": {
      "command": "npx",
      "args": ["-y", "sbd-toe-mcp"]
    }
  }
}
```
- Path: `~/.cursor/mcp.json` (global) ou `.cursor/mcp.json` (projecto)

**Windsurf:**
- Path: `~/.codeium/windsurf/mcp_config.json`
- Mesmo formato `mcpServers` que Cursor

**Zed / outros:**
- Secção genérica com o padrão stdio: command `npx`, args `["-y", "sbd-toe-mcp"]`
- Nota: consultar documentação do cliente específico para o path do config

**Optional Configuration:**
- Tabela das 5 env vars opcionais funcionais com nome, default e descrição
- Exemplo de como passar env vars (via `env` key no config, se o cliente suportar)

**Troubleshooting:**
- `npx: command not found` → instalar Node.js ≥ 20.9.0
- Servidor não arranca → verificar `node --version`; tentar `npx -y sbd-toe-mcp@latest`
- Tools não aparecem → reiniciar o cliente MCP

### 13.2 — `examples/claude-desktop.json`

Ficheiro novo. Config de referência para Claude Desktop:

```json
{
  "mcpServers": {
    "sbd-toe": {
      "command": "npx",
      "args": ["-y", "sbd-toe-mcp"]
    }
  }
}
```

### 13.3 — `README.md` — secção Quick Start

Actualizar `README.md` com secção de instalação rápida **antes** da secção de desenvolvimento.

A nova secção deve conter:
- Badge npm (opcional mas recomendado): `[![npm](https://img.shields.io/npm/v/sbd-toe-mcp)](https://www.npmjs.com/package/sbd-toe-mcp)`
- 3 passos máximo para o cliente mais simples (Claude Code):
  1. Instalar Node.js ≥ 20.9.0
  2. Correr `claude mcp add sbd-toe -- npx -y sbd-toe-mcp`
  3. Usar as tools MCP no Claude Code
- Link para `docs/installation.md` para instruções completas por cliente

---

## Out of Scope

- Não criar `smithery.yaml` (s14)
- Não alterar `release.yml` (s15)
- Não alterar nenhum ficheiro em `src/`
- Não documentar `DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`, `SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `docs/installation.md` | novo |
| `examples/claude-desktop.json` | novo |
| `README.md` | modificar (adicionar secção Quick Start) |

---

## Acceptance Criteria

**AC-1: `docs/installation.md` existe e cobre todos os clientes**
- Ficheiro existe com ≥150 linhas
- Contém secções para: Claude Desktop, Claude Code, VS Code/Copilot, Cursor, Windsurf, Zed/outros
- Cada secção tem pelo menos um snippet JSON ou comando copy-pasteable

**AC-2: zero-config enfatizado**
- `docs/installation.md` menciona explicitamente que nenhuma env var é obrigatória
- O snippet mais simples é `{ "command": "npx", "args": ["-y", "sbd-toe-mcp"] }` (ou `claude mcp add`)
- Sem referências a `.env` como passo obrigatório

**AC-3: env vars dead-code omitidas**
- `docs/installation.md` **não** menciona `DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`, `SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`
- Tabela de env vars opcionais contém ≤6 entradas (apenas as funcionais)

**AC-4: `examples/claude-desktop.json` válido**
- Ficheiro existe; é JSON válido (parseável sem erro)
- Contém `mcpServers.sbd-toe.command: "npx"` e `args: ["-y", "sbd-toe-mcp"]`

**AC-5: `README.md` tem Quick Start**
- Existe secção "Quick Start" ou "Installation" no README.md
- Contém `npx` e `sbd-toe-mcp` como comando de instalação
- Link para `docs/installation.md`
- Instalação em ≤3 passos para pelo menos um cliente

**AC-6: qualidade**
- `npm run check` limpo (todos os ficheiros novos têm frontmatter `ai_assisted: true`)
- `npm run build` limpo
- `npm run test` passa — 247 testes, zero regressões (sem alterações em src/)

---

## Validation

```bash
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc

# 1. Ficheiros criados
ls docs/installation.md examples/claude-desktop.json

# 2. Tamanho do installation.md
wc -l docs/installation.md

# 3. Secções presentes
grep -E "^## " docs/installation.md

# 4. Sem dead-code env vars
grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|SAMPLING_MAX_TOKENS|UPSTREAM_RELEASE_TAG)" docs/installation.md

# 5. claude-desktop.json válido
node -e "JSON.parse(require('fs').readFileSync('examples/claude-desktop.json','utf8')); console.log('JSON válido')"

# 6. README tem Quick Start com npx
grep -A 10 -E "Quick Start|Installation" README.md | grep "npx"

# 7. Qualidade
npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5
```

---

## Risks

| Risco | Mitigação |
|---|---|
| Paths de config por OS/versão de cliente desactualizados | Incluir nota "verificar documentação oficial do cliente" em cada secção |
| README.md tem conteúdo existente que pode ser perturbado | Executor lê o README completo antes de editar; adiciona secção sem remover conteúdo |
| `docs/` pode não existir | Executor cria o directório se necessário |
