# Secondary Artifacts Adoption Matrix

Este documento define quando os artefactos públicos secundários do upstream
`sbd-toe-knowledge-graph` devem ou não ser adotados neste MCP.

Não substitui o inventário em [mcp_consumption_map.md](mcp_consumption_map.md).
O objetivo aqui é decidir:

- se um artefacto secundário ajuda realmente;
- em que tipo de feature ajuda;
- se deve entrar em runtime, debug ou apenas dev/CI;
- qual a prioridade de adoção.

Esta matriz assume o contrato publicado do `sbd-toe-knowledge-graph` V2:

- `Primário` = base mínima estável para consumers
- `Secundário` = público e suportado para consumers mais ricos
- `Interno/local` = não usar externamente

## Regra de decisão

Um artefacto secundário só deve ser adotado se cumprir estas condições:

1. reduz heurística no consumer em vez de apenas duplicar texto já achatado;
2. serve pelo menos um request ou next step ativo;
3. tem contrato público estável no upstream;
4. o ganho é claro para runtime, debug ou avaliação;
5. não desloca para este repo responsabilidades do builder semântico.

## Modos de adoção

- `runtime-now`
  - bom candidato para entrar cedo no bundle/runtime do MCP
- `runtime-later`
  - útil, mas deve esperar pela camada de tools estruturadas ou por clarificação de schema
- `dev-ci-only`
  - útil para testes, regressão, tuning e debug, não para o runtime normal
- `do-not-adopt`
  - não usar neste consumer

## Matriz por artefacto

| Artefacto | Ajuda principal | Modo | Prioridade | Requests/Next Steps mais ligados | Quando usar |
|---|---|---|---|---|---|
| `practice_assignments.json` | quem faz o quê, em que fase, com que obrigação | `runtime-now` | P1 | `mcp-structured-tools`, `sbd-review-scope-tool`, `assert_and_implement_devsecops_pratices` | quando o output tem de responder a role/phase/risk de forma estruturada |
| `policy_references.json` | policies e governação associadas a capítulo/prática | `runtime-now` | P1 | `mcp-structured-tools`, `sbd-repo-guidance-tool`, `ai-assisted-authoring-guidance`, `assert_and_implement_devsecops_pratices` | quando é preciso responder "que policies governam X?" sem depender só de texto livre |
| `proportionality.json` | aplicação L1/L2/L3 explícita | `runtime-now` | P1 | `mcp-structured-tools`, `sbd-review-scope-tool`, `sbd-repo-guidance-tool`, `assert_and_implement_devsecops_pratices` | quando a pergunta ou tool depende de risco/proporcionalidade |
| `chapter_aggregates.json` | resumo agregado por capítulo | `runtime-now` | P1 | `mcp-structured-tools` | quando for preciso `list/get chapter brief` sem reconstrução local pesada |
| `artifact_evidence.json` | artefactos e evidência esperada | `runtime-later` | P2 | `sbd-review-scope-tool`, `assert_and_implement_devsecops_pratices`, `ai-assisted-doc-disclosure-validation` | quando quiseres checklist de evidência/gaps, não apenas retrieval |
| `sdlc_integration.json` | integração por fase e role | `runtime-later` | P2 | `mcp-structured-tools`, `sbd-review-scope-tool` | quando a resposta precisar de "quando" e "quem" com menos heurística |
| `roles.json` | catálogo canónico de roles | `runtime-later` | P2 | `mcp-structured-tools`, `mcp-retrieval-intent-normalization`, `sbd-repo-guidance-tool` | quando houver normalização séria de filtros por role |
| `sdlc_phases.json` | catálogo canónico de fases | `runtime-later` | P2 | `mcp-structured-tools`, `mcp-retrieval-intent-normalization`, `sbd-review-scope-tool` | quando houver normalização séria de filtros por fase |
| `practices.json` | catálogo de práticas normalizadas | `runtime-later` | P2 | `mcp-structured-tools`, `assert_and_implement_devsecops_pratices` | quando a tool precisar de lista canónica de práticas sem passar pelo índice achatado |
| `lifecycle_user_stories.json` | user stories estruturadas | `runtime-later` | P2 | `mcp-structured-tools`, `assert_and_implement_devsecops_pratices` | quando o output precisar de histórias/BDD e não apenas práticas |
| `chapter_semantic_model.json` | modelo semântico de cada capítulo | `runtime-later` | P2 | `mcp-retrieval-intent-normalization`, `mcp-structured-tools` | quando quiseres layer-aware retrieval e chapter briefs melhores |
| `chapter_bundle_graph.json` | relações entre layers/documentos do capítulo | `runtime-later` | P2 | `mcp-retrieval-intent-normalization`, `mcp-structured-tools` | quando for preciso explicar "de onde veio" o contexto e separar melhor canon vs addon/demo |
| `maturity_mappings.json` | mapeamento para frameworks/maturidade | `runtime-later` | P3 | `assert_and_implement_devsecops_pratices` | quando o output precisar de crosswalk com NIST/DSOMM/SAMM/ISO |
| `practice_occurrences.json` | onde a prática aparece | `runtime-later` | P3 | `mcp-structured-tools` | quando quiseres explicar ocorrência/propagação de práticas no corpus |
| `golden_queries.json` | dataset de regressão completo | `dev-ci-only` | P1 | `mcp-retrieval-intent-normalization`, `NEXT-STEPS` gap de regressão | quando quiseres medir melhorias de retrieval de forma séria |
| `golden_queries_smoke.json` | subset rápido de regressão | `dev-ci-only` | P1 | `mcp-retrieval-intent-normalization`, CI | quando quiseres smoke test rápido em PR/branch |
| `evaluation_report.json` | baseline de avaliação | `dev-ci-only` | P2 | `mcp-retrieval-intent-normalization` | quando quiseres comparar antes/depois em tuning de retrieval |
| `query_local_docs_report.json` | debug do índice docs | `dev-ci-only` | P3 | tuning interno | quando estiveres a diagnosticar falhas do índice docs |
| `query_local_entities_report.json` | debug do índice entities | `dev-ci-only` | P3 | tuning interno | quando estiveres a diagnosticar falhas do índice entities |
| `algolia_publish_execution.json` | debug da publicação | `dev-ci-only` | P3 | manutenção upstream/downstream | quando houver suspeita de problema de publish/provenance |
| `algolia_publish_plan.json` | debug do publish planeado | `dev-ci-only` | P3 | manutenção upstream/downstream | quando houver suspeita de divergência entre planeado e publicado |
| `extraction_plan.json` | detalhe interno de extração | `do-not-adopt` | P0 | nenhum | artefacto interno, não é contrato downstream |
| `role_drift_report.json` | drift interno de roles | `do-not-adopt` | P0 | nenhum | útil ao builder, não ao runtime do MCP |
| `file_inventory.json` | inventário do corpus | `do-not-adopt` | P0 | nenhum | detalhe interno de analysis |
| `document_classification.json` | classificação interna de documentos | `dev-ci-only` | P3 | `mcp-retrieval-intent-normalization` | usar só se vier a ser necessário para tuning e separação canon/addon |
| `section_classification.json` | classificação interna de secções | `dev-ci-only` | P3 | `mcp-retrieval-intent-normalization` | usar só se vier a ser necessário para tuning e separação canon/addon |
| `semantic_signals.json` | sinais internos de analysis | `do-not-adopt` | P0 | nenhum | contrato fraco para consumer externo |
| `candidate_entities.json` | entidades candidatas antes da extração final | `do-not-adopt` | P0 | nenhum | artefacto interno do builder |
| `heading_patterns.json` | padrões de headings | `do-not-adopt` | P0 | nenhum | analysis interna |
| `table_patterns.json` | padrões de tabelas | `do-not-adopt` | P0 | nenhum | analysis interna |
| `proposed_schema.json` | schema proposto pelo builder | `do-not-adopt` | P0 | nenhum | útil ao upstream, não ao runtime do MCP |

## Leitura por request

### `mcp-structured-tools`

Artefactos com melhor relação valor/esforço:

- `practice_assignments.json`
- `policy_references.json`
- `proportionality.json`
- `chapter_aggregates.json`

Artefactos de segunda vaga:

- `sdlc_integration.json`
- `roles.json`
- `sdlc_phases.json`
- `chapter_semantic_model.json`

### `mcp-retrieval-intent-normalization`

Artefactos mais úteis:

- `golden_queries_smoke.json`
- `golden_queries.json`
- `evaluation_report.json`
- `chapter_semantic_model.json`
- `chapter_bundle_graph.json`

Nota:

- aqui o maior ganho inicial é em `dev-ci-only`, não em runtime

### `sbd-review-scope-tool`

Artefactos mais úteis:

- `artifact_evidence.json`
- `practice_assignments.json`
- `policy_references.json`
- `proportionality.json`
- `chapter_semantic_model.json`

### `sbd-repo-guidance-tool`

Artefactos mais úteis:

- `policy_references.json`
- `proportionality.json`
- `practice_assignments.json`

Opcional depois:

- `artifact_evidence.json`

### `ai-assisted-authoring-guidance`

Artefactos mais úteis:

- `policy_references.json`
- `proportionality.json`

Nota:

- o índice primário já parece suficiente para uma primeira versão local de guidance
- o secundário ajuda mais a consolidar consistência do que a desbloquear o primeiro passo

### `ai-assisted-doc-disclosure-validation`

Artefactos mais úteis:

- praticamente nenhum é crítico para a primeira iteração

Nota:

- isto é sobretudo política do repositório + CI/PR checks, não consumo semântico do upstream

### `assert_and_implement_devsecops_pratices`

Artefactos com mais valor:

- `practice_assignments.json`
- `policy_references.json`
- `artifact_evidence.json`
- `maturity_mappings.json`
- `proportionality.json`

## Ordem sugerida de adoção

1. Primeira vaga `runtime-now`
   - `practice_assignments.json`
   - `policy_references.json`
   - `proportionality.json`
   - `chapter_aggregates.json`

2. Segunda vaga `runtime-later`
   - `artifact_evidence.json`
   - `sdlc_integration.json`
   - `roles.json`
   - `sdlc_phases.json`
   - `chapter_semantic_model.json`
   - `chapter_bundle_graph.json`

3. Primeira vaga `dev-ci-only`
   - `golden_queries_smoke.json`
   - `golden_queries.json`
   - `evaluation_report.json`

## Regra de implementação

Sempre que um artefacto secundário for adotado neste repo, deve ficar explícito:

- em que feature ou request entra;
- se entra em runtime, debug ou CI;
- que ficheiro do `consumer_contract` justifica o uso;
- qual o comportamento de fallback quando o artefacto não existir;
- se o bundle de release passa a incluí-lo ou se fica apenas para mantenedores.
