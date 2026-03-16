# Next Steps

Este ficheiro lista pontos abertos e candidatos a próximas iterações do `sbd-toe-mcp-poc`.

Não é um compromisso fechado de roadmap. Serve para tornar explícito o que ficou intencionalmente fora desta iteração.

Pedidos estruturados, handovers e prompts de próximas iterações devem ser guardados em `docs/requests/`.

Pedidos atualmente registados:

- `docs/requests/mcp-structured-tools.md`
- `docs/requests/knowledge-graph-index-enhancements.md`
- `docs/requests/mcp-retrieval-intent-normalization.md`
- `docs/requests/sbd-review-scope-tool.md`
- `docs/requests/sbd-repo-guidance-tool.md`

## 1. Distribuição no VS Code Marketplace

**Estado:** aberto

Objetivo:

- reduzir fricção de instalação para utilizadores finais
- aproximar a experiência de "instalar e usar"

Direção provável:

- criar uma extensão VS Code fina que faça wrapper deste servidor MCP
- registar o servidor automaticamente no VS Code
- empacotar como `.vsix`
- avaliar publicação no Visual Studio Code Marketplace

Notas:

- o artefacto atual deste repositório é um bundle de GitHub Release, não uma extensão VS Code
- este ponto deve ser tratado como uma camada adicional, sem substituir o papel deste repo como servidor MCP

## 2. Instalação ainda mais automática sem extensão

**Estado:** aberto

Possível melhoria intermédia:

- adicionar scripts de instalação para macOS, Linux e Windows
- usar `code --add-mcp` quando fizer sentido
- reduzir edição manual de configuração a zero fora do caso "abrir a pasta"

## 3. Experiência de onboarding no release

**Estado:** parcial

Próximos refinamentos possíveis:

- incluir instruções ultra-curtas por sistema operativo
- adicionar screenshots do setup no VS Code
- validar UX real com utilizadores que não conheçam MCP

## 4. Release hardening

**Estado:** parcial

Melhorias possíveis:

- smoke test do bundle extraído num ambiente limpo
- validação automática de integridade do archive
- eventual assinatura ou attestation de artefactos

## 5. Proveniência e atualização do bundle embutido

**Estado:** parcial

Melhorias possíveis:

- política mais explícita para refresh dos snapshots
- checklist de revisão para PRs que alterem `data/publish/`
- nota mais detalhada sobre proveniência e compatibilidade entre releases do MCP e snapshots

## 6. Governance GitHub fora do repositório

**Estado:** pendente no GitHub UI

Itens ainda dependentes de configuração manual:

- branch protection / rulesets
- required checks
- Discussions
- labels
- secret scanning e push protection
- private vulnerability reporting

Ver também `GITHUB-CONFIG.md`.

## 7. Possíveis iterações funcionais futuras

**Estado:** aberto

Sem compromisso para já:

- melhorar observabilidade de retrieval
- melhorar troubleshooting no VS Code
- refinar prompts e apresentação de citações
- evoluir o MCP para tools estruturadas por capítulo, entidade e aplicabilidade
- melhorar retrieval local com normalização de intenção e melhor aproveitamento de metadados publicados
- estudar uma capability/tool de "review scope" SbD-ToE em função do diff
- estudar uma tool de guidance de projeto para gerar base estruturada de `copilot-instructions` e documentação de aplicabilidade

### Prioridade sugerida

Ordem proposta com melhor relação valor/esforço, com base nas iterações já feitas:

1. tools estruturadas mínimas de navegação operacional
	- `list_sbd_toe_chapters`
	- `query_sbd_toe_entities`
	- `get_sbd_toe_chapter_brief`
2. capability de "review scope" para mapear capítulos, temas e evidência a rever a partir de paths/diff
3. robustez do retrieval livre
	- convergência PT/EN para perguntas semanticamente equivalentes
	- desambiguação de intenção operacional
	- distinção entre conteúdo canónico e conteúdo demo/training/example
4. guidance estruturada de projeto para gerar base reutilizável de instruções e documentação

### Gaps ainda não explicitados o suficiente

Pontos já observados em uso real do MCP que merecem acompanhamento explícito:

- perguntas equivalentes em PT e EN ainda não convergem de forma estável
- o retrieval ainda depende demasiado da formulação lexical exata da pergunta
- falta separar melhor guidance canónica de conteúdo de formação, demo ou addon
- ainda não existe um conjunto pequeno de queries de regressão para validar melhorias de retrieval
- ainda não existe um output estruturado e repetível para "quem faz / quando / com que evidência"

Estas evoluções devem manter o limite arquitetural atual:

- sem backend remoto em runtime
- sem reconstrução semântica neste repo
- sem deslocar responsabilidades do `sbd-toe-knowledge-graph`

Ver também:

- `docs/requests/mcp-structured-tools.md`
- `docs/requests/mcp-retrieval-intent-normalization.md`
- `docs/requests/sbd-review-scope-tool.md`
- `docs/requests/sbd-repo-guidance-tool.md`
