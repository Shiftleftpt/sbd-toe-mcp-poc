# Next Steps

Este ficheiro lista pontos abertos e candidatos a próximas iterações do `sbd-toe-mcp-poc`.

Não é um compromisso fechado de roadmap. Serve para tornar explícito o que ficou intencionalmente fora desta iteração.

Pedidos estruturados, handovers e prompts de próximas iterações devem ser guardados em `docs/requests/`.

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

Estas evoluções devem manter o limite arquitetural atual:

- sem backend remoto em runtime
- sem reconstrução semântica neste repo
- sem deslocar responsabilidades do `sbd-toe-knowledge-graph`
