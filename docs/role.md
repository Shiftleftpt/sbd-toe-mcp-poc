# Repo Role — `sbd-toe-mcp-poc`

Este repositório existe para construir um cliente MCP/wrapper para VS Code sobre o backend semântico já produzido por `sbd-toe-knowledge-graph`.

O seu papel não é reconstruir o manual, nem repetir a lógica do builder.
Também não é substituir o chat do VS Code. O seu papel é fornecer grounding, contexto, citações e prompting para que o chat responda melhor.

## Papel Deste Repositório

Este repositório deve ser tratado como:

- consumidor do backend semântico
- cliente de retrieval sobre snapshot semântico local
- compositor de contexto
- adaptador MCP para prompts e sampling do cliente
- integração MCP/VS Code
- camada de resposta grounded com debug

Em termos simples:

- o projeto anterior constrói o conhecimento
- este projeto consome esse conhecimento e expõe uma interface útil ao utilizador dentro do VS Code
- o modelo final continua a ser o do utilizador, configurado no chat do VS Code

## Responsabilidades

- receber perguntas do utilizador
- obter do upstream o snapshot publicado dos índices
- consultar os índices certos pela ordem certa
- montar contexto útil e compacto
- expor contexto grounded ao chat do VS Code
- devolver ao chat os records relevantes para perguntas como:
- `quais os requisitos de autenticacao que preciso implementar para esta aplicacao L1`
- `que evidencias devem existir antes do deployment`
- `que policies governam pipelines CI/CD`
- pedir sampling ao modelo configurado no cliente quando fizer sentido
- devolver resposta em PT-PT
- citar records recuperados
- expor modo debug com retrieval e prompt
- integrar isso como MCP/wrapper para uso no VS Code

## Não Responsabilidades

Este repositório não deve:

- reparsear o manual Markdown
- reconstruir bundles semânticos
- reinventar `chapter_id`, `document_id`, `section_id` ou `practice_id`
- extrair entidades do corpus
- publicar índices
- substituir o `knowledge builder`
- substituir o chat do VS Code
- reduzir o projeto anterior a um simples “cliente Algolia”

## Relação Com O Repositório Anterior

`sbd-toe-knowledge-graph` deve ser tratado como:

- `knowledge builder`
- `semantic indexing pipeline`
- `retrieval backend`

Este repositório deve tratar esse backend como fonte de verdade para:

- provenance
- identidade semântica
- records documentais
- records estruturados
- prioridades de retrieval
- snapshot publicado em `data/publish`

## Modelo De Interação

O fluxo esperado é:

1. o utilizador faz uma pergunta no chat do VS Code
2. o chat usa este MCP para recuperar contexto relevante
3. este repositório devolve records, citações, capítulos e links de página quando existirem
4. o modelo do utilizador gera a resposta final grounded nesse contexto

Opcionalmente, o servidor pode pedir `sampling` ao cliente MCP, mas continua a usar o modelo do utilizador e não um modelo próprio do servidor.

## Ordem De Retrieval Esperada

1. `SbD-ToE-ASKAI-Docs`
2. `SbD-ToE-ASKAI-Entities`

## Comportamento Esperado

O cliente deve:

- responder apenas com base no contexto recuperado
- preferir PT-PT
- dizer explicitamente quando a evidência é insuficiente
- citar `objectID` ou equivalente de provenance
- devolver links de página apenas quando forem determinísticos
- não inventar anchors ou URLs de secção
- expor debug útil ao programador/utilizador

## O Que Vale Neste Repositório

O valor principal deste projeto não está em escrever um cliente Algolia genérico.

O valor está em:

- escolher bem o contexto
- preservar grounding
- compor boas respostas
- mostrar citações
- orientar o chat do VS Code com prompts adequados
- tornar o backend útil dentro do VS Code

## MVP Recomendado

- config por `.env`
- retrieval adapter fino
- snapshot local embutido em `data/publish`
- prompt builder
- prompt MCP para o chat
- sampling do cliente como opção de resposta final
- uma ferramenta MCP principal de retrieval
- modo debug
- documentação mínima de setup e uso

## Critério De Sucesso

O projeto está numa boa primeira iteração quando:

- responde perguntas reais sobre o manual com grounding
- usa os artefactos semânticos existentes como fonte principal
- ajuda o chat do VS Code a responder perguntas concretas de engenharia e compliance
- mostra citações e records recuperados
- não duplica a lógica do `sbd-toe-knowledge-graph`
