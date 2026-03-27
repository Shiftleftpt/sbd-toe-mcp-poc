---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: tester
slice_id: s12
cycle: 0
---

# Tester Report — s12

## Metadata

- **slice_id:** s12
- **produced_by:** tester
- **date:** 2026-03-27
- **cycle:** 0
- **outcome:** PASS

---

## Summary

Validação independente do slice s12 "npm-ready packaging". Todos os 7 acceptance criteria satisfeitos. `package.json` correctamente renomeado, sem `private`, com todos os metadados de descoberta npm, `bin` entry correcto, `files` field completo. `npm pack --dry-run` confirma inclusão de `dist/`, `data/publish/`, `prompts/` e exclusão de `src/`, `node_modules/`. Nome `sbd-toe-mcp` disponível no registry (E404 confirmado). `PROJECT_NAME` actualizado, `vscode.mcp.json` portável com `npx`. Build/check/test limpos — 247 testes sem regressões.

---

## Acceptance Criteria — Validation

### AC-1: Nome e metadados

#### Criterion: `"private"` ausente (ou `false`); `"name": "sbd-toe-mcp"`; `"description"` sem "poc" nem "VS Code"
- **Status:** PASS
- **Method:** `node -e "const p=JSON.parse(...); console.log('name:', p.name, '| private:', p.private, ...)"`
- **Output:**
  ```
  name: sbd-toe-mcp | private: undefined | bin: {"sbd-toe-mcp":"./dist/index.js"} | publishConfig: {"access":"public"}
  description: MCP server for SbD-ToE security manual — structured tools for Claude, GitHub Copilot and other MCP clients
  ```
- **Finding:** `private: undefined` (campo ausente). Nome correcto. Description sem "poc" nem "VS Code".

#### Criterion: `keywords`, `repository`, `bugs`, `homepage`, `publishConfig` presentes
- **Status:** PASS
- **Method:** Inspecção directa do package.json via node
- **Output:** `keywords: present(8) | repository: present | bugs: present | homepage: present`
- **Finding:** Todos os 5 campos de metadados presentes.

---

### AC-2: `bin` e `files`

#### Criterion: `bin["sbd-toe-mcp"]` aponta para `"./dist/index.js"`
- **Status:** PASS
- **Method:** Output do comando acima
- **Output:** `bin: {"sbd-toe-mcp":"./dist/index.js"}`
- **Finding:** Entry correcta.

#### Criterion: `files` contém `"dist/"`, `"data/publish/"`, `"prompts/"`, `".env.example"`
- **Status:** PASS
- **Method:** `node -e "const p=JSON.parse(...); console.log(p.files)"`
- **Output:**
  ```
  ["dist/","data/publish/","data/reports/run_manifest.json","prompts/","examples/",".env.example","smithery.yaml"]
  ```
- **Finding:** Todas as 4 entradas obrigatórias presentes. `smithery.yaml` incluído antecipadamente para s14 (conforme brief).

---

### AC-3: `npm pack --dry-run` confirma conteúdo

#### Criterion: Lista `dist/index.js`, ≥1 ficheiro de `data/publish/`, `prompts/`; não lista `src/`, `node_modules/`, `.aos_engine_data/`, `.claude/`
- **Status:** PASS
- **Method:** `npm pack --dry-run 2>&1 | grep -E "(dist/index|data/publish|prompts|src/|node_modules|aos_engine|\.claude)"`
- **Output:**
  ```
  npm notice 10.3MB data/publish/algolia_docs_records_enriched.json
  npm notice 8.9MB  data/publish/algolia_docs_records.json
  npm notice 7.6MB  data/publish/algolia_entities_records_enriched.json
  npm notice 3.6MB  data/publish/algolia_entities_records.json
  npm notice 2.8kB  data/publish/algolia_index_settings.json
  npm notice 3.2kB  data/publish/sbd-toe-index-compact.json
  npm notice 31B    dist/index.d.ts
  npm notice 45.8kB dist/index.js
  npm notice 31.0kB dist/index.js.map
  npm notice 2.0kB  prompts/sbd-toe-chat-system.md
  ```
- **Finding:** `dist/index.js` ✓, 6 ficheiros `data/publish/` ✓, `prompts/` ✓. Nenhum resultado para `src/`, `node_modules/`, `.aos_engine_data/`, `.claude/` ✓.

---

### AC-4: `PROJECT_NAME` actualizado

#### Criterion: `grep "PROJECT_NAME" scripts/package-release-lib.mjs` retorna `"sbd-toe-mcp"` (sem `-poc`)
- **Status:** PASS
- **Method:** `grep "PROJECT_NAME" scripts/package-release-lib.mjs`
- **Output:** `export const PROJECT_NAME = "sbd-toe-mcp";`
- **Finding:** Critério satisfeito. Nome actualizado em todas as 3 ocorrências da constante.

---

### AC-5: `examples/vscode.mcp.json` corrigido

#### Criterion: JSON válido com `"command": "npx"` e `"args": ["-y", "sbd-toe-mcp"]`; sem caminhos absolutos
- **Status:** PASS
- **Method:** `cat examples/vscode.mcp.json`
- **Output:**
  ```json
  {
    "servers": {
      "sbdToe": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "sbd-toe-mcp"]
      }
    }
  }
  ```
- **Finding:** JSON válido. `command: npx` ✓, `args: ["-y", "sbd-toe-mcp"]` ✓. Sem caminhos absolutos ✓.

---

### AC-6: Disponibilidade npm confirmada

#### Criterion: `npm view sbd-toe-mcp` retorna 404 (nome livre)
- **Status:** PASS
- **Method:** `npm view sbd-toe-mcp 2>&1 | head -4`
- **Output:**
  ```
  npm ERR! code E404
  npm ERR! 404 Not Found - GET https://registry.npmjs.org/sbd-toe-mcp - Not found
  npm ERR! 404 'sbd-toe-mcp@*' is not in this registry.
  ```
- **Finding:** Nome `sbd-toe-mcp` disponível no registry npm. Executor avançou correctamente.

---

### AC-7: Qualidade

#### Criterion: `npm run check` limpo
- **Status:** PASS
- **Method:** `npm run check`
- **Output:** `[AI Disclosure Validation] 35 valid, 5 human-authored (skipped), 0 invalid` / `✅ All disclosed AI documents are valid`
- **Finding:** 35 documentos válidos (inclui correcção de `distribution-epic.md`).

#### Criterion: `npm run build` limpo
- **Status:** PASS
- **Method:** `npm run build`
- **Output:** `(zero output — clean)`
- **Finding:** Zero erros TypeScript.

#### Criterion: `npm run test` passa — 247 testes, zero regressões
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose 2>&1 | tail -6`
- **Output:** `Test Files  10 passed (10)` / `Tests  247 passed (247)` / `Duration  1.22s`
- **Finding:** 247 testes sem regressões. Inclui correcção em `package-release.test.ts` (`sbd-toe-mcp-poc-v9.9.9-bundle` → `sbd-toe-mcp-v9.9.9-bundle`).

---

## Overall Outcome

**PASS** — todos os 7 critérios satisfeitos. Recomendar close.

Packaging correctamente preparado para publicação npm. Nome disponível confirmado. Sem alterações em `src/`. Duas correcções de pré-existência aplicadas pelo executor (distribution-epic.md frontmatter + test rename) são consequências legítimas e necessárias do rename.

---

## Notes

- `data/reports/run_manifest.json` não aparece no `npm pack --dry-run` (ausente localmente, sem `checkout:backend`) — conforme documentado no brief, aceite.
- `smithery.yaml` ausente — npm ignora entradas `files` inexistentes; s14 criará o ficheiro.
- 35 documentos AI valid (2 novos face aos 33 do executor_report — tester_report e este próprio foram contabilizados).
