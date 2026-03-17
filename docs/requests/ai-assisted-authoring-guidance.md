# Gerar guidance operacional para authoring assistido por IA/MCP

## Contexto

O uso do `sbd-toe-mcp-poc` com Copilot e outros agentes já mostrou duas necessidades distintas:

1. governance e enforcement no repositório
2. guidance operacional para o agente saber como agir ao criar ou alterar artefactos com apoio de IA/MCP

O primeiro tema já está coberto separadamente em `ai-assisted-doc-disclosure-validation.md`.

Este pedido cobre o segundo tema: como obter guidance suficientemente canónica, concreta e reutilizável para alimentar:

- `.github/copilot-instructions.md`
- prompts MCP futuras orientadas a drafting
- templates e práticas de revisão humana
- instruções locais de agentes noutros repositórios do ecossistema SbD-ToE

## Contexto semântico já confirmado no índice atual

Os índices embutidos já parecem conter base relevante para uma primeira versão desta guidance, nomeadamente:

- Cap. 02, anexo `governaca-automatismos`
  - responsabilidade sempre humana
  - output automatizado não é evidência
  - código gerado é tratado como código de terceiros
  - validação obrigatória e explícita
  - rastreabilidade não é opcional
  - uso autorizado e conhecido
  - proteção de informação em prompts
  - revisão humana obrigatória
  - validação técnica independente
  - gestão de exceções
  - referência explícita a uso de automatismo quando relevante
- Cap. 06
  - `Uso Validado de GenIA`
  - `Rastreabilidade com Anotações de Segurança`
  - `Revisão de Código Segura`
  - política `Política de Uso Controlado de GenIA em Desenvolvimento`
- Cap. 07
  - PR obrigatório, revisão obrigatória e gates de validação

## Pedido

Desenhar uma capacidade futura de guidance operacional baseada no manual SbD-ToE para uso assistido por IA/MCP, sem a transformar ainda em enforcement nem em edição automática de ficheiros.

Quero avaliar que artefacto faz mais sentido para isso:

1. regras em `.github/copilot-instructions.md`
2. prompt MCP dedicada a drafting/document authoring
3. futura tool MCP de guidance estruturada
4. combinação incremental das três

Quero também explicitar até que ponto isso já pode ser feito com o índice atual e em que pontos passa a ser desejável pedir trabalho ao upstream.

## Artefactos relevantes

- `.github/copilot-instructions.md`
- `docs/sbd-toe-applicability.md`
- `docs/requests/sbd-repo-guidance-tool.md`
- `docs/requests/ai-assisted-doc-disclosure-validation.md`
- `prompts/sbd-toe-chat-system.md`
- `src/index.ts`
- `data/publish/algolia_docs_records.json`
- `data/publish/algolia_entities_records.json`

## Restrições

- Não tratar a guidance como aprovação automática de artefactos.
- Não assumir que prompts MCP são injetadas automaticamente no fluxo do agente.
- Não depender apenas do MCP para enforcement.
- Separar claramente:
  - guidance de authoring
  - validação em PR/CI
  - trabalho eventual no upstream
- Não inventar requisitos canónicos que ainda não estejam claramente suportados pelo manual.

## Resultado esperado

Quero no fim:

1. proposta de guidance operacional mínima baseada no índice atual
2. decisão sobre o melhor veículo para essa guidance
3. proposta de sequência de implementação
4. identificação clara do que ainda falta no upstream
5. recomendação para como usar isso na evolução de `copilot-instructions.md`

## O que já parece possível com o índice atual

Sem pedir mais nada ao upstream, já parece viável sustentar guidance como:

- output de IA/MCP não é evidência
- responsabilidade e decisão final são humanas
- código/config/testes gerados são tratados como artefactos de terceiros
- revisão humana é obrigatória
- validação técnica independente não pode ser desativada
- segredos e dados sensíveis não devem ser colocados em prompts
- deve existir rastreabilidade quando o uso de automatismo for relevante
- PR review e gates continuam obrigatórios

Isto já é suficiente para melhorar bastante `copilot-instructions.md`.

## O que ainda parece pedir trabalho no upstream

Para guidance mais específica e consistente entre repositórios, o upstream/manual ajudaria se passasse a descrever de forma mais explícita:

- quando um documento deve trazer disclosure de assistência por IA
- formatos recomendados de disclosure por tipo de artefacto
- catálogo de artefactos onde disclosure é esperado
- distinção entre micro-edição e alteração substantiva
- expected evidence normalizado para artefactos AI-assisted

Ao nível de índices/knowledge graph, isso sugere que mais tarde podem ser úteis entidades ou campos como:

- `ai_usage_governance`
- `artifact_disclosure_requirement`
- `human_review_requirement`
- `expected_evidence` por tipo de artefacto

Mas isto não parece bloqueador para uma primeira versão local de guidance.

## Direção provável

Sequência recomendada:

1. usar o índice atual para refinar `copilot-instructions.md`
2. avaliar uma prompt MCP futura dedicada a drafting sensível
3. manter enforcement em separado via `ai-assisted-doc-disclosure-validation.md`
4. só depois pedir ao upstream normalização adicional para disclosure e artefactos

## Resumo operacional

- extrair do índice atual as regras canónicas já estáveis sobre uso de automatismos/GenIA
- decidir que parte vai para `copilot-instructions.md` e que parte deve ficar para prompt MCP futura
- não misturar guidance com enforcement
- registar gaps explícitos do manual/upstream sobre disclosure documental
- tratar upstream como melhoria desejável, não como pré-requisito para a primeira versão local
