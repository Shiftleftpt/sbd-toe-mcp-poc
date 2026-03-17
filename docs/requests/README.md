# Requests e Handover Prompts

Esta pasta existe para guardar pedidos estruturados para próximas iterações, handovers entre repositórios e prompts operacionais para agentes.

## O que vai aqui

Guardar aqui ficheiros como:

- pedidos para o `sbd-toe-knowledge-graph`
- handovers para iterações futuras neste repositório
- prompts de roadmap ou discovery técnico
- pedidos estruturados para análise, design, ADRs ou planos de implementação

## O que não vai aqui

Não usar esta pasta para:

- prompts de runtime do servidor MCP
- system prompts usadas pelo chat
- documentação funcional permanente do projeto

## Separação recomendada no repositório

- `prompts/`
  - prompts de runtime do MCP consumidas pelo servidor
- `docs/requests/`
  - prompts de trabalho, handovers e pedidos para próximas iterações
- `docs/`
  - documentação estável do projeto

## Convenção sugerida de nomes

Usar nomes curtos, orientados ao objetivo, por exemplo:

- `knowledge-graph-index-enhancements.md`
- `mcp-structured-tools-discovery.md`
- `marketplace-extension-wrapper.md`

Se o ficheiro for um pedido formal para outro repositório, preferir um nome que identifique claramente o destino.

## Template

Usar `TEMPLATE.md` como base.

O template segue a estrutura já usada no upstream para pedidos adicionais, para manter consistência entre repositórios do ecossistema SbD-ToE.

## Pedidos já registados

- `mcp-structured-tools.md`
  - evolução do MCP para tools estruturadas por capítulo, entidade e aplicabilidade
- `knowledge-graph-index-enhancements.md`
  - handover para o `sbd-toe-knowledge-graph` sobre melhorias de schema/índice
- `mcp-retrieval-intent-normalization.md`
  - contraparte downstream para normalização de queries, desambiguação de intenção e uso de novos metadados no ranking local
- `sbd-review-scope-tool.md`
  - proposta para mapear, a partir do diff, o que deve ser revisto segundo o SbD-ToE
- `sbd-repo-guidance-tool.md`
  - proposta para gerar guidance estruturada de projeto a partir do manual SbD-ToE
- `ai-assisted-doc-disclosure-validation.md`
  - proposta para exigir disclosure e revisão humana em documentos gerados com apoio de IA/MCP
- `ai-assisted-authoring-guidance.md`
  - proposta para guidance/prompt operacional sobre uso de IA/MCP na criação e revisão de artefactos
