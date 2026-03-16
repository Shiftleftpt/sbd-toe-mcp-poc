# Melhorar os índices publicados para suportar tools MCP estruturadas

## Contexto

O consumidor downstream é o repositório `sbd-toe-mcp-poc`, um servidor MCP para VS Code que consome localmente os artefactos publicados por `sbd-toe-knowledge-graph`.

Do lado do consumer, a conclusão atual é:

- os índices atuais parecem suficientes para uma boa `list_sbd_toe_chapters`
- os índices atuais parecem suficientes para uma boa `query_sbd_toe_entities`
- os índices atuais não parecem suficientes para uma boa `assess_sbd_toe_applicability` completa sem heurísticas frágeis
- uma futura tool de `review scope` por diff também beneficiará de melhor estrutura semântica para artefactos, evidência esperada e aplicabilidade por capítulo

O problema principal não está no retrieval livre. Está na falta de estrutura explícita para:

- aplicabilidade por capítulo
- proporcionalidade por nível de risco
- expected evidence
- missing controls / gap analysis
- artefactos esperados por capítulo, risco ou contexto
- recommended next steps

Há também um problema adicional já observado no consumer downstream: perguntas semanticamente equivalentes em PT e EN nem sempre recuperam o mesmo espaço temático.

Exemplo concreto observado no `sbd-toe-mcp-poc`:

- em PT, uma pergunta sobre criar um novo repositório de código e que controlos incluir desde o início tende a recuperar conteúdo correto de dependências, SCA/SBOM, SAST e CI/CD
- em EN, uma pergunta equivalente tende por vezes a desviar para repositório de conformidade, conteúdos de formação ou exemplos addon/demo

Isto sugere que a shape atual dos índices não expõe de forma suficientemente explícita:

- intenção operacional da pergunta
- distinção entre guidance canónica e conteúdo demo/training/addon
- aliases multilíngua por conceito
- relações canónicas entre tópicos, artefactos, fases e roles

## Pedido

Analisar o pipeline atual de geração/publicação de índices e determinar até que ponto os artefactos atuais suportam, de forma robusta, as seguintes tools do downstream:

1. `list_sbd_toe_chapters`
2. `query_sbd_toe_entities`
3. `assess_sbd_toe_applicability`
4. futura `map_sbd_toe_review_scope`

Com base nisso, propor e, quando fizer sentido, implementar o conjunto mínimo de alterações no builder/schema para melhorar o suporte a essas tools.

Quero em particular uma avaliação sobre a necessidade de acrescentar ou refinar estruturas como:

- catálogo canónico de capítulos
- proporcionalidade estruturada por risco (`L1`, `L2`, `L3`)
- entidades explícitas do tipo `control_requirement` ou equivalente
- condições de aplicabilidade explícitas
- expected evidence normalizado
- catálogo de artefactos esperados por capítulo / risco / papel / fase
- ligações claras entre `policy_reference`, `practice_assignment`, `proportionality` e requisitos/controles
- catálogo canónico de intenções operacionais, por exemplo `repo_bootstrap`, `dependency_governance`, `pr_checks`, `ci_cd_gates`, `sast`, `sca`, `sbom`
- distinção estruturada entre conteúdo `canonical`, `operational`, `example`, `demo` e `training`
- aliases e termos equivalentes PT/EN por conceito, para reduzir divergência lexical entre perguntas semanticamente equivalentes
- classificação do tipo de conteúdo/artefacto, por exemplo `repository_file`, `workflow`, `policy`, `checklist`, `evidence`, `example`

Se não for prudente implementar tudo já, deixar pelo menos proposta de schema, plano incremental e impacto esperado nos artefactos publicados.

## Artefactos relevantes

- `data/publish/algolia_docs_records.json`
- `data/publish/algolia_entities_records.json`
- `data/publish/algolia_index_settings.json`
- `data/reports/run_manifest.json`

## Restrições

- Não mexer no `sbd-toe-mcp-poc` nesta tarefa.
- Não reinventar semântica se ela já existir em fontes canónicas do manual.
- Preferir alterações incrementais, publicáveis e compatíveis com consumers atuais.
- Se houver breaking changes, explicá-las claramente.
- O objetivo não é melhorar prompting genérico, mas sim melhorar a shape semântica dos artefactos publicados.
- O resultado deve ser orientado a suportar tools MCP estruturadas, não apenas search livre.
- Se parte do problema exigir também ajustes no retrieval downstream, separar claramente o que é resolvido por índices/schema do que é resolvido por query expansion ou reranking no consumer.

## Schema mínimo sugerido

Se fizer sentido no pipeline atual, avaliar a publicação de campos adicionais como:

- `intent_topics`: lista de intenções operacionais canónicas
- `content_kind`: `guidance`, `user_story`, `policy`, `example`, `training`, `demo`
- `authority_level`: `canonical`, `operational`, `supporting`, `example`
- `artifact_types`: tipos de artefacto esperados ou referidos no record
- `canonical_terms`: lista de termos canónicos associados ao conceito
- `aliases_pt_en`: variantes PT/EN ou multilíngua do mesmo conceito
- `audience_roles_canonical`: roles normalizados, sem depender apenas de variantes textuais livres
- `lifecycle_stage_canonical`: fase SDLC canónica, quando aplicável

Também é útil avaliar se estes campos devem ser:

- pesquisáveis (`searchableAttributes`)
- facetáveis (`attributesForFaceting`)
- parcialmente usados em `customRanking`

## Resultado esperado

Quero no fim:

1. análise do estado atual dos índices e do pipeline
2. decisão explícita sobre o que já suporta bem cada uma das tools alvo
3. proposta de schema/modelo de dados melhorado
4. alterações concretas implementadas, se fizer sentido
5. impacto nos artefactos publicados
6. riscos e breaking changes
7. recomendação clara para o próximo passo no downstream `sbd-toe-mcp-poc`
8. separação explícita entre melhorias resolvíveis no índice e melhorias que continuem a exigir RAG/query expansion no consumer

## Resumo operacional

- ler pipeline e transformações que geram `data/publish/*`
- avaliar suporte atual para `list_sbd_toe_chapters`, `query_sbd_toe_entities`, `assess_sbd_toe_applicability` e `map_sbd_toe_review_scope`
- identificar gaps de schema para aplicabilidade, evidence e artefactos
- identificar gaps de schema para intenção operacional, canonicidade e equivalência PT/EN
- propor campos mínimos para reduzir desambiguação fraca entre `source code repository` e `compliance repository`
- implementar o mínimo seguro ou deixar design incremental claro
- explicitar impacto nos artefactos publicados
