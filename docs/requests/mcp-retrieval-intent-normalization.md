---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: documentation
reasoning: Feature request for retrieval intent normalization and enriched metadata usage (s3 context)
review_status: pending-human-review
---

# Melhorar retrieval do MCP com normalização de intenção e uso de metadados estruturados

## Contexto

O repositório `sbd-toe-mcp-poc` já consegue retrieval livre e grounded sobre snapshots embutidos do manual SbD-ToE.

Contudo, a iteração recente mostrou uma limitação prática: perguntas semanticamente equivalentes nem sempre recuperam o mesmo espaço temático, especialmente quando mudam de língua ou usam vocabulário diferente.

Exemplo concreto observado:

- uma pergunta em PT sobre criar um novo repositório de código tende a recuperar conteúdo correto sobre dependências, SBOM/SCA, SAST e gates de CI/CD
- uma pergunta equivalente em EN tende por vezes a desviar para repositório de conformidade, formação, addons ou exemplos demo

No estado atual, o consumer downstream:

- faz scoring local sobretudo lexical sobre `title`, `metadata` e `excerpt`
- usa tokenização simples e normalização básica de texto
- não faz classificação explícita de intenção da pergunta
- não faz expansão controlada de aliases PT/EN
- não distingue fortemente entre conteúdo canónico, operacional, demo, training ou example

Parte deste problema deve ser resolvida no upstream `sbd-toe-knowledge-graph` através de melhor schema/índices. Mas continua a existir uma contraparte natural neste repositório: o retrieval local deve conseguir aproveitar esses metadados e reduzir dependência excessiva da formulação exata da pergunta.

Este tema é complementar a:

- `knowledge-graph-index-enhancements.md`
- `mcp-structured-tools.md`

Não substitui esses pedidos.

## Pedido

Avaliar e, quando fizer sentido, implementar melhorias no `sbd-toe-mcp-poc` para tornar o retrieval mais robusto a:

1. equivalência PT/EN
2. sinónimos operacionais
3. desambiguação de intenção
4. distinção entre conteúdo canónico e conteúdo auxiliar

Quero em particular uma avaliação e, se fizer sentido, implementação incremental de mecanismos como:

- normalização de queries antes do scoring local
- expansão controlada de termos e aliases frequentes
- classificação leve de intenção da pergunta, por exemplo `repo_bootstrap`, `dependency_governance`, `ci_cd_gates`, `review_scope`
- reweighting do score local com base em metadados estruturados vindos do upstream, quando existirem
- redução explícita do peso de conteúdos `demo`, `training`, `example` quando a pergunta pede guidance operacional canónica
- fallback estável quando esses metadados ainda não existirem nos snapshots atuais

O objetivo não é transformar este MCP num sistema de retrieval complexo ou remoto. O objetivo é melhorar a robustez do retrieval local mantendo a arquitetura atual.

## Artefactos relevantes

- `src/backend/semantic-index-gateway.ts`
- `src/orchestrator/ask-manual.ts`
- `src/prompt/build-answer-prompt.ts`
- `src/types.ts`
- `src/index.ts`
- `data/publish/algolia_docs_records.json`
- `data/publish/algolia_entities_records.json`
- `data/publish/algolia_index_settings.json`
- `docs/requests/knowledge-graph-index-enhancements.md`

## Restrições

- Não introduzir backend remoto, embedding service externo ou retrieval online.
- Não deslocar responsabilidades do `sbd-toe-knowledge-graph` para este repo.
- Não esconder limitações de índice com heurísticas opacas ou difíceis de auditar.
- Preferir mecanismos pequenos, explícitos e verificáveis.
- Preservar compatibilidade com snapshots atuais, mesmo que parte das melhorias só fique plenamente útil quando o upstream publicar novos campos.
- Se houver query expansion, ela deve ser controlada e auditável, não uma lista arbitrária e ilimitada de sinónimos.

## Resultado esperado

Quero no fim:

1. análise do estado atual do retrieval local e dos seus failure modes
2. proposta explícita do que deve ser resolvido no downstream e do que deve ficar no upstream
3. desenho incremental para normalização de queries e desambiguação de intenção
4. decisão sobre que metadados novos do upstream devem ser consumidos pelo score local
5. alterações concretas implementadas, se fizer sentido
6. critérios simples de validação com pares de perguntas PT/EN semanticamente equivalentes

## Direções técnicas sugeridas

Avaliar, sem assumir à partida que todas são necessárias:

- função de normalização com aliases PT/EN para conceitos centrais do manual
- dicionário pequeno de intenções canónicas e respetivos termos de ativação
- boost por `intent_topics`, `content_kind`, `authority_level`, `artifact_types` ou campos equivalentes, quando existirem
- penalização de records `demo`/`training` em perguntas de guidance operacional
- seleção híbrida simples: query original + query expandida, seguida de fusão e reranking local
- modo debug que exponha claramente a query original, query expandida, intenção inferida e efeitos no score

## Resultado de validação sugerido

Usar um conjunto pequeno de pares de perguntas para verificar convergência temática, por exemplo:

- PT/EN sobre criar repositório de código e controlos iniciais
- PT/EN sobre quem aprova exceções
- PT/EN sobre o que rever quando muda `package.json`
- PT/EN sobre que capítulo consultar para workflows GitHub Actions

Não é necessário garantir identidade total de ranking, mas deve existir convergência consistente do espaço temático e dos capítulos selecionados.

## Resumo operacional

- inspecionar `semantic-index-gateway.ts` e o score local atual
- mapear failure modes de queries equivalentes PT/EN
- separar o que depende de novos campos no upstream do que pode ser melhorado já no downstream
- implementar a menor alteração útil e auditável
- validar com 3 a 5 pares de perguntas equivalentes