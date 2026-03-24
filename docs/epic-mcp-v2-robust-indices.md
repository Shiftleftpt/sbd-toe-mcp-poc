# EPIC: MCP v2 — Índices Enriquecidos, Tools Robustas e Enforcement a Agentes

**Branch:** `epic/mcp-v2-robust-indices`
**Baseline:** `v0.1.0-frozen` (run_id: `20260314T191251Z`)
**Estado:** em planeamento

---

## Motivação

A v0.1.0 estabeleceu uma base funcional: retrieval local grounded, servidor MCP stdio, tools básicas de consulta, bundle self-contained. Mas expôs vários limites claros:

- os índices embutidos eram o formato "plano" anterior — o upstream passou a publicar índices enriquecidos com campos novos (`aliases_pt_en`, `intent_topics`, `canonical_control_ids`, `artifact_ids`) que têm impacto direto no retrieval e nas tools
- o mecanismo de atualização de snapshots depende de uma cópia local do `sbd-toe-knowledge-graph`, em vez de consumir a fonte publicada (GitHub Releases)
- não existem tools estruturadas — tudo é pergunta livre
- o MCP não ajuda os agentes a configurar-se: não expõe skills, subagents, nem prompts de enforcement
- a injeção das prescrições SbD-ToE no trabalho dos agentes é indireta e depende de prompting manual

Este epic resolve esses limites de forma incremental e sem quebrar o papel arquitetural do repositório.

---

## Objetivos

1. **Índices enriquecidos embutidos** — integrar os ficheiros `_enriched` publicados pelo upstream como fonte primária do retrieval
2. **Atualização de snapshots via GitHub Releases** — o `checkout:backend` deve poder consumir a release publicada do `sbd-toe-knowledge-graph`, não apenas uma cópia local
3. **Bundle self-contained** — manter o artefacto de release completo e autónomo (inclui snapshots embutidos), mesmo que o tamanho aumente
4. **Tools estruturadas** — implementar tools MCP para navegação operacional por capítulo, entidade, risco e aplicabilidade
5. **Enforcement a agentes** — expor resources MCP (prompts, skills, subagents) que permitam ao agente configurar-se com as prescrições SbD-ToE, sem depender apenas de retrieval livre

---

## Feature Areas

### F1 — Integração dos Índices Enriquecidos

**Estado:** a iniciar
**Upstream:** `sbd-toe-knowledge-graph` publica `algolia_entities_records_enriched.json` e `algolia_docs_records_enriched.json`

Campos novos confirmados nos `_enriched`:

| Índice | Campos adicionais |
|---|---|
| entities enriched | `aliases_pt_en`, `intent_topics`, `canonical_control_ids`, `artifact_ids` |
| docs enriched | (a confirmar na primeira iteração do branch) |

Trabalho necessário:

- atualizar `checkout-backend.ts` para copiar também os `_enriched`
- adicionar configuração em `AppConfig` / `.env.example` para os novos ficheiros
- atualizar `SnapshotPayload` e `semantic-index-gateway.ts` para consumir os campos novos
- usar `aliases_pt_en` e `intent_topics` no scoring local (resolve gaps PT/EN documentados em `mcp-retrieval-intent-normalization.md`)
- usar `canonical_control_ids` e `artifact_ids` em tools estruturadas
- substituir snapshots embutidos em `data/publish/` pelos `_enriched` como fonte primária

Referência: `docs/requests/mcp-retrieval-intent-normalization.md`

---

### F2 — Atualização de Snapshots via GitHub Releases

**Estado:** a iniciar

Atualmente o `npm run checkout:backend` copia ficheiros de uma cópia local do `sbd-toe-knowledge-graph`. Se essa cópia não estiver atualizada, copia dados antigos.

Objetivo:

- `checkout:backend` deve conseguir consumir a release publicada do `sbd-toe-knowledge-graph` no GitHub
- mecanismo: descarregar o asset de bundle da release mais recente (ou de uma tag específica) via `https://api.github.com/repos/...` ou `https://github.com/.../releases`
- deve suportar os dois modos: local (como agora) e remoto (via release)
- modo configurável via `.env`: `UPSTREAM_SOURCE=local|release`
- deve validar integridade (sha256) se o upstream publicar o ficheiro de checksum
- a cópia local continua a ser o default para desenvolvimento; o modo release é o default recomendado para mantenedores a fazer refresh antes de uma nova release do MCP

Notas de segurança:

- validar origem das releases (apenas do repositório upstream autorizado)
- não aceitar URLs arbitrárias via input externo
- aplicar timeout e tamanho máximo aceitável no download

---

### F3 — Bundle Self-Contained com Snapshots Enriquecidos

**Estado:** dependente de F1 e F2

O bundle de release (GitHub Releases deste repositório) mantém o modelo atual:

- inclui `dist/`, `data/publish/`, `data/reports/run_manifest.json`, prompts, exemplos e docs
- não depende de Algolia, de rede externa em runtime, nem do builder semântico
- o utilizador extrai o bundle e usa diretamente

Com F1 e F2:

- `data/publish/` passa a incluir os `_enriched` como ficheiros primários
- o tamanho do bundle vai crescer (de ~13 MB para ~30 MB estimado): aceitável por agora
- `data/reports/run_manifest.json` deve reflectir a proveniência correta do snapshot enriquecido
- actualizar `scripts/package-release.mjs` se necessário

---

### F4 — Tools Estruturadas de Consulta

**Estado:** a iniciar
**Referência:** `docs/requests/mcp-structured-tools.md`

Tools prioritárias para esta iteração:

| Tool | Descrição | Viabilidade |
|---|---|---|
| `list_sbd_toe_chapters` | lista capítulos com id, título e aplicabilidade | imediata — metadados já existem |
| `query_sbd_toe_entities` | consulta entidades por tipo, capítulo, risco ou fase | imediata com índice enriquecido |
| `get_sbd_toe_chapter_brief` | resumo operacional de um capítulo (papel, fases, artefactos) | imediata com índice enriquecido |
| `map_sbd_toe_applicability` | mapeamento de aplicabilidade por nível de risco L1/L2/L3 | imediata com `risk_levels`, `related_roles`, `related_phases` |
| `map_sbd_toe_review_scope` | dado um conjunto de paths alterados, mapeia capítulos e evidências a rever | iteração seguinte |
| `draft_sbd_toe_repo_guidance` | gera base de guidance adaptada a um repositório concreto | iteração seguinte |

Restrições que se mantêm:

- sem tools de shell/exec
- sem edição do workspace pelo MCP
- sem deslocação de responsabilidades para o `sbd-toe-knowledge-graph`

---

### F5 — MCP Resources para Enforcement a Agentes

**Estado:** a iniciar (novo tema, não documentado em requests anteriores)

O MCP Protocol suporta `resources` — conteúdo estático ou dinâmico que o cliente pode ler antes ou durante uma conversa. Também suporta `prompts` com nome que podem ser invocados como slash commands.

Objetivo deste feature area: usar estas capacidades para que um agente (Copilot, Claude, etc.) possa auto-configurar-se com as prescrições SbD-ToE, em vez de depender apenas de prompting manual.

#### F5.1 — Resource: `sbd_toe_skill_template`

Expõe um template de skill/instructions reutilizável que um agente pode ler e aplicar ao seu `copilot-instructions.md` ou equivalente.

Output: documento Markdown estruturado com:
- papel do agente no contexto SbD-ToE
- ordem de consulta de capítulos
- regras de não-inventar, citar provenance, pedir sampling
- tabela de triggers por contexto de alteração

Parâmetros de input:
- `riskLevel`: `L1 | L2 | L3`
- `projectRole`: string (e.g. `mcp-wrapper`, `api-backend`, `ci-pipeline`)

#### F5.2 — Resource: `sbd_toe_chapter_applicability`

Expõe, para um nível de risco, os capítulos activos, condicionais e excluídos com razão.

Parâmetros de input:
- `riskLevel`: `L1 | L2 | L3`

#### F5.3 — Prompt MCP: `setup_sbd_toe_agent`

Prompt (slash command) que o agente invoca para receber as instruções de configuração SbD-ToE adequadas ao seu contexto, incluindo:
- qual skill usar
- quais tools invocar antes de responder
- como citar e devolver provenance
- como pedir sampling quando faz sentido

Parâmetros:
- `riskLevel`
- `projectRole`
- `context`: descrição livre do que o agente está a fazer

#### F5.4 — Skills exportáveis

Gerar, via tool ou resource, ficheiros de skill prontos a usar (`.instructions.md` / SKILL.md) que podem ser copiados para outros repositórios do ecossistema.

Referência interna: `docs/requests/sbd-repo-guidance-tool.md`, `docs/requests/ai-assisted-authoring-guidance.md`

---

### F6 — Robustez do Retrieval Livre

**Estado:** parcialmente documentado
**Referência:** `docs/requests/mcp-retrieval-intent-normalization.md`

Com os campos `aliases_pt_en` e `intent_topics` dos índices enriquecidos, várias melhorias ficam viáveis:

- usar `aliases_pt_en` para expansão controlada de queries PT/EN
- usar `intent_topics` para boost por intenção (e.g. `repo_bootstrap`, `ci_cd_gates`)
- usar `authority_level` para priorizar conteúdo canónico
- penalizar conteúdo `demo`/`training` em perguntas de guidance operacional
- expor no modo debug: query original, expansões activas, intenção inferida, efeitos no score

Validação mínima sugerida: 5 pares de perguntas PT/EN semanticamente equivalentes.

---

### F7 — Governance de Artefactos Gerados por IA

**Estado:** documentado, não implementado
**Referência:** `docs/requests/ai-assisted-doc-disclosure-validation.md`

Tema separado que pode avançar em paralelo:

- formato de disclosure obrigatório em documentos criados com assistência de IA
- validação em PR/CI
- PR template com confirmação explícita de revisão humana

Não bloqueia as outras features areas. Pode ser tratado como sub-task independente.

---

## Dependências e Ordem Sugerida

```
F1 (enriched indices) ──► F3 (bundle)
F2 (releases checkout) ──► F3 (bundle)
F1 ──► F4 (structured tools)
F1 ──► F6 (retrieval robustness)
F4 + F6 ──► F5 (agent enforcement)
F7 (parallel, independent)
```

**Ordem de implementação recomendada:**

1. F1 — integração dos `_enriched` no checkout e no gateway (desbloqueador de tudo)
2. F2 — modo de atualização via GitHub Releases
3. F4 — tools estruturadas prioritárias (`list_sbd_toe_chapters`, `query_sbd_toe_entities`, `get_sbd_toe_chapter_brief`)
4. F6 — robustez do retrieval com `aliases_pt_en` e `intent_topics`
5. F5 — resources e prompts de enforcement a agentes
6. F3 — bundle actualizado com todos os artefactos
7. F7 — governance de artefactos (pode ser paralelo a qualquer ponto)

---

## Restrições que se mantêm

- sem backend remoto em runtime
- sem reconstrução semântica neste repositório
- sem deslocar responsabilidades do `sbd-toe-knowledge-graph`
- `stdout` reservado ao protocolo JSON-RPC; logs operacionais em `stderr`
- inputs MCP validados antes de uso (allowlists, faixas explícitas)
- secrets sem fallback funcional; configuração centralizada em `src/config.ts`
- Node ≥ 20.9, ESM, TypeScript estrito

---

## Critério de Conclusão do Epic

O epic está concluído quando:

- [ ] os snapshots embutidos usam os `_enriched` como fonte primária
- [ ] `checkout:backend` suporta atualização via GitHub Releases sem cópia local
- [ ] as tools `list_sbd_toe_chapters`, `query_sbd_toe_entities`, `get_sbd_toe_chapter_brief` e `map_sbd_toe_applicability` estão implementadas e funcionais
- [ ] o retrieval converge de forma consistente em pares de perguntas PT/EN semanticamente equivalentes
- [ ] existe pelo menos um resource MCP e uma prompt de enforcement para agentes
- [ ] o bundle de release inclui os snapshots enriquecidos e compila sem erros
- [ ] `npm run check && npm run build` passa limpo

---

## Referências

- `docs/requests/mcp-structured-tools.md`
- `docs/requests/mcp-retrieval-intent-normalization.md`
- `docs/requests/sbd-review-scope-tool.md`
- `docs/requests/sbd-repo-guidance-tool.md`
- `docs/requests/ai-assisted-authoring-guidance.md`
- `docs/requests/ai-assisted-doc-disclosure-validation.md`
- `docs/requests/knowledge-graph-index-enhancements.md`
- `docs/role.md`
- `NEXT-STEPS.md`
