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
