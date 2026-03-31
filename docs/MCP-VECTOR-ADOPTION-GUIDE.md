# SbD MCP Vector Adoption Guide

## Objetivo

Definir quando o MCP deve usar `vector_chunks` e quando não deve.

O princípio é simples:

- `vector` é camada auxiliar de recall e grounding
- não é a base da resolução normativa

## Estado Atual

Do lado do graph, o skin vetorial já existe:

- `data/publish/indexes/vector_chunks.jsonl`

Mas o MCP não é obrigado a usá-lo já.

## Regra Principal

Ordem correta:

1. resolução determinística
2. retrieval estruturado em `mcp_chunks`
3. joins por `chunk_entity_mentions`
4. reforço por `chunk_relation_hints`
5. vector retrieval opcional

Nunca inverter esta ordem.

## Quando usar vector

Usar `vector_chunks` quando o problema é de `recall`, não de `decision`.

Casos bons:

- pergunta vaga ou lexicalmente pobre
- utilizador usa linguagem não canónica
- precisas de encontrar passagens semanticamente próximas
- já tens resposta determinística, mas queres melhor grounding textual
- queres re-ranking de chunks já filtrados por perfil e contexto

Exemplos:

- `Onde é que o manual fala de segregação forte de ambientes?`
- `Dá-me os trechos mais relevantes para explicar isto ao developer`
- `Procura passagens relacionadas com provenance e supply chain`

## Quando não usar vector

Não usar vector para decisões normativas.

Casos proibidos:

- decidir `consult()`
- ativar requisitos
- ativar controlos
- inferir relações canónicas
- decidir compliance
- substituir `review()`
- substituir `threats()`

Exemplos maus:

- `Quais requisitos se aplicam a uma app L2 pública?`
- `Que controlos mitigam esta ameaça?`
- `Que evidência falta para cumprir este capítulo?`

## Padrão de uso recomendado

### `consult`

- resolver deterministicamente
- usar vector só para anexar melhores trechos explicativos

### `guide`

- resolver deterministicamente práticas/assignments/user stories
- usar vector para encontrar explicações operacionais adicionais

### `review`

- resolver deterministicamente artefactos/evidence/signals esperados
- usar vector apenas para encontrar chunks de apoio ou clarificação

### `threats`

- resolver deterministicamente ameaças e mitigações
- usar vector para grounding adicional sobre ameaça, antipattern ou rationale

## Filtros antes de vector

Antes de correr vector search, filtrar sempre por:

- `support_profiles`
- `chapter_context` se existir
- `bundle_id` quando aplicável
- `document_role` quando fizer sentido

Isto reduz ruído e evita que vector puxe chunks semanticamente parecidos mas editorialmente errados.

## Estratégia mínima de adoção

### Fase 1

Não usar vector por defeito.

Ativar só quando:

- o retrieval estruturado devolve poucos resultados
- ou a pergunta é claramente vaga

### Fase 2

Usar vector como fallback controlado:

- top-k pequeno
- depois de filtros por perfil/contexto
- só para re-ranking ou expansão limitada

### Fase 3

Usar vector como enriquecimento estável de grounding, mas nunca como fonte de decisão.

## Sinais de bom uso

- a resposta final continua ancorada em artefactos determinísticos
- os chunks vetoriais melhoram explicação/citação
- não aparecem bundles irrelevantes
- não há drift semântico face ao runtime bundle

## Sinais de mau uso

- resposta parece vir de semantic search primeiro
- aparecem capítulos laterais sem motivo
- `review` ou `threats` começam a variar demais
- o MCP deixa de explicar a cadeia normativa

## Regra de implementação

Se houver dúvida:

- resolver primeiro
- fazer vector depois
- nunca o contrário
