# Repo Role — `sbd-toe-mcp-poc`

Este repositório existe para expor um MCP OSS consultivo sobre o bundle publicado do manual SbD-ToE já compilado.

O seu papel não é reconstruir o manual, nem reconciliar `AppSec Core` diretamente, nem repetir a lógica do builder.

## Papel Deste Repositório

Este repositório deve ser tratado como:

- consumidor do bundle publicado do manual compilado
- cliente de retrieval grounded sobre snapshots locais
- compositor de contexto, citações e debug
- adaptador MCP para sampling do cliente quando aplicável
- servidor consultivo para Claude, Copilot, Cursor, Windsurf, Zed e outros clientes MCP

## Responsabilidades

- receber perguntas do utilizador
- carregar o contrato publicado do manual em `data/publish/`
- usar a ontologia do manual compilado como `consumer root`
- consultar `mcp_chunks`, `vector_chunks`, `chunk_entity_mentions` e `chunk_relation_hints`
- resolver dados normativos a partir de `runtime/*`
- montar contexto útil e compacto
- devolver contexto grounded, citações e metadata de provenance
- pedir sampling ao modelo configurado no cliente quando fizer sentido
- expor modo debug com retrieval e prompt

## Não Responsabilidades

Este repositório não deve:

- reparsear o manual Markdown
- reconstruir bundles semânticos
- publicar índices
- redefinir sozinho a ontologia do manual
- consumir `AppSec Core` diretamente como contrato default do produto
- substituir o `knowledge builder`
- misturar por omissão a linha OSS consultiva com a linha privada/interventiva

## Relação Com O Bundle

`SbD-ToE/sbd-toe-knowledge-graph` deve ser tratado como:

- compilador do manual
- publicador da surface consumível
- fonte de verdade do bundle publicado

Este repositório deve tratar esse backend como fonte de verdade para:

- ontologia do manual compilado
- runtime determinístico
- índices de retrieval
- provenance e version pinning

## Modelo De Interação

O fluxo esperado é:

1. o utilizador faz uma pergunta no cliente MCP
2. o cliente chama uma tool deste servidor
3. este repositório recupera contexto do bundle publicado local
4. devolve contexto grounded, citações e metadados
5. o modelo do utilizador gera a resposta final sobre esse contexto

Opcionalmente, o servidor pode pedir `sampling` ao cliente MCP, mas continua a usar o modelo do utilizador e não um modelo próprio do servidor.

## Ordem De Consumo Esperada

1. `data/publish/ontology/sbdtoe-ontology.yaml`
2. `data/publish/runtime/deterministic_manifest.json`
3. `data/publish/runtime/*.json`
4. `data/publish/indexes/mcp_chunks.jsonl`
5. `data/publish/indexes/vector_chunks.jsonl` quando o problema for de recall
6. `data/publish/indexes/chunk_entity_mentions.jsonl`
7. `data/publish/indexes/chunk_relation_hints.jsonl`

## Comportamento Esperado

O servidor deve:

- responder apenas com base no bundle publicado
- preferir PT-PT quando adequado
- dizer explicitamente quando a evidência é insuficiente
- citar provenance determinística
- não inventar anchors ou URLs de secção
- expor debug útil

## Critério De Sucesso

O projeto está numa boa iteração OSS quando:

- responde perguntas reais sobre o manual com grounding
- usa o bundle publicado como fonte principal
- não duplica a lógica do `sbd-toe-knowledge-graph`
- continua coerente como linha consultiva independente
