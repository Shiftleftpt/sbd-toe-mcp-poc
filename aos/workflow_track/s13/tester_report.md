---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: tester
slice_id: s13
cycle: 0
---

# Tester Report — s13

## Metadata

- **slice_id:** s13
- **produced_by:** tester
- **date:** 2026-03-27
- **cycle:** 0
- **outcome:** PASS

---

## Summary

Validação independente do slice s13 "Installation docs + config examples". Todos os 6 acceptance criteria satisfeitos. `docs/installation.md` existe com 306 linhas (≥150), 10 secções, todos os 6 clientes MCP cobertos com snippets copy-pasteable. Zero-config explicitamente declarado ("No environment variables required."). Nenhuma dead-code env var presente. `examples/claude-desktop.json` JSON válido com npx. README tem Quick Start com 3 passos e link para installation.md. Build/check/test limpos — 247 testes sem regressões.

---

## Acceptance Criteria — Validation

### AC-1: `docs/installation.md` existe e cobre todos os clientes

#### Criterion: Ficheiro existe com ≥150 linhas; secções para Claude Desktop, Claude Code, VS Code/Copilot, Cursor, Windsurf, Zed/outros; cada secção com snippet copy-pasteable
- **Status:** PASS
- **Method:** `ls docs/installation.md && wc -l docs/installation.md` + `grep -E "^## " docs/installation.md`
- **Output:**
  ```
  306 docs/installation.md

  ## Quick Start (any MCP client)
  ## Requirements
  ## Claude Desktop
  ## Claude Code (CLI)
  ## VS Code + GitHub Copilot
  ## Cursor
  ## Windsurf
  ## Zed / other MCP clients
  ## Optional Configuration
  ## Troubleshooting
  ```
- **Finding:** 306 linhas (≥150 ✓). Todos os 6 clientes MCP cobertos em secções próprias. Cada secção verificada tem snippet JSON copy-pasteable.

---

### AC-2: Zero-config enfatizado

#### Criterion: Menciona explicitamente que nenhuma env var é obrigatória; snippet mais simples é `command: npx / args: sbd-toe-mcp`; sem `.env` como passo obrigatório
- **Status:** PASS
- **Method:** `grep -iE "No environment variables required|zero.config" docs/installation.md`
- **Output:**
  ```
  **No environment variables required.** The server works zero-config with a single command:
  No environment variables are required. The server works fully out-of-the-box with `npx -y sbd-toe-mcp`.
  ```
- **Finding:** Zero-config declarado duas vezes (Quick Start e Optional Configuration). Snippet mínimo é `{"command":"npx","args":["-y","sbd-toe-mcp"]}`. `.env` não é passo obrigatório em nenhuma secção.

---

### AC-3: Env vars dead-code omitidas

#### Criterion: `docs/installation.md` não menciona `DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`, `SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`; tabela Optional Config ≤6 entradas
- **Status:** PASS
- **Method:** `grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|SAMPLING_MAX_TOKENS|UPSTREAM_RELEASE_TAG)" docs/installation.md`
- **Output:** `(sem output — limpo)`
- **Finding:** Nenhuma das 5 dead-code vars presente. Tabela Optional Configuration tem exactamente 6 entradas: `DEBUG_MODE`, `MAX_CONTEXT_RECORDS`, `SITE_BASE_URL`, `MANUAL_BASE_URL`, `CROSS_CHECK_BASE_URL`, `SBD_TOE_APP_ROOT` — todas funcionais (6 ≤ 6 ✓).

---

### AC-4: `examples/claude-desktop.json` válido

#### Criterion: Ficheiro existe; JSON válido; contém `command: "npx"` e `args: ["-y", "sbd-toe-mcp"]`
- **Status:** PASS
- **Method:** `node -e "JSON.parse(...); console.log('JSON válido')"` + `cat examples/claude-desktop.json`
- **Output:**
  ```
  JSON válido
  {
    "mcpServers": {
      "sbd-toe": {
        "command": "npx",
        "args": ["-y", "sbd-toe-mcp"]
      }
    }
  }
  ```
- **Finding:** JSON válido. `command: npx` ✓, `args: ["-y", "sbd-toe-mcp"]` ✓.

---

### AC-5: `README.md` tem Quick Start

#### Criterion: Secção Quick Start/Installation presente; contém `npx` e `sbd-toe-mcp`; link para `docs/installation.md`; ≤3 passos para ≥1 cliente
- **Status:** PASS
- **Method:** `grep -A 20 "Quick Start — instalar via npm" README.md`
- **Output:**
  ```
  ## Quick Start — instalar via npm
  [![npm](https://img.shields.io/npm/v/sbd-toe-mcp)](https://www.npmjs.com/package/sbd-toe-mcp)
  **Zero configuração obrigatória.** O servidor funciona directamente com `npx`:
  1. Instalar Node.js ≥ 20.9.0: ...
  2. claude mcp add sbd-toe -- npx -y sbd-toe-mcp
  3. Usar as tools MCP no Claude Code ...
  Para instruções completas por cliente MCP ... consultar [`docs/installation.md`](docs/installation.md).
  ```
- **Finding:** Secção Quick Start presente. Contém `npx` + `sbd-toe-mcp` ✓. Link para `docs/installation.md` ✓. 3 passos para Claude Code ✓. Badge npm incluído.

---

### AC-6: Qualidade

#### Criterion: `npm run check` limpo; `npm run build` limpo; `npm run test` → 247 testes, zero regressões
- **Status:** PASS
- **Method:** `npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5`
- **Output:**
  ```
  [AI Disclosure Validation] 38 valid, 5 human-authored (skipped), 0 invalid
  ✅ All disclosed AI documents are valid
  Test Files  10 passed (10)
  Tests  247 passed (247)
  Duration  1.18s
  ```
- **Finding:** 38 documentos válidos. Zero erros TypeScript. 247 testes PASS sem regressões.

---

## Overall Outcome

**PASS** — todos os 6 critérios satisfeitos. Recomendar close.

Documentação de instalação completa, clara e correcta. Zero-config enfatizado consistentemente. Dead-code vars ausentes. Todos os 6 clientes MCP cobertos. `claude-desktop.json` e README Quick Start conformes.

---

## Notes

- `docs/installation.md` escrito em inglês — consistente com os outros ficheiros técnicos. Se o sync preferir português, pode ajustar em slice futuro.
- README ainda referencia GitHub Releases como canal principal — o executor notou que esta afirmação será contradição após publicação npm. Sync deve avaliar revisão mais ampla do README em s15 ou slice posterior.
- 38 documentos AI valid (1 adicional face aos 37 do executor — este tester_report).
