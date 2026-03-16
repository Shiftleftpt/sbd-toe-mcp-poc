# Evoluir o MCP com tools estruturadas de consulta SbD-ToE

## Contexto

O repositório `sbd-toe-mcp-poc` já consegue retrieval livre sobre snapshots embutidos do manual, mas a iteração com o Copilot mostrou uma lacuna clara: perguntas por capítulo, risco, papel, policy e aplicabilidade ainda dependem demasiado de prompting livre.

Estado atual resumido:

- existem apenas as tools atuais de pergunta livre e inspeção de retrieval
- o orquestrador já devolve metadados úteis, mas ainda pouco estruturados para consulta operacional
- o backend já normaliza dimensões como `chapter`, `section`, `role`, `phase`, `action` e `artefact`
- os snapshots já incluem entidades como `policy_reference`, `practice_assignment`, `proportionality` e `sdlc_integration`

As tools candidatas identificadas até agora são:

1. `list_sbd_toe_chapters`
2. `query_sbd_toe_entities`
3. `get_sbd_toe_chapter_brief`
4. `map_sbd_toe_applicability`
5. `build_sbd_toe_gap_checklist` (mais tarde)
6. `draft_sbd_toe_repo_guidance` (separada, mas relacionada)

Há também uma necessidade relacionada mas distinta: mapear o que deve ser revisto no manual em função das alterações feitas no repositório. Esse tema deve ser tratado separadamente em `sbd-review-scope-tool.md`.

Existe ainda outra necessidade relacionada: gerar guidance estruturada para um repositório concreto, de forma a alimentar `copilot-instructions.md`, documentação de aplicabilidade e prompts operacionais sem depender apenas de prompting livre. Esse tema deve ser tratado separadamente em `sbd-repo-guidance-tool.md`.

## Pedido

Avaliar e, quando fizer sentido, implementar a próxima vaga de tools estruturadas neste repositório, com prioridade para:

1. `list_sbd_toe_chapters`
2. `query_sbd_toe_entities`
3. `get_sbd_toe_chapter_brief`
4. `map_sbd_toe_applicability`

Quero em particular:

- confirmação de quais destas tools são viáveis com os índices atuais
- desenho do schema JSON de input/output de cada tool
- implementação incremental das tools com melhor relação valor/risco
- uso explícito de metadados existentes nos snapshots em vez de heurísticas frágeis
- resposta estruturada, com citações/proveniência quando aplicável

O `build_sbd_toe_gap_checklist` deve ser tratado apenas como backlog ou desenho futuro, salvo se ficar claro que já há substrato de dados suficiente para uma v1 robusta.

## Artefactos relevantes

- `src/index.ts`
- `src/orchestrator/ask-manual.ts`
- `src/backend/semantic-index-gateway.ts`
- `data/publish/algolia_docs_records.json`
- `data/publish/algolia_entities_records.json`
- `data/publish/algolia_index_settings.json`
- `data/reports/run_manifest.json`

## Restrições

- Não introduzir tools de shell/exec.
- Não introduzir tools de edição arbitrária do workspace.
- Não transformar este MCP num agente geral do repositório.
- Não deslocar para este repo responsabilidades do `sbd-toe-knowledge-graph`.
- Preservar a arquitetura atual: retrieval local, snapshots embutidos, runtime `stdio`.
- Se uma tool depender de metadado que o índice atual não oferece de forma robusta, explicitar essa limitação em vez de esconder com prompting.

## Resultado esperado

Quero no fim:

1. avaliação da viabilidade de cada tool com os índices atuais
2. proposta de prioridade de implementação
3. schema JSON de input/output das tools prioritárias
4. alterações concretas implementadas, se fizer sentido
5. limitações que tenham de ser resolvidas no `sbd-toe-knowledge-graph`
6. recomendação clara para a iteração seguinte

## Resumo operacional

- ler o estado atual de `src/index.ts`, `ask-manual.ts` e `semantic-index-gateway.ts`
- verificar como os snapshots expõem capítulos, entidades e filtros
- priorizar `list_sbd_toe_chapters` e `query_sbd_toe_entities`
- desenhar `get_sbd_toe_chapter_brief` e `map_sbd_toe_applicability` de forma incremental
- registar gaps de índice que exijam trabalho no upstream
