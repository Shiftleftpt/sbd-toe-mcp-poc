# MCP Consumption Map — Artefactos Disponíveis do Upstream

Este documento mapeia os artefactos produzidos por `sbd-toe-knowledge-graph` que
o MCP pode consumir, organizados por prioridade e localização real.

Os caminhos são relativos à raiz do repositório upstream (`sbd-toe-knowledge-graph`).

---

## Primário — fonte principal estável

Estes artefactos são copiados para `data/publish/` deste repositório e são a
base do retrieval, contexto e citação.

| Ficheiro | Caminho upstream | Uso |
|---|---|---|
| `algolia_docs_records.json` | `data/publish/` | Records documentais por secção. Base para retrieval, citação e contexto. |
| `algolia_entities_records.json` | `data/publish/` | Records estruturados: práticas, user stories, assignments, roles, policies, maturity. Útil para filtros e estrutura. |
| `algolia_index_settings.json` | `data/publish/` | Como os índices foram configurados: searchable attrs, facets, ranking. Útil para perceber o comportamento esperado do retrieval. |
| `run_manifest.json` | `data/reports/` | Provenance da geração: `repo_url`, `commit_sha`, `run_id`, `llm_backend`, `version`. Útil para debug e rastreabilidade. |

---

## Secundário — enriquecimento, debug, fallback

Estes artefactos não estão em `data/publish/` mas existem no upstream e podem
ser importados para features futuras, debug ou fallback offline. Nenhum deles
deve ser lido sem rastreabilidade de provenance.

### `data/entities/` — entidades extraídas

| Ficheiro | Uso esperado |
|---|---|
| `practices.json` | Catálogo de práticas normalizadas. |
| `practice_occurrences.json` | Onde cada prática aparece ao longo do bundle. |
| `practice_assignments.json` | Liga quem faz o quê, em que contexto. |
| `lifecycle_user_stories.json` | User stories estruturadas por fase do ciclo de vida. |
| `policy_references.json` | Governance/policies ligados ao capítulo ou prática. |
| `maturity_mappings.json` | Ligações a frameworks de maturidade. |
| `roles.json` | Catálogo de roles. |
| `sdlc_phases.json` | Fases normalizadas do ciclo de vida. |
| `sdlc_integration.json` | Integração de práticas por fase/role. |
| `artifact_evidence.json` | Artefactos/evidência extraídos. |
| `proportionality.json` | Aplicação proporcional por nível L1/L2/L3. |
| `chapter_aggregates.json` | Vista agregada por capítulo. |
| `extraction_plan.json` | Plano usado na extracção de entidades. Útil para debug. |
| `role_drift_report.json` | Relatório de deriva de roles. |

### `data/analysis/` — análise estrutural

| Ficheiro | Uso esperado |
|---|---|
| `chapter_semantic_model.json` | Composição semântica de cada capítulo. |
| `chapter_bundle_graph.json` | Relações entre layers/documentos de um capítulo. |
| `semantic_signals.json` | Sinais semânticos identificados no corpus. |
| `document_classification.json` | Classificação de documentos por tipo. |
| `section_classification.json` | Classificação de secções. |
| `section_inventory.json` | Inventário de secções. |
| `file_inventory.json` | Inventário de ficheiros fonte. |
| `candidate_entities.json` | Entidades candidatas antes da extracção final. |
| `heading_patterns.json` | Padrões de headings extraídos. |
| `table_patterns.json` | Padrões de tabelas extraídos. |
| `proposed_schema.json` | Schema proposto para extracção. |

### `data/reports/` — relatórios operacionais

| Ficheiro | Uso esperado |
|---|---|
| `algolia_publish_execution.json` | Execução da publicação para Algolia. |
| `algolia_publish_plan.json` | Plano de publicação para Algolia. |
| `evaluation_report.json` | Relatório de avaliação de retrieval. |
| `query_local_docs_report.json` | Resultados de queries locais no índice docs. |
| `query_local_entities_report.json` | Resultados de queries locais no índice entities. |

### `data/eval/` — avaliação

| Ficheiro | Uso esperado |
|---|---|
| `golden_queries.json` | Conjunto completo de golden queries para avaliação. |
| `golden_queries_smoke.json` | Subset de smoke queries para validação rápida. |

---

## Ordem de Consulta Recomendada para Novas Features

Ao investigar o que o MCP pode usar para uma feature concreta, percorrer por esta ordem:

1. `data/publish/algolia_docs_records.json`
2. `data/publish/algolia_entities_records.json`
3. `data/publish/algolia_index_settings.json`
4. `data/reports/run_manifest.json`
5. `data/analysis/chapter_bundle_graph.json`
6. `data/entities/practice_assignments.json`

---

## Nota Sobre Caminhos Locais

Este repositório (`sbd-toe-mcp-poc`) copia apenas os artefactos primários:

```
data/publish/
  algolia_docs_records.json
  algolia_entities_records.json
  algolia_index_settings.json
data/reports/
  run_manifest.json
```

Todos os outros artefactos residem exclusivamente no upstream e devem ser
tratados como leitura sob controlo explícito — não como inputs automáticos do
MCP sem validação de provenance (ver `run_manifest.json`).
