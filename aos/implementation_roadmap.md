---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-25
purpose: governance-doc
reasoning: Roadmap updated with findings from two rounds of real Claude.ai iteration — s9/s10/s11 slice briefs revised to reflect actual usage patterns, confirmed gaps, and corrected understanding of tool state
review_status: pending-sync-review
---

# Implementation Roadmap

## Objetivo

Implementar o MCP v2 de forma incremental, sequencial e auditável. Cada slice é entregue e validado antes do seguinte ser iniciado. Sem paralelismo de execução.

## Sequência de Slices

| ID | Feature | Título | Dependências |
|----|---------|--------|--------------|
| s1 | F1a | Checkout dos índices enriquecidos | — |
| s2 | F1b | Gateway e tipos para campos enriquecidos | s1 |
| s3 | F6  | Scoring PT/EN com aliases_pt_en e intent_topics | s2 |
| s4-tests | Test | Suite de testes unitários (s1+s2+s3) | s3 |
| s4 | F4  | Tools estruturadas de consulta | s2 (executar após s3 estabilizado) |
| s5 | F5  | MCP Resources para enforcement a agentes | s4 |
| s6 | F2  | Checkout de snapshots via GitHub Releases | s5 |
| s7 | F3  | Bundle self-contained com índices enriquecidos | s1 + s6 |
| s8 | F7  | Governança de documentos AI-Assisted | s7 |
| s9 | F8  | AI Setup Foundation | s5 |
| s10 | F9  | generate_document + Review Scope Mapping | s9 |
| s11 | F10 | Repo Governance Planning | s10 |
| s12 | F11 | External Regulatory Overlay opt-in | s11 |

---

### s4-tests — Suite de testes unitários (Test)

**Objectivo:** Implementar testes unitários que cubram o código implementado em s1, s2 e s3 (~200 linhas novo código sem cobertura).

**Contexto:**

Código novo implementado:

**s1 — Checkout**
- `src/bootstrap/checkout-backend.ts`: cópia de ficheiros enriquecidos
- `src/config.ts`: novas chaves `docsEnrichedSnapshotFile`, `entitiesEnrichedSnapshotFile`
- `src/types.ts`: tipos para enriched snapshots
- Critério: npm run check && build limpos, ficheiros copiados

**s2 — Gateway**
- `src/backend/semantic-index-gateway.ts`: `buildEnrichedLookup()`, `tryReadSnapshotFile()`, fallback gracioso
- `src/types.ts`: interface `EnrichedFields`, 4 campos novos em `NormalizedRecord`
- Critério: campos chegam a RetrievalBundle, npm run check && build limpos

**s3 — Scoring**
- `src/backend/semantic-index-gateway.ts`: `expandQueryWithAliases()`, `classifyQueryIntent()`, `computeIntentScore()`
- Dicionário de 28 aliases PT/EN, 6 intents, reweighting de scoring
- Critério: 5 pares PT/EN validados, npm run check && build limpos

**Tarefas concretas:**

1. Setup vitest: package.json (+ vitest, @vitest/ui), vitest.config.ts, tsconfig para tipos vitest
2. `src/bootstrap/checkout-backend.test.ts` — testes para `sanitizeRunManifest()`, `ensurePublishedIndex()`, flow de checkout
3. `src/backend/semantic-index-gateway.test.ts` — testes para `buildEnrichedLookup()`, `tryReadSnapshotFile()`, `normalizeHit()`, `expandQueryWithAliases()`, `classifyQueryIntent()`, `computeIntentScore()`
4. `src/test-utils.ts` — mock snapshots, config, helpers
5. `npm run test` e `npm run test:coverage` scripts
6. Cobertura mínimo ≥70% (≥80% para semantic-index-gateway.ts)

**Critérios de aceitação:**
- `npm run test` passa (exit 0), cobertura ≥70%
- Testes cobrem todos os 6 casos principais (expandAliases, classifyIntent, computeScore, buildEnrichedLookup, normalizeHit, sanitizeRunManifest)
- npm run check && npm run build limpos
- Sem any nos testes, sem stdout poluído

**Ficheiros:**
- novo: vitest.config.ts, src/bootstrap/checkout-backend.test.ts, src/backend/semantic-index-gateway.test.ts, src/test-utils.ts
- modificar: package.json, tsconfig.json

---

## Definição de Cada Slice

### s1 — Checkout dos índices enriquecidos (F1a)

**Objectivo:** actualizar `src/bootstrap/checkout-backend.ts` para copiar também os ficheiros `_enriched` publicados pelo upstream.

**Trabalho concreto:**
- Adicionar cópia de `algolia_entities_records_enriched.json` e `algolia_docs_records_enriched.json` de `../sbd-toe-knowledge-graph/data/publish/` para `data/publish/`
- Actualizar `AppConfig` em `src/config.ts` e `.env.example` para referenciar os dois novos ficheiros (chaves: `ENTITIES_ENRICHED_SNAPSHOT_PATH`, `DOCS_ENRICHED_SNAPSHOT_PATH` ou equivalente seguindo a convenção existente)
- Actualizar o script `npm run checkout:backend` para incluir os novos ficheiros na cópia
- Actualizar `data/reports/run_manifest.json` para reflectir a proveniência dos enriquecidos
- `npm run check && npm run build` deve passar limpo

**Ficheiros tocados:**
`src/bootstrap/checkout-backend.ts`, `src/config.ts`, `.env.example`, `data/publish/` (novos ficheiros), `data/reports/run_manifest.json`

**Critérios de aceitação:**
- Após `npm run checkout:backend`, `data/publish/algolia_entities_records_enriched.json` e `data/publish/algolia_docs_records_enriched.json` existem e têm conteúdo válido (formato `{ items: [...] }`)
- `npm run check` e `npm run build` passam sem erros
- Nenhum campo enriquecido é consumido ainda pelo gateway (isso é s2)

---

### s2 — Gateway e tipos para campos enriquecidos (F1b)

**Objectivo:** actualizar `src/types.ts` e `src/backend/semantic-index-gateway.ts` para carregar e expor os campos enriquecidos (`aliases_pt_en`, `intent_topics`, `canonical_control_ids`, `artifact_ids`).

**Trabalho concreto:**
- Actualizar `SnapshotPayload` / tipos em `src/types.ts` para incluir os campos enriquecidos como opcionais
- Actualizar `semantic-index-gateway.ts` para carregar os snapshots `_enriched` em paralelo com os base (ou substituí-los como fonte primária, TBD no brief)
- Garantir que `RetrievalBundle` inclui os campos enriquecidos disponíveis para uso downstream
- Os campos novos devem ser `readonly` e tipados explicitamente (sem `any`)
- `npm run check && npm run build` deve passar limpo

**Ficheiros tocados:**
`src/types.ts`, `src/backend/semantic-index-gateway.ts`, possivelmente `src/config.ts`

**Critérios de aceitação:**
- `SnapshotPayload` e `RetrievalBundle` têm os campos enriquecidos com tipos explícitos
- O gateway carrega o snapshot enriquecido sem erros quando o ficheiro existe
- `npm run check` e `npm run build` passam sem erros

---

### s3 — Scoring PT/EN com aliases_pt_en e intent_topics (F6)

**Objectivo:** usar os campos `aliases_pt_en` e `intent_topics` no scoring local para melhorar a cobertura de queries em português.

**Trabalho concreto:**
- Actualizar a lógica de scoring em `semantic-index-gateway.ts` (ou módulo de scoring separado) para:
  - expandir matches usando `aliases_pt_en` (match em PT mapeia para entidade EN e vice-versa)
  - aplicar boost por `intent_topics` relevantes à query
  - usar `authority_level` para priorizar conteúdo canónico
  - penalizar conteúdo `demo`/`training` em perguntas de guidance operacional
- Adicionar suporte de debug: quando activo, expõe query original, expansões activas, intenção inferida e efeitos no score
- Documentar com 5 pares de perguntas PT/EN semanticamente equivalentes para validação manual

**Ficheiros tocados:**
`src/backend/semantic-index-gateway.ts`, possivelmente novo módulo em `src/backend/scoring.ts`

**Critérios de aceitação:**
- 5 pares PT/EN testados manualmente retornam resultados consistentes
- Modo debug expõe expansões e boosts aplicados
- `npm run check && npm run build` passam sem erros

**Referência:** `docs/requests/mcp-retrieval-intent-normalization.md`

---

### s4 — Tools estruturadas de consulta (F4)

**Objectivo:** implementar as 4 tools MCP prioritárias para navegação estruturada sobre o manual SbD-ToE.

**Trabalho concreto:**
- `list_sbd_toe_chapters` — lista capítulos com id, título e aplicabilidade (metadados já existem nos índices)
- `query_sbd_toe_entities` — consulta entidades por tipo, capítulo, risco ou fase; usa `canonical_control_ids` e `artifact_ids`
- `get_sbd_toe_chapter_brief` — resumo operacional de um capítulo (papel, fases, artefactos); usa `intent_topics`
- `map_sbd_toe_applicability` — mapeamento de aplicabilidade por nível de risco L1/L2/L3; usa `risk_levels`, `related_roles`, `related_phases`
- Registar as tools em `src/index.ts` seguindo o padrão existente
- Validar todos os inputs antes de uso (allowlists, faixas explícitas — Cap. 06 `VAL-*`)
- Sem tools de shell/exec, sem edição do workspace

**Ficheiros tocados:**
`src/index.ts`, novos módulos em `src/orchestrator/` ou `src/tools/`

**Critérios de aceitação:**
- As 4 tools respondem a inputs válidos com output estruturado
- Inputs inválidos são rejeitados com erro JSON-RPC correcto (`-32602`)
- `npm run check && npm run build` passam sem erros

**Referência:** `docs/requests/mcp-structured-tools.md`

---

### s5 — MCP Resources para enforcement a agentes (F5)

**Objectivo:** expor resources MCP e um prompt nomeado que permitem a um agente auto-configurar-se com as prescrições SbD-ToE.

**Trabalho concreto:**
- Resource `sbd_toe_skill_template`: dado `riskLevel` e `projectRole`, devolve template Markdown de skill/instructions
- Resource `sbd_toe_chapter_applicability`: dado `riskLevel`, devolve capítulos activos, condicionais e excluídos
- Prompt MCP `setup_sbd_toe_agent`: slash command que devolve instruções de configuração SbD-ToE para o contexto do agente
- Registar resources e prompts no servidor em `src/index.ts`
- Validar parâmetros de input (`riskLevel`: allowlist `L1|L2|L3`)

**Ficheiros tocados:**
`src/index.ts`, novos módulos em `src/resources/` ou equivalente

**Critérios de aceitação:**
- Resource `sbd_toe_skill_template` responde para `L1`, `L2`, `L3`
- Resource `sbd_toe_chapter_applicability` lista correctamente os capítulos aplicáveis por nível
- Prompt `setup_sbd_toe_agent` é invocável como slash command
- `npm run check && npm run build` passam sem erros

**Referência:** `docs/requests/sbd-repo-guidance-tool.md`, `docs/requests/ai-assisted-authoring-guidance.md`

---

### s6 — Checkout de snapshots via GitHub Releases (F2)

**Objectivo:** o `npm run checkout:backend` deve poder consumir a release publicada do `sbd-toe-knowledge-graph` no GitHub, além da cópia local.

**Trabalho concreto:**
- Adicionar modo `UPSTREAM_SOURCE=local|release` em `src/config.ts` e `.env.example`
- No modo `release`: descarregar o asset de bundle da release mais recente (ou tag específica via `UPSTREAM_RELEASE_TAG`) via `https://api.github.com/repos/...`
- Validar integridade com sha256 se o upstream publicar checksum
- Aplicar timeout (máx. 60s) e tamanho máximo aceitável no download
- Validar que a origem é apenas o repositório upstream autorizado (hardcoded, não configurável externamente)
- Modo `local` continua a ser o default para desenvolvimento
- `npm run check && npm run build` deve passar limpo

**Ficheiros tocados:**
`src/bootstrap/checkout-backend.ts`, `src/config.ts`, `.env.example`

**Critérios de aceitação:**
- `UPSTREAM_SOURCE=release npm run checkout:backend` descarrega e instala snapshots correctamente
- URLs de origem são validadas; inputs externos não controlam a URL de download
- Timeout e tamanho máximo são aplicados
- `npm run check && npm run build` passam sem erros

---

### s7 — Bundle self-contained com índices enriquecidos (F3)

**Objectivo:** o artefacto de release (bundle) do MCP deve incluir os snapshots `_enriched` como ficheiros primários e reflectir correctamente a proveniência.

**Trabalho concreto:**
- Actualizar `scripts/package-release.mjs` para incluir `algolia_entities_records_enriched.json` e `algolia_docs_records_enriched.json` no bundle
- Verificar que `data/reports/run_manifest.json` inclui `run_id` e proveniência dos enriquecidos
- Actualizar `release/` com o novo bundle e respectivo sha256
- Tamanho estimado do bundle: ~30 MB (aceitável por esta iteração)
- Verificar que o bundle é auto-suficiente: sem dependência de rede ou cópia local em runtime

**Ficheiros tocados:**
`scripts/package-release.mjs`, `data/publish/`, `data/reports/run_manifest.json`, `release/`

**Critérios de aceitação:**
- Bundle contém os snapshots enriquecidos e compila sem erros
- `npm run check && npm run build` passam sem erros
- sha256 gerado e disponível no `release/`

---

### s8 — Governança de documentos AI-Assisted (F7)

**Objectivo:** implementar formato de disclosure obrigatório para documentos criados com assistência de IA e validação em CI.

**Trabalho concreto:**
- Definir formato de disclosure (bloco YAML frontmatter ou secção padronizada) para ficheiros Markdown gerados ou revistos com IA
- Script de validação que verifica presença do disclosure em ficheiros marcados
- Integração no CI (`npm run check` ou workflow próprio)
- PR template actualizado com checkbox de confirmação de revisão humana
- Aplicar retroactivamente aos artefactos AOS e docs gerados neste epic

**Ficheiros tocados:**
`.github/workflows/`, `.github/PULL_REQUEST_TEMPLATE.md`, `scripts/`, documentos relevantes em `docs/` e `aos/`

**Critérios de aceitação:**
- CI rejeita docs marcados como AI-assisted sem disclosure válido
- PR template inclui checkbox de revisão humana
- `npm run check` passa limpo

**Referência:** `docs/requests/ai-assisted-doc-disclosure-validation.md`

---

## Notas de Ordenação

- **s1** é o desbloqueador principal: sem os `_enriched` no `data/publish/`, nada do downstream é possível.
- **s2** expõe os novos campos ao gateway e aos tipos TypeScript — desbloqueador de s3 e s4.
- **s3** antes de s4: scoring PT/EN estável garante que as tools estruturadas retornam resultados correctos.
- **s4** antes de s5: F5 (resources) reutiliza as tools de F4.
- **s6** (F2 — GitHub Releases) é inserido após s5 para que s7 (bundle) possa integrar ambos os modos de checkout num único artefacto.
- **s8** (F7 — AI governance): independente de tudo, fecha o epic com governança transversal.
- **s9** (F8) arranca o próximo epic com melhorias em tools existentes, SKILL.md e resources de setup, sem exigir nova arquitectura.
- **s10** (F9) depende de s9 porque reutiliza a categorização de bundles, os títulos legíveis e o setup foundation.
- **s11** (F10) depende de s10 porque a baseline de governance deve ser coerente com os templates e o review scope introduzidos antes.
- **s12** (F11) depende de s11 porque o overlay externo deve restringir um universo normativo já estável, não substituir a ontologia nem reabrir decisões do runtime base.

## Estado dos Slices

| Slice | Título | Status |
|-------|--------|--------|
| s1 | Checkout dos índices enriquecidos | closed |
| s2 | Gateway e tipos para campos enriquecidos | closed |
| s3 | Scoring PT/EN | closed |
| s4-tests | Suite de testes unitários | closed |
| s4 | Tools estruturadas de consulta | closed |
| s5 | MCP Resources para enforcement | closed |
| s6 | Checkout via GitHub Releases | closed |
| s7 | Bundle self-contained | closed |
| s8 | Governança AI-Assisted | closed |
| s9 | AI Setup Foundation | not-started |
| s10 | generate_document + Review Scope Mapping | not-started |
| s11 | Repo Governance Planning | not-started |
| s12 | External Regulatory Overlay opt-in | not-started |

## Estado Atual

**Epic F1–F7 COMPLETO.** Todos os 9 slices do primeiro epic (s1–s8 + s4-tests) estão fechados com 168/168 testes, `npm run check`/`npm run build` limpos e governança AI-Assisted implementada.

**Epic F8–F10 PLANEADO.** Os slices s9–s11 já fazem parte da sequência global do roadmap, mas continuam `not-started` até criação formal de brief no AOS.

**F11 EM BACKLOG CONTROLADO.** O slice s12 fica reservado para integração de overlays externos/regulatórios em modo opt-in, sem alterar o path normal do MCP.

---

## Próximo Epic: F8–F10 — Guidance e Governance de Repositórios com SbD-ToE

| ID | Feature | Título | Dependências |
|----|---------|--------|--------------|
| s9 | F8  | AI Setup Foundation — SKILL.md, expansão map_sbd_toe_applicability, fallback sampling, títulos, index compacto | s5 |
| s10 | F9  | generate_document tool + Review Scope Mapping | s9 |
| s11 | F10 | Repo Governance Planning — baseline e checkpoints | s10 |

### Nota de backlog futuro

Após s11, o roadmap pode abrir **s12 — F11 External Regulatory Overlay opt-in** para leituras como `DORA`, `NIS2`, `CRA` e `RGPD`, mas com guardrails explícitos:

- ativação só quando o utilizador pedir enquadramento externo/regulatório
- ordem de carga obrigatória:
  `ontology -> deterministic manifest -> runtime bundle -> framework_overlay_index -> overlay mappings/playbooks`
- entrypoint preferido:
  `data/publish/overlay/framework_overlay_index.json`
- o overlay restringe o universo dos perfis normais (`consult`, `guide`, `review`, `threats`) via `target_*`; não substitui a ontologia nem o runtime bundle
- `overlay_mappings.jsonl` e `overlay_playbooks.json` servem só para grounding/explanation
- weighting distinto:
  `external_normative_overlay` para playbooks curados e `illustrative_overlay` para `exemplo-playbook`
- critérios mínimos de validação:
  1. o overlay não é consultado no path por defeito
  2. existe pelo menos um cenário qualitativo dedicado por framework externo
  3. o engine não activa requisitos apenas a partir de texto de playbook

### Motivação

Baseado em duas iterações reais com Claude.ai (Março 2026), os gaps mais impactantes identificados foram, por ordem de impacto:

1. **F8 — AI Setup Foundation:** ausência de SKILL.md causa chamadas exploratórias desnecessárias (30–40% do total); `map_sbd_toe_applicability` existe e retorna capítulos por risco mas não aceita contexto de projecto nem devolve categorias de bundles com reasoning; `answer_sbd_toe_manual` falha em todos os pedidos no Claude.ai por ausência de fallback quando sampling não está disponível; `list_sbd_toe_chapters` devolve título idêntico ao ID; o index compacto elimina a fase de descoberta
2. **F9 — generate_document + Review Scope:** o padrão observado repetidamente (pesquisa → inferência → geração de artefacto) exigiu 3–5 chamadas por sessão; uma tool que receba tipo de documento, risco e contexto e devolva o template pré-populado automatiza o caso de uso mais frequente; mapeamento de paths a bundles é complementar
3. **F10 — Governance Planning:** governance baseline e checkpoints são o deliverable de s11; `compare_to_framework` foi identificada como desejável mas está bloqueada por ausência de dados de rastreabilidade auditados na fonte (`002-cross-check-normativo`) — será considerada em epic futuro após validação da matriz upstream

Estes 3 slices formam uma progressão coerente: foundation de uso → automação de padrões → posicionamento no ecossistema.

### Dependências e Ordenação

- **s9** (F8) depende de s5 porque reúsa as tools estruturadas e os índices enriquecidos
- **s10** (F9) depende de s9 porque usa guidance como contexto de base
- **s11** (F10) depende de s10 porque usa review scope para priorizar controlos

### Fontes

- `docs/requests/sbd-repo-guidance-tool.md`
- `docs/requests/sbd-review-scope-tool.md`
- `docs/requests/assert_and_implement_devsecops_pratices.md`
- `docs/claude-mcp-feedback-analysis.md` (análise consolidada 1ª iteração)
- `docs/claude-feedback-implementation-plan.md` (plano derivado 1ª iteração)
- Relatório de 2ª iteração Claude.ai — 25 Mar 2026 (incorporado neste documento)

---

### s9 — AI Setup Foundation (F8)

**Objectivo:** corrigir os gaps de usabilidade confirmados em duas iterações reais com Claude.ai — todos incidem em tools existentes ou ficheiros ausentes, sem necessidade de nova arquitectura.

**Trabalho concreto:**

**9.1 — SKILL.md**
- Criar `.github/skills/sbd-toe-skill/SKILL.md`
- Conteúdo obrigatório: workflow recomendado por tipo de pergunta, mapeamento domínio → bundle (9+ domínios), convenções canónicas (`ART-*`, `CTRL-*`, níveis L1/L2/L3), quando não usar
- Não exige alterações ao código

**9.2 — `map_sbd_toe_applicability` — expandir input e output**
- A tool existe e funciona com `riskLevel` simples; aceitar adicionalmente campos opcionais: `technologies` (array, allowlist), `hasPersonalData` (boolean), `isPublicFacing` (boolean), `projectRole` (enum, opcional)
- Expandir output de `{active, conditional, excluded}` para `{activatedBundles: {foundationBundles, domainBundles, operationalBundles}}`, cada bundle com `{chapterId, status, reason}`; manter retro-compatibilidade — campos actuais continuam presentes
- Tratar cada capítulo como knowledge bundle autónomo; a categorização (foundation/domain/operational) é atribuída por lógica interna, não hierarquia fixa
- Validar inputs com allowlists; rejeitar combinações inválidas com `-32602`

**9.3 — `answer_sbd_toe_manual` — fallback gracioso quando sem sampling**
- Actualmente lança `Error("O cliente MCP atual não declarou suporte para sampling.")` que chega ao utilizador como erro
- Quando `clientCapabilities.sampling` não está declarado: devolver resultado de `search_sbd_toe_manual` (top-3) com campo extra `"sampling_unavailable": true` e nota explicativa
- Zero impacto em clientes que suportam sampling

**9.4 — `list_sbd_toe_chapters` — títulos legíveis**
- Actualmente `"title"` é idêntico ao ID (e.g. `"07-cicd-seguro"`)
- Adicionar campo `"readableTitle"` com nome em português (e.g. `"CI/CD Seguro"`, `"Containers e Execução Isolada"`)
- Tabela de mapeamento id → readableTitle definida no handler

**9.5 — Resource `sbd://toe/index-compact`**
- Criar resource MCP com tabela ~80 linhas: `{chapterId, readableTitle, domains, technologies, minLevel}`
- Tamanho alvo: <5KB — injectável em system prompt ou context window inicial
- Elimina fase de descoberta exploratória; Claude vê superfície completa do manual

**Ficheiros tocados:**
- novo: `.github/skills/sbd-toe-skill/SKILL.md`
- modificar: `src/index.ts` (registar resource index-compact, expandir input schema de `map_sbd_toe_applicability`)
- modificar: `src/tools/structured-tools.ts` (lógica `handleMapSbdToeApplicability`, `handleListSbdToeChapters`)
- modificar: `src/orchestrator/ask-manual.ts` (sampling fallback)
- novo: `data/publish/sbd-toe-index-compact.json`
- modificar: testes em `src/tools/structured-tools.test.ts` (novos casos para expanded input/output)

**Critérios de aceitação:**
- SKILL.md: markdown válido, workflow por tipo de pergunta, 9+ domínios mapeados, exemplos ponta-a-ponta
- `map_sbd_toe_applicability`: aceita `{riskLevel, technologies?, hasPersonalData?, isPublicFacing?, projectRole?}`; 5 perfis de projecto devolvem `activatedBundles` plausíveis com `status` e `reason`; output retro-compatível com tests existentes
- `answer_sbd_toe_manual`: quando sampling ausente, retorna retrieval top-3 + `sampling_unavailable: true`; não lança erro para o utilizador final
- `list_sbd_toe_chapters`: campo `readableTitle` presente e distinto do ID em todos os capítulos
- Resource `sbd://toe/index-compact`: disponível via `resources/list` e `resources/read`, <5KB, campos `chapterId`, `readableTitle`, `domains`, `technologies`, `minLevel` presentes em todos os registos
- `npm run check && npm run build` limpos; `npm run test` passa
- Sem `any`; sem stdout poluído

**Referências:**
- `docs/claude-mcp-feedback-analysis.md`
- `docs/sbd-toe-applicability.md` (regras de aplicabilidade L1/L2/L3 e catálogo T01–T20)

---

### s10 — generate_document tool + Review Scope Mapping (F9)

**Objectivo:** implementar a tool `generate_document` que automatiza o padrão de uso mais frequente observado (pesquisa → inferência → artefacto), e a tool `map_sbd_toe_review_scope` para mapeamento de paths a bundles a rever.

**10.1 — `generate_document`**

O padrão observado nas sessões: pesquisa no manual → inferência → geração de artefacto. Aconteceu 3+ vezes por sessão (script de hardening, secure logger, templates de documentos), cada vez com 3–5 chamadas MCP. Uma tool dedicada fornece a estrutura; o LLM gera o conteúdo.

**Princípio de design:** o MCP fornece o esqueleto — secções obrigatórias, campos requeridos, critérios de aceitação por nível de risco. O LLM recebe esse esqueleto como grounding e preenche o conteúdo. A ferramenta não gera conteúdo substantivo nem pre-popula campos; a "criatividade" fica do lado do modelo de linguagem.

- Aceitar: `{type: "classification-template" | "threat-model-template" | "checklist" | "training-plan" | "secure-config", riskLevel: "L1" | "L2" | "L3", context: object (opcional)}`
- Devolver estrutura do documento para o nível: secções obrigatórias, campos requeridos (marcados como mandatory/conditional/optional), critérios de aceitação, e referências aos bundles SbD-ToE relevantes — sem conteúdo inventado
- Formato de saída: JSON com `{documentType, riskLevel, sections: [{name, mandatory, fields: [{name, required, guidance}]}, ...], acceptanceCriteria[], relevantBundles[]}`
- O LLM usa esta estrutura como grounding para gerar o documento real; o MCP não substitui essa geração
- Validar `type` e `riskLevel` com allowlists; `context` sanitizado; sem side effects

**Ficheiros tocados (10.1):**
`src/index.ts`, novo módulo `src/tools/generate-document.ts`, definições de estrutura em `src/tools/document-schemas/`

**Critérios de aceitação (10.1):**
- 5 tipos suportados, cada um com estrutura distinta para L1/L2/L3
- Output contém `sections`, `acceptanceCriteria` e `relevantBundles` — sem conteúdo pré-preenchido
- `mandatory` vs `conditional` vs `optional` está correcto por nível de risco
- npm run check limpo, sem `any`

---

**10.2 — `map_sbd_toe_review_scope` (review scope)**

**Objectivo:** mapear quais knowledge bundles SbD-ToE devem ser revistos a partir de alterações em ficheiros (paths, diff).

**Trabalho concreto:**

- Criar MCP tool `map_sbd_toe_review_scope` — aceita:
  - `changedFiles`: array de paths (relativos ao raiz do repo)
  - `riskLevel` (enum: "L1", "L2", "L3")
  - `projectContext`: objeto { repoRole, runtimeModel, distributionModel, hasCi } (reutiliza contexto s9)
  - `diffSummary` (opcional, string): resumo de alto nível das alterações (para guidance adicional)

- Output estruturado:
  - `bundlesToReview`: array de `{ chapterId, readableTitle, category: "foundation"|"domain"|"operational", reason, expectedEvidence[] }` — usa terminologia de bundles de s9
  - `pathMapping`: tabela explícita path glob → bundles
  - `nextSteps`: recomendações accionáveis por path

- Lógica de mapeamento path → bundles (não configurável externamente):
  - `src/**` → bundles: 02-requisitos-seguranca (foundation), 06-desenvolvimento-seguro (domain), 10-testes-seguranca (domain)
  - `src/config.ts` → bundle: 02-requisitos-seguranca
  - `.github/workflows/**` → bundles: 07-cicd-seguro, 10-testes-seguranca, 11-deploy-seguro
  - `package.json`, `*-lock.json` → bundle: 05-dependencias-sbom-sca
  - `release/`, `scripts/package-**` → bundle: 11-deploy-seguro
  - `docs/**` → bundle: 14-governanca-contratacao (se disclosure relevante)
  - Guardrail: path não mapeado → sugerir bundles foundation: 01-classificacao, 02-requisitos

- Integração com s9: usa `readableTitle` de `list_sbd_toe_chapters` e categorização de `map_sbd_toe_applicability`
- Sem auto-execução: ferramenta de advisory apenas

**Ficheiros tocados (10.2):**
`src/index.ts`, novo módulo `src/tools/map-review-scope.ts`

**Critérios de aceitação (s10 completo):**
- `generate_document`: 5 tipos suportados; output para cada tipo contém `sections`, `acceptanceCriteria` e `relevantBundles`; L1/L2/L3 produzem estruturas distintas (diferentes campos mandatory/conditional); **sem conteúdo pré-gerado** — a estrutura é sempre esqueleto, não documento preenchido; npm run check limpo
- `map_sbd_toe_review_scope`: valida paths (sem path traversal — `-32602` em paths com `..`), 5 cenários de teste cobrem outputs plausíveis, `bundlesToReview` usa nomenclatura de bundles de s9, `pathMapping` cobre 6+ padrões
- `npm run check && npm run build` limpos; `npm run test` passa; sem `any`, sem mutations

**Referências:**
- `docs/requests/sbd-repo-guidance-tool.md`
- `docs/requests/sbd-review-scope-tool.md`

---

### s11 — Repo Governance Planning (F10)

**Objectivo:** implementar `plan_sbd_toe_repo_governance` — baseline de controlos e checkpoints de compliance para um repositório, baseado nos bundles SbD-ToE e no risco declarado.

> **Nota — `compare_to_framework` não entra neste slice.** A tool foi identificada como desejável em sessões Claude.ai mas requer dados de rastreabilidade auditados no capítulo `002-cross-check-normativo`, que ainda não estão validados. Implementar a tool sobre dados não auditados produziria mapeamentos incoerentes e falsa confiança. Será considerada em epic futuro após validação da matriz upstream no `sbd-toe-knowledge-graph`.

**Trabalho concreto:**

- Criar MCP tool `plan_sbd_toe_repo_governance` — aceita:
  - `repoType` (enum: "mcp-server", "vscode-extension", "application", "library", "ci-orchestrator", "governance-tool")
  - `platform` (enum: "github", "gitlab") — contexto de platform específico
  - `riskLevel` (enum: "L1", "L2", "L3") — derivado de s9 ou input directo
  - `organizationContext` (object): { solo/team/regulated, team_size, enforcement_level }

- Output estruturado:
  - `applicableControls`: array de { controlId, title, chapter, domain, mandatory, recommended, evidence }
  - `mandatoryControls`: subset de `applicableControls` que DEVEM estar implementados por lei/política
  - `recommendedControls`: subset que está recomendado mas opcional
  - `baselineCheckpoints`: array de fases (e.g., "Setup CI", "Add SAST", "Configure branch protection", etc.)
  - `evidenceChecklist`: o que deve estar presente no repositório (testes, SBOM, GitHub settings, etc.)
  - `gaps`: array de { control, reason, remediation_effort }
  - `platforms_specific`: (só GitHub por agora) recomendações para Protections, Required checks, Labels, Security features

- Sem auto-execução: tool devolve plano em JSON/YAML para o utilizador editar e aplicar manualmente

- Integração com Cap. 02 base requirements, domínios T01–T20 conforme risco

- Não toca em controlos técnicos específicos de s1–s8; governa o repositório em si (CI, release, monitoring, compliance)

**Ficheiros tocados:**
`src/index.ts`, novo módulo `src/tools/plan-repo-governance.ts`

**Critérios de aceitação (s11):**
- `plan_sbd_toe_repo_governance`: aceita 4 parâmetros, valida enums; 5 cenários produzem planos plausíveis; `mandatoryControls` não vazio para L2/L3; `baselineCheckpoints` ≥ 4 fases; `evidenceChecklist` ≥ 8 items; GitHub-specific recommendations em YAML simples
- `npm run check && npm run build` limpos; `npm run test` passa; sem `any`, sem mutations

**Referências:**
- `docs/requests/assert_and_implement_devsecops_pratices.md`
- `docs/requests/knowledge-graph-index-enhancements.md`

---

## Estado dos Slices — Epic F1–F7

| Slice | Título | Status | Cycles |
|-------|--------|--------|--------|
| s1 | Checkout dos índices enriquecidos | closed | 0 |
| s2 | Gateway e tipos para campos enriquecidos | closed | 0 |
| s3 | Scoring PT/EN | closed | 0 |
| s4-tests | Suite de testes unitários | closed | 2 |
| s4 | Tools estruturadas de consulta | closed | 0 |
| s5 | MCP Resources para enforcement | closed | 0 |
| s6 | Checkout via GitHub Releases | closed | 1 |
| s7 | Bundle self-contained | closed | 0 |
| s8 | Governança AI-Assisted | closed | 0 |

---

## Estado dos Slices — Epic F8–F10 (READY FOR PLANNING)

| Slice | Título | Status |
|--------|--------|--------|
| s9 | AI Setup Foundation | not-started |
| s10 | generate_document + Review Scope Mapping | not-started |
| s11 | Repo Governance Planning | not-started |
