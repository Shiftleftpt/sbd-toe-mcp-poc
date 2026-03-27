---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: executor
slice_id: s13
---

# Executor Report — s13

## Metadata

- **slice_id:** s13
- **produced_by:** executor
- **date:** 2026-03-27

## Summary

Criada documentação de instalação completa e exemplos de configuração para todos os clientes MCP suportados. `docs/installation.md` cobre Quick Start, Requirements, Claude Desktop, Claude Code, VS Code+Copilot, Cursor, Windsurf, Zed/outros, Optional Configuration e Troubleshooting (306 linhas). `examples/claude-desktop.json` criado com config npx. README.md actualizado com secção "Quick Start — instalar via npm" (badge npm, 3 passos, link para installation.md).

## Deliverables Produced

| Ficheiro | Acção |
|---|---|
| `docs/installation.md` | Novo — 306 linhas, AI disclosure frontmatter, 10 secções, todos os clientes MCP |
| `examples/claude-desktop.json` | Novo — config npx portável para Claude Desktop |
| `README.md` | Modificado — adicionada secção Quick Start antes de "Instalação a partir do source" |

## Acceptance Criteria — Evidence

- **AC-1: docs/installation.md existe e cobre todos os clientes**
  - status: PASS
  - evidence: `wc -l docs/installation.md` → 306 linhas; secções: Claude Desktop, Claude Code (CLI), VS Code + GitHub Copilot, Cursor, Windsurf, Zed / other MCP clients; cada secção tem snippet JSON copy-pasteable

- **AC-2: zero-config enfatizado**
  - status: PASS
  - evidence: Quick Start abre com "No environment variables required."; snippet mais simples é `{"command":"npx","args":["-y","sbd-toe-mcp"]}`; Optional Configuration nota "No environment variables are required."; `.env` não é passo obrigatório em nenhuma secção

- **AC-3: env vars dead-code omitidas**
  - status: PASS
  - evidence: `grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|SAMPLING_MAX_TOKENS|UPSTREAM_RELEASE_TAG)" docs/installation.md` → output vazio; tabela Optional Configuration tem 6 entradas: `DEBUG_MODE`, `MAX_CONTEXT_RECORDS`, `SITE_BASE_URL`, `MANUAL_BASE_URL`, `CROSS_CHECK_BASE_URL`, `SBD_TOE_APP_ROOT`

- **AC-4: examples/claude-desktop.json válido**
  - status: PASS
  - evidence: `node -e "JSON.parse(...)"` → "JSON válido"; contém `"command": "npx"`, `"args": ["-y", "sbd-toe-mcp"]`

- **AC-5: README.md tem Quick Start**
  - status: PASS
  - evidence: secção "## Quick Start — instalar via npm" presente; contém `npx` e `sbd-toe-mcp`; link para `docs/installation.md`; instalação em 3 passos para Claude Code

- **AC-6: qualidade**
  - status: PASS
  - evidence: `npm run check` → 37 valid, 0 invalid; `npm run build` limpo; `npm run test` → 247 passed (247), 0 failures

## Validation Run

```
$ wc -l docs/installation.md
306 docs/installation.md

$ grep -E "^## " docs/installation.md
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

$ grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|...)" docs/installation.md
(output vazio — clean)

$ node -e "JSON.parse(require('fs').readFileSync('examples/claude-desktop.json','utf8')); console.log('JSON válido')"
JSON válido

$ npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -8
[AI Disclosure Validation] 37 valid, 5 human-authored (skipped), 0 invalid
✅ All disclosed AI documents are valid
 Test Files  10 passed (10)
      Tests  247 passed (247)
   Duration  2.20s
```

## Notes

- `docs/installation.md` escrito em inglês (consistente com os outros ficheiros técnicos do projecto, e.g., CONTRIBUTING.md). Se o sync preferir português, pode ajustar em s15 ou num slice de docs futuro.
- README.md mantém todo o conteúdo existente; a secção Quick Start foi inserida antes de "Instalação a partir do source" sem remover nada.
- O README.md ainda contém referências ao workflow de GitHub Releases (e.g., "O canal principal de distribuição é GitHub Releases, não npm") — estas serão contradições após s12 tornar o pacote público no npm. O sync deve avaliar se quer uma revisão mais ampla do README em slice futuro (sugestão: s15 ou s16 após publicação).
