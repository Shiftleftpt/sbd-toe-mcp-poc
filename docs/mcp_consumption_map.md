# MCP Consumption Map — Compiled Manual Bundle

Este documento mapeia o contrato que o MCP OSS consome a partir do `sbd-toe-knowledge-graph`.

O MCP não consome `AppSec Core` diretamente como contrato default. Consome o bundle publicado do manual compilado, já enriquecido e com provenance.

## Primário — contrato consumível do manual

Estes artefactos são a base do comportamento do servidor.

| Ficheiro | Caminho upstream | Uso |
|---|---|---|
| `sbdtoe-ontology.yaml` | `data/publish/ontology/sbdtoe-ontology.yaml` | Ontologia consumível do manual compilado. |
| `publication_manifest.json` | `data/publish/indexes/publication_manifest.json` | Manifesta o substrate publicado e a sua versão. |
| `mcp_chunks.jsonl` | `data/publish/indexes/mcp_chunks.jsonl` | Fonte principal para retrieval grounded. |
| `vector_chunks.jsonl` | `data/publish/indexes/vector_chunks.jsonl` | Recall complementar quando necessário. |
| `chunk_entity_mentions.jsonl` | `data/publish/indexes/chunk_entity_mentions.jsonl` | Apoio à expansão e matching semântico. |
| `chunk_relation_hints.jsonl` | `data/publish/indexes/chunk_relation_hints.jsonl` | Apoio a hints relacionais. |
| `deterministic_manifest.json` | `data/publish/runtime/deterministic_manifest.json` | Contrato do runtime determinístico. |
| `runtime/*.json` | `data/publish/runtime/` | Dados normativos para structured tools. |
| `run_manifest.json` | `data/reports/run_manifest.json` | Provenance do bundle. |

## Secundário — bundle support

Estes artefactos continuam úteis, mas não são o front door principal.

| Ficheiro | Uso |
|---|---|
| `bundle_catalog.jsonl` | Catálogo de bundles/capítulos. |
| `sbd-toe-index-compact.json` | Índice compacto para system prompts e setup. |

## Ordem de Consumo Recomendada

1. `data/publish/ontology/sbdtoe-ontology.yaml`
2. `data/publish/runtime/deterministic_manifest.json`
3. `data/publish/runtime/*.json`
4. `data/publish/indexes/mcp_chunks.jsonl`
5. `data/publish/indexes/vector_chunks.jsonl` quando houver problema de recall
6. `data/publish/indexes/chunk_entity_mentions.jsonl`
7. `data/publish/indexes/chunk_relation_hints.jsonl`
8. `data/reports/run_manifest.json`

## Regra de Produto

O MCP OSS deve tratar este bundle como uma superfície do manual compilado.

Não deve:

- tentar reconstruir semântica fora deste contrato
- tratar `AppSec Core` como contrato independente obrigatório
- reintroduzir superfícies `Algolia` já removidas do builder
