---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: governance-doc
reasoning: Roadmap generated to track AOS slices s1–s8 with explicit handoffs and test criteria
review_status: approved-by-sync
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

## Estado Final

**Epic F1–F7 COMPLETO.** Todos os 8 slices (s1–s7 + s4-tests) fechados com 168/168 testes, npm run check/build CLEAN, governança AI-Assisted implementada.

---

## Próximo Epic: F8–F10 — Guidance e Governance de Repositórios com SbD-ToE

| ID | Feature | Título | Dependências |
|----|---------|--------|--------------|
| s9 | F8  | Repo Guidance Tool — Guidance SbD-ToE adaptada a projecto | s5 |
| s10 | F9  | Review Scope Mapping — Path-based e MCP review scope | s9 |
| s11 | F10 | Repo Governance Planning — Baseline e checkpoints | s10 |

### Motivação

Durante a iteração com o Copilot e o MCP, surgiram 3 blocos de funcionalidade complementares:

1. **F8 — Repo Guidance Tool:** gerar guidance SbD-ToE adaptada ao contexto de um repositório (tech stack, risco, papel)
2. **F9 — Review Scope Mapping:** mapear, a partir de alterações (paths, diff), que capítulos SbD-ToE devem ser revistos
3. **F10 — Repo Governance Planning:** gerar planos de baseline e checkpoints de governação baseados em SbD-ToE

Estes 3 slices formam uma progressão coerente: guidance → review scope → governance planning.

### Dependências e Ordenação

- **s9** (F8) depende de s5 porque reúsa as tools estruturadas e os índices enriquecidos
- **s10** (F9) depende de s9 porque usa guidance como contexto de base
- **s11** (F10) depende de s10 porque usa review scope para priorizar controlos

### Fontes

- `docs/requests/sbd-repo-guidance-tool.md`
- `docs/requests/sbd-review-scope-tool.md`
- `docs/requests/assert_and_implement_devsecops_pratices.md`

---

### s9 — Repo Guidance Tool — Guidance SbD-ToE adaptada a projecto (F8)

**Objectivo:** implementar MCP tool que gera guidance SbD-ToE adaptada ao contexto de um repositório.

**Trabalho concreto:**

- Criar MCP tool `generate_sbd_toe_guidance` que aceita parâmetros de contexto do repositório:
  - `projectName` (string)
  - `repoRole` (enum: "mcp-server", "vscode-extension", "application", "library", "ci-orchestrator", "governance-tool")
  - `riskLevel` (enum: "L1", "L2", "L3") — derivado de E+D+I conforme Cap. 01
  - `runtimeModel` (enum: "stdio", "http-server", "containerized", "cli-tool", "library")
  - `techStack` (array: "node.js", "typescript", "python", "java", "go", etc.)
  - `distributionModel` (enum: "local-only", "github-release", "npm-registry", "docker-hub", "public-registry")
  - `hasCi` (boolean): CI/CD workflow existente
  - `hasReleaseWorkflow` (boolean): Release automation existente
  - `hasRuntime` (boolean): Runtime em produção (vs development-only)
  - `usesContainers` (boolean)
  - `usesIaC` (boolean)
  - `hasOperationalMonitoring` (boolean)

- Output estruturado:
  - `classification`: risco estimado, e=X d=X i=X conforme contexto
  - `chapterApplicability`: array de { chapterId, title, applicability, motivation }
  - `changeTriggers`: array de regras "se arquivo X mudar, consultar capítulo Y"
  - `expectedEvidence`: array de checkpoints esperados (testes, SAST, SBOM, etc.)
  - `likelyExceptions`: array de cap. que parecem aplicáveis mas podem ser excluídas com justificação formal
  - `copilotInstructionsOutline`: esboço de instruções Copilot para este projecto

- Validação de input:
  - `riskLevel`, `runtimeModel`, `repoRole`, `distributionModel` com allowlists
  - `techStack` com lista autorizada (e.g., Node, TypeScript, Python, Java)
  - `projectName` sanitizado (sem caracteres especiais, max 100 chars)
  - Rejeitar combinações impossíveis (e.g., "stdio" + "containerized")

- Integração com índices s5:
  - Reúsa `list_sbd_toe_chapters` para obter catálogo
  - Reúsa `query_sbd_toe_entities` para correlacionar temas e controlos
  - Reúsa `map_sbd_toe_applicability` para L1/L2/L3

- Sem side effects: ferramenta consultiva apenas, sem criar ficheiros ou editar workspace

**Ficheiros tocados:**
`src/index.ts`, novo módulo em `src/tools/generate-repo-guidance.ts`, possivelmente novo handler em `src/orchestrator/`

**Critérios de aceitação:**
- Tool aceita todos os 12 parâmetros com validação explícita
- Para 5 projectos de teste (e.g., MCP server L1, VSCode extension L2, app L3, library L1, CLI L2):
  - Gera guidance consistente e plausível
  - Chapters listados estão correctos conforme Cap. 01 e applicability rules
  - Change triggers cobrem pelo menos 8 padrões de ficheiro (src/*, src/config.ts, .github/workflows/*, etc.)
  - Expected evidence não está vazio
- `npm run check && npm run build` passam sem erros
- Sem `any` types, sem stdout poluído

**Referência:** `docs/requests/sbd-repo-guidance-tool.md` (linhas 1–200)

---

### s10 — Review Scope Mapping — Path-based e MCP review scope (F9)

**Objectivo:** implementar ferramenta que mapeia quais capítulos SbD-ToE devem ser revistos a partir das alterações em ficheiros (paths, diff).

**Trabalho concreto:**

- Criar MCP tool `map_sbd_toe_review_scope` que aceita:
  - `changedFiles`: array de paths (relativos ao raiz do repo)
  - `riskLevel` (enum: "L1", "L2", "L3")
  - `projectContext`: objeto { repoRole, runtimeModel, distributionModel, hasCi } (reutiliza contexto s9)
  - `diffSummary` (opcional, string): resumo de alto nível das alterações (para guidance adicional)

- Output estruturado:
  - `chaptersToReview`: array de { chapterId, title, reason, themes[], evidence[] }
  - `pathMapping`: tabela explícita: path glob → chapters (e.g., "src/** → Cap. 02, 06", ".github/workflows/** → Cap. 07, 10, 11")
  - `applicabilityReason`: breve explicação por que cada capítulo está marcado
  - `expectedEvidence`: checklist de evidência esperada (commits, tests, SAST resultado, etc.)
  - `nextSteps`: recomendações (e.g., "Run SAST on src/", "Check branch protection rules")

- Lógica de mapeamento (hardcoded, não configurável):
  - `src/**` → Cap. 02 (CFG), 06 (DEV), 10 (TEST se houver testes)
  - `src/config.ts` → Cap. 02 (CFG)
  - `.github/workflows/**` → Cap. 07 (CI/CD), 10 (TEST), 11 (DEPLOY se release)
  - `package.json`, `*-lock.json` → Cap. 05 (DEPS)
  - `release/`, `scripts/package-**` → Cap. 11 (DEPLOY)
  - `docs/**` aplicável a Cap. 14 (GOVERN) se disclosure relevante
  - Guardrail: se path é fora destes padrões, sugerir Cap. 01 + 02 como baseline

- Integração com s9 via `map_sbd_toe_applicability` (reúsa L1/L2/L3 lógica)

- Sem auto-execução: ferramenta de advisory apenas, não dispara CI ou altera repos

**Ficheiros tocados:**
`src/index.ts`, novo módulo em `src/tools/map-review-scope.ts`

**Critérios de aceitação:**
- Tool aceita `changedFiles` array, valida paths (sem path traversal attack)
- Para 5 cenários de teste (e.g., "apenas src/", "src + .github/workflows/", "package.json", etc.):
  - Retorna chapters correcamente aplicáveis
  - `pathMapping` cobre pelo menos 6 padrões de ficheiro
  - `nextSteps` é não-vazio e pertinente ao contexto
- `npm run check && npm run build` passam sem erros
- Sem `any`, sem mutations de input

**Referência:** `docs/requests/sbd-review-scope-tool.md` (linhas 1–200)

---

### s11 — Repo Governance Planning — Baseline e checkpoints (F10)

**Objectivo:** implementar ferramenta que gera planos de baseline governança e checkpoints de compliance baseados em SbD-ToE.

**Trabalho concreto:**

- Criar MCP tool `plan_sbd_toe_repo_governance` que aceita:
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

- Não toca em controles técnicos específicos de s1–s8, apenas governa o repositório em si (CI, release, monitoring, compliance)

**Ficheiros tocados:**
`src/index.ts`, novo módulo em `src/tools/plan-repo-governance.ts`

**Critérios de aceitação:**
- Tool aceita 4 parâmetros, valida enums
- Para 5 cenários (e.g., "MCP server L1 solo", "VSCode extension L2 team", "App L3 regulated", etc.):
  - Gera governance plan plausível e estruturado
  - `mandatoryControls` é não-vazio para L2/L3
  - `baselineCheckpoints` cobre pelo menos 4 fases progressivas
  - `evidenceChecklist` inclui pelo menos 8 items
  - GitHub-specific recommendations incluem branch protection, required checks, labels (em YAML format simples)
- `npm run check && npm run build` passam sem erros
- Sem `any`, sem mutations

**Referência:** `docs/requests/assert_and_implement_devsecops_pratices.md` (linhas 1–150, mais secção "GitHub Specificity")

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
| s9 | Repo Guidance Tool | not-started |
| s10 | Review Scope Mapping | not-started |
| s11 | Repo Governance Planning | not-started |
