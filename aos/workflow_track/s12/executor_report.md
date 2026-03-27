---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: executor
slice_id: s12
---

# Executor Report — s12

## Metadata

- **slice_id:** s12
- **produced_by:** executor
- **date:** 2026-03-27

## Summary

Implementado o npm-ready packaging do projecto: renomeado `sbd-toe-mcp-poc` → `sbd-toe-mcp`, removido `"private": true`, adicionados `files`, `publishConfig`, metadados de descoberta npm (`keywords`, `repository`, `bugs`, `homepage`), actualizado `bin` entry, actualizado `description`. `scripts/package-release-lib.mjs` actualizado com `PROJECT_NAME = "sbd-toe-mcp"`. `examples/vscode.mcp.json` substituído por config portável com `npx`. O slice também corrigiu dois problemas de pré-existência: frontmatter `purpose: mission-brief` em `aos/missions/distribution-epic.md` (inválido na allowlist) e referências ao nome antigo no teste de release.

## Deliverables Produced

| Ficheiro | Acção |
|---|---|
| `package.json` | Modificado — rename, remove private, add files/publishConfig/keywords/repository/bugs/homepage/bin/description |
| `scripts/package-release-lib.mjs` | Modificado — `PROJECT_NAME = "sbd-toe-mcp"` |
| `examples/vscode.mcp.json` | Modificado — substituído por config npx portável |
| `aos/missions/distribution-epic.md` | Corrigido — `purpose: mission-brief` → `purpose: governance-doc` (pré-existência bloqueava `npm run check`) |
| `src/release/package-release.test.ts` | Corrigido — referências `sbd-toe-mcp-poc-v9.9.9-bundle` → `sbd-toe-mcp-v9.9.9-bundle` |

## Acceptance Criteria — Evidence

- **AC-1: nome e metadados**
  - status: PASS
  - evidence: `node -e "..."` → `name: sbd-toe-mcp | private: undefined | bin: {"sbd-toe-mcp":"./dist/index.js"}`; keywords, repository, bugs, homepage, publishConfig presentes no package.json

- **AC-2: bin e files**
  - status: PASS
  - evidence: `bin["sbd-toe-mcp"]: "./dist/index.js"`; files inclui `dist/`, `data/publish/`, `data/reports/run_manifest.json`, `prompts/`, `examples/`, `.env.example`, `smithery.yaml`

- **AC-3: npm pack confirma conteúdo**
  - status: PASS
  - evidence: `npm pack --dry-run` lista `dist/index.js`, `data/publish/algolia_*.json`, `data/publish/sbd-toe-index-compact.json`, `prompts/sbd-toe-chat-system.md`; sem `src/`, `node_modules/`, `.aos_engine_data/`, `.claude/`

- **AC-4: PROJECT_NAME actualizado**
  - status: PASS
  - evidence: `grep "PROJECT_NAME" scripts/package-release-lib.mjs` → `export const PROJECT_NAME = "sbd-toe-mcp";`

- **AC-5: examples/vscode.mcp.json corrigido**
  - status: PASS
  - evidence: contém `"command": "npx"`, `"args": ["-y", "sbd-toe-mcp"]`; sem caminhos absolutos

- **AC-6: disponibilidade npm confirmada**
  - status: PASS
  - evidence: `npm view sbd-toe-mcp` → `npm ERR! code E404 / 404 Not Found - GET https://registry.npmjs.org/sbd-toe-mcp - Not found`

- **AC-7: qualidade**
  - status: PASS
  - evidence: `npm run check` → 33 valid, 0 invalid; `npm run build` limpo; `npm run test` → 247 passed (247), 0 failures

## Validation Run

```
$ npm view sbd-toe-mcp 2>&1 | head -5
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/sbd-toe-mcp - Not found
npm ERR! 404 'sbd-toe-mcp@*' is not in this registry.

$ node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('name:', p.name, '| private:', p.private, '| bin:', JSON.stringify(p.bin));"
name: sbd-toe-mcp | private: undefined | bin: {"sbd-toe-mcp":"./dist/index.js"}

$ npm pack --dry-run 2>&1 | grep -E "(dist/index|data/publish|prompts)" | head -10
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

$ npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -8
[AI Disclosure Validation] 33 valid, 5 human-authored (skipped), 0 invalid
✅ All disclosed AI documents are valid

 Test Files  10 passed (10)
      Tests  247 passed (247)
   Start at  15:04:50
   Duration  876ms
```

## Notes

- **Pré-existência corrigida (1):** `aos/missions/distribution-epic.md` tinha `purpose: mission-brief` inválido na allowlist do `validate-ai-disclosure.mjs`. Corrigido para `governance-doc`. Sync deve normalizar o enum no brief template futuro ou adicionar `mission-brief` à allowlist se for necessário.
- **Pré-existência corrigida (2):** `src/release/package-release.test.ts` referenciava `sbd-toe-mcp-poc-v9.9.9-bundle` — actualizado para `sbd-toe-mcp-v9.9.9-bundle`. Esta correcção é consequência directa do rename e está dentro do scope do slice.
- **`data/reports/run_manifest.json`** ausente localmente (sem `checkout:backend`) — não aparece no `npm pack --dry-run`; conforme documentado no brief, aceite.
- **`smithery.yaml`** ausente — npm ignora entradas `files` inexistentes; s14 criará o ficheiro.
