---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: governance-doc
reasoning: North star document drafted by sync to align executor and tester on epic goals
review_status: pending-human-review
---

# North Star

DRAFT — Review with sync before opening the first slice.

## Project Idea

## MCP v2 — Índices Enriquecidos, Tools Robustas e Enforcement a Agentes

**Repositório:** sbd-toe-mcp-poc (TypeScript/Node.js ESM ≥20.9, MCP stdio server)
**Branch:** epic/mcp-v2-robust-indices
**Baseline:** v0.1.0-frozen

### Contexto

Este projeto é um servidor MCP (Model Context Protocol) para VS Code que serve como wrapper de retrieval semântico sobre o manual SbD-ToE (Security by Design - Terms of Engagement). Fornece grounding, contexto, citações e prompting ao chat do VS Code — não reconstrói o manual nem substitui o chat.

O upstream (sbd-toe-knowledge-graph) passou a publicar índices enriquecidos com campos novos. A v0.1.0 usa o formato antigo. Este epic atualiza o servidor MCP para consumir os índices enriquecidos, expõe tools estruturadas, e permite que agentes se auto-configurem com as prescrições SbD-ToE.

### Features a implementar

**F1 — Integração dos Índices Enriquecidos** (desbloqueador de tudo)
- Atualizar checkout-backend.ts para copiar _enriched files
- Atualizar AppConfig e .env.example para novos ficheiros
- Atualizar SnapshotPayload e semantic-index-gateway.ts para consumir campos novos (aliases_pt_en, intent_topics, canonical_control_ids, artifact_ids)
- Usar aliases_pt_en e intent_topics no scoring (resolve gaps PT/EN)
- Substituir snapshots em data/publish/ pelos _enriched como fonte primária

**F2 — Atualização de Snapshots via GitHub Releases**
- Modo configurável: UPSTREAM_SOURCE=local|release
- Download seguro do bundle de release do sbd-toe-knowledge-graph
- Validação sha256 de integridade
- Timeout e tamanho máximo no download

**F4 — Tools Estruturadas de Consulta**
- list_sbd_toe_chapters
- query_sbd_toe_entities
- get_sbd_toe_chapter_brief
- map_sbd_toe_applicability

**F6 — Robustez do Retrieval PT/EN**
- Usar aliases_pt_en no scoring
- Normalização de intent_topics
- Melhorar cobertura de queries em português

**F3 — Bundle Self-Contained com Snapshots Enriquecidos** (dependente de F1+F2)
**F5 — MCP Resources para Enforcement a Agentes** (dependente de F1+F4)
**F7 — Governança de Documentos AI-Assisted** (independente)

### Stack
- TypeScript/Node.js ESM, src/ structure
- Python 3.13 venv, aos-engine-mcp v0.5.0 como orquestrador
- Dados em data/publish/ (snapshots embutidos)
- CI: npm run check, npm run build, npm test

### Restrições
- stdout reservado ao protocolo JSON-RPC
- logs operacionais em stderr
- sem tools de shell/exec no MCP
- sem edição do workspace pelo MCP
- não mover lógica do knowledge builder para este repositório
- validar todos os inputs MCP antes de uso

## Goal

Deliver a first testable increment through small, auditable slices.

## Constraints

- Keep slices incremental and independently testable.
- Require sync validation before execution begins.
- Avoid assuming scope that is not present in the original story.

## Success Criteria

- A clear roadmap exists.
- Each slice can be executed and validated independently.
- The resulting system is auditable through AOS artifacts.

## Out of Scope

- Any feature or delivery not explicitly validated by sync.
- Bootstrap mode used: bootstrap_from_story.
