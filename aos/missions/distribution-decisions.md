---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: human+executor
status: resolved
---

# Design Decisions — Distribution Epic

## Contexto

Decisões tomadas pelo sync após análise do codebase real (`src/config.ts`, `.env.example`,
audit de uso de env vars em toda a `src/`) antes da decomposição em slices.

---

## D1 — Estratégia de dados para npm

**Decisão: incluir data files no package npm via `files` field. Self-contained.**

Raciocínio:
- `src/config.ts` resolve todos os paths via `resolveAppPath()` que parte de `moduleDir/../`
- Com `npx sbd-toe-mcp`, o app root é `node_modules/sbd-toe-mcp/`
- Ficheiros em `data/publish/*.json` ficam acessíveis sem qualquer configuração extra
- Coerente com a estratégia do GitHub Release bundle — ambos são self-contained
- Risco de tamanho: estimado 10–20 MB — aceitável para npm (limite 50 MB)

Alternativa descartada: download on-first-run via `postinstall` — complexidade adicional,
falha em ambientes restritos (firewalls corporativos, npm proxies), piora o DX.

---

## D2 — Env vars: zero obrigatórias; 5 definidas mas não usadas

**Decisão: zero env vars obrigatórias para uso básico.**

Audit completo de `src/config.ts` vs utilização real em `src/`:

| Env Var | Campo config | Usado em src/ | Obrigatória | Default |
|---|---|---|---|---|
| `DOCS_SNAPSHOT_FILE` | `backend.docsSnapshotFile` | ✓ semantic-index-gateway, checkout-backend | Não | `./data/publish/algolia_docs_records.json` |
| `ENTITIES_SNAPSHOT_FILE` | `backend.entitiesSnapshotFile` | ✓ semantic-index-gateway, checkout-backend | Não | `./data/publish/algolia_entities_records.json` |
| `DOCS_ENRICHED_SNAPSHOT_FILE` | `backend.docsEnrichedSnapshotFile` | ✓ semantic-index-gateway, checkout-backend | Não | `./data/publish/algolia_docs_records_enriched.json` |
| `ENTITIES_ENRICHED_SNAPSHOT_FILE` | `backend.entitiesEnrichedSnapshotFile` | ✓ semantic-index-gateway, checkout-backend | Não | `./data/publish/algolia_entities_records_enriched.json` |
| `INDEX_SETTINGS_FILE` | `backend.indexSettingsFile` | ✓ checkout-backend | Não | `./data/publish/algolia_index_settings.json` |
| `RUN_MANIFEST_FILE` | `backend.runManifestFile` | ✓ checkout-backend | Não | `./data/reports/run_manifest.json` |
| `SEMANTIC_BACKEND_DOCS_INDEX` | `backend.docsIndex` | ✓ semantic-index-gateway, system-prompt | Não | `SbD-ToE-ASKAI-Docs` |
| `SEMANTIC_BACKEND_ENTITIES_INDEX` | `backend.entitiesIndex` | ✓ semantic-index-gateway, system-prompt | Não | `SbD-ToE-ASKAI-Entities` |
| `SYSTEM_PROMPT_FILE` | `prompt.systemPromptFile` | ✓ system-prompt | Não | `./prompts/sbd-toe-chat-system.md` |
| `SITE_BASE_URL` | `prompt.siteBaseUrl` | ✓ system-prompt | Não | `https://www.securitybydesign.dev/` |
| `MANUAL_BASE_URL` | `prompt.manualBaseUrl` | ✓ system-prompt | Não | `https://www.securitybydesign.dev/sbd-toe/sbd-manual/` |
| `CROSS_CHECK_BASE_URL` | `prompt.crossCheckBaseUrl` | ✓ system-prompt | Não | `https://www.securitybydesign.dev/sbd-toe/cross-check-normativo/` |
| `MAX_CONTEXT_RECORDS` | `backend.maxContextRecords` | ✓ semantic-index-gateway | Não | `8` |
| `DEBUG_MODE` | `debugMode` | ✓ orchestrator/ask-manual | Não | `false` |
| `UPSTREAM_KNOWLEDGE_GRAPH_DIR` | `backend.upstreamRepoDir` | ✓ checkout-backend (mantenedores) | Não | `../sbd-toe-knowledge-graph` |
| `BACKEND_CHECKOUT_FILE` | `backend.checkoutFile` | ✓ checkout-backend (mantenedores) | Não | `./data/upstream/backend-checkout.json` |
| `UPSTREAM_SOURCE` | `backend.upstreamSource` | ✓ checkout-backend (mantenedores) | Não | `local` |
| `SBD_TOE_APP_ROOT` | via `getAppRoot()` | ✓ index, gateway, checkout, prompt | Não | dinâmico (`import.meta.url`) |
| `DEFAULT_LANGUAGE` | `prompt.defaultLanguage` | ✗ **NÃO USADO** | — | `pt-PT` |
| `DOCS_HITS` | `backend.docsHits` | ✗ **NÃO USADO** | — | `8` |
| `ENTITIES_HITS` | `backend.entitiesHits` | ✗ **NÃO USADO** | — | `5` |
| `SAMPLING_MAX_TOKENS` | `prompt.samplingMaxTokens` | ✗ **NÃO USADO** | — | `1200` |
| `UPSTREAM_RELEASE_TAG` | `backend.upstreamReleaseTag` | ✗ **NÃO USADO** | — | `latest` |

**5 env vars definidas mas não usadas** (`DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`,
`SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`) → debt técnico.

Impacto na distribuição:
- Smithery yaml e docs devem documentar **apenas os 18 env vars funcionais**
- Os 5 não-usados são omitidos da documentação pública
- Remoção do código morto fica para epic separado (fora do scope desta epic — constraint "sem alterar src/")

Env vars relevantes para utilizador final (as que têm valor ajustar):
- `DEBUG_MODE` — activar logs de debug
- `MAX_CONTEXT_RECORDS` — número de resultados por query
- `SITE_BASE_URL` / `MANUAL_BASE_URL` / `CROSS_CHECK_BASE_URL` — para deploys custom
- `SBD_TOE_APP_ROOT` — para overridar o path do bundle (avançado)

Config mínima zero-config para qualquer cliente:
```json
{ "command": "npx", "args": ["-y", "sbd-toe-mcp"] }
```

---

## D3 — Nome do package npm

**Decisão: renomear para `sbd-toe-mcp`.**

Acções necessárias (em s12):
- `package.json`: `name`, `bin` key atualizada (`"sbd-toe-mcp": "./dist/index.js"`)
- `scripts/package-release-lib.mjs`: `PROJECT_NAME = "sbd-toe-mcp"`
- O executor deve verificar disponibilidade: `npm view sbd-toe-mcp` — se ocupado, reportar ao sync

---

## D4 — Nível 4 (Setup CLI interactivo)

**Decisão: descartado desta epic.**

Com zero env vars necessárias, o CLI setup adicionaria complexidade elevada (detecção de
clientes por OS, escrita em configs existentes, risco de corrupção) por um benefício marginal.
Pode ser retomado em epic futura com base em feedback de utilizadores reais.

---

## D5 — Smithery

**Decisão: incluir `smithery.yaml` (Nível 3) em s14.**

Smithery resolve descoberta + formulário guiado num só sítio.
Documentar apenas os env vars funcionais (18), não os 5 marcados como dead code.
O executor deve verificar o schema oficial: https://smithery.ai/docs/schema

---

## D6 — Sequência

```
s12 (npm-ready) → s13 (docs+examples) → s14 (smithery) → s15 (ci-publish)
```

- s12 é pré-requisito de todos os outros
- s13 e s14 são em teoria paralelos — sequenciais por simplicidade de gestão
- s15 requer s12 e preferencialmente s14 concluídos
