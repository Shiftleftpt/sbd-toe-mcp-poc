# sbd-toe-mcp-poc

Servidor MCP (Model Context Protocol) para VS Code, em Node.js/TypeScript, que faz retrieval local sobre snapshots semânticos publicados do manual SbD-ToE e os expõe ao chat via `stdio`.

> Estado atual: **PoC / primeira iteração publicável**. O foco desta versão é distribuição simples via GitHub Releases, uso local no VS Code, grounding forte e zero dependência de builder semântico em runtime.

## O que é este projeto

Este repositório empacota um servidor MCP que:

- corre localmente via `stdio`
- expõe tools e prompts MCP para consulta do manual
- usa o modelo configurado pelo utilizador no VS Code
- faz retrieval local sobre um bundle embutido em `data/publish/`
- devolve contexto grounded, citações e metadados úteis para debug

O objetivo é responder melhor, dentro do VS Code, a perguntas práticas sobre o ecossistema SbD-ToE, por exemplo:

```text
quais os requisitos de autenticacao que preciso implementar para esta aplicacao L1
```

ou:

```text
Que policies governam pipelines CI/CD?
```

## Porque existe

O manual SbD-ToE é a fonte editorial canónica, mas o consumo prático dentro do editor exige uma camada técnica própria:

- descoberta contextual no momento da pergunta
- recuperação determinística de records relevantes
- composição de prompt grounded
- integração direta com o chat do VS Code

Este repositório existe para fazer essa ponte, sem duplicar o papel dos outros repositórios do ecossistema.

## Relação com o ecossistema SbD-ToE

| Repositório | Papel |
| --- | --- |
| `Shiftleftpt/SbD-ToE-Manual` | fonte editorial canónica do manual |
| `sbd-toe-knowledge-graph` | builder/publicador dos snapshots semânticos |
| `sbd-toe-mcp-poc` | consumer MCP para uso local no VS Code |

Este projeto **consome** artefactos já produzidos pelo `sbd-toe-knowledge-graph`. Não reindexa o manual, não reconstrói semântica e não substitui o builder.

## O que faz

- consulta os snapshots `SbD-ToE-ASKAI-Docs` e `SbD-ToE-ASKAI-Entities`
- faz ranking local observável para seleção de contexto
- expõe as tools `search_sbd_toe_manual`, `answer_sbd_toe_manual` e `inspect_sbd_toe_retrieval`
- expõe a prompt MCP `ask_sbd_toe_manual`
- permite debug forte quando `debug=true` ou `DEBUG_MODE=true`
- usa sampling MCP opcionalmente, mantendo o modelo do lado do utilizador

## O que não faz

- não faz parsing do corpus Markdown
- não reconstrói bundles semânticos
- não reindexa o manual
- não depende de Algolia em runtime
- não executa retrieval remoto
- não mantém memória conversacional
- não substitui o VS Code Chat nem o `sbd-toe-knowledge-graph`

## Arquitetura resumida

1. O utilizador faz uma pergunta no chat do VS Code.
2. O chat chama `search_sbd_toe_manual` ou `answer_sbd_toe_manual`.
3. O servidor MCP lê os snapshots locais embutidos em `data/publish/`.
4. O retrieval combina records documentais e estruturados.
5. O servidor devolve contexto grounded com citações `[D1]`, `[E1]`, links e debug.
6. O modelo do utilizador responde com base nesse contexto.

O papel detalhado deste repositório está documentado em [`docs/role.md`](docs/role.md).

## Ferramentas MCP expostas

- `search_sbd_toe_manual`
  - tool principal para o fluxo normal de chat
  - devolve contexto grounded sem obrigar a sampling
- `answer_sbd_toe_manual`
  - usa retrieval local e pede a resposta final ao modelo do utilizador via MCP sampling
- `inspect_sbd_toe_retrieval`
  - mostra retrieval, seleção final e prompt montado
  - útil para tuning, grounding e troubleshooting
- `ask_sbd_toe_manual`
  - prompt MCP/slash command para orientar o chat a usar retrieval antes de responder

## Distribuição e release bundle

O canal principal de distribuição é **GitHub Releases**, não npm. O `package.json` permanece com `private: true` de propósito.

Cada release publica um bundle utilizável com convenção de nome explícita:

- `sbd-toe-mcp-poc-vX.Y.Z-bundle.tar.gz`
- `sbd-toe-mcp-poc-vX.Y.Z-bundle.zip`
- `sbd-toe-mcp-poc-vX.Y.Z-bundle.sha256`

O bundle inclui:

- `dist/`
- `data/publish/`
- `data/reports/run_manifest.json`
- `prompts/`
- `examples/`
- `docs/`
- `.vscode/mcp.json`
- `.env.example`
- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- ficheiros de licença

O bundle **não** inclui:

- `node_modules`
- checkout completo do upstream
- tooling de desenvolvimento desnecessário para runtime

## Como os snapshots são distribuídos

`data/publish/` é tratado como parte intencional do produto:

- fica **versionado no repositório**
- fica **incluído no artefacto de release**
- é a base do retrieval local em runtime

Isto significa que:

- o utilizador **não precisa** de Algolia
- o utilizador **não precisa** de correr o builder semântico
- o utilizador **não precisa** de fazer checkout do `sbd-toe-knowledge-graph` para usar o servidor

O ficheiro `data/reports/run_manifest.json` mantém a proveniência do snapshot embutido.

## Instalação via GitHub Release

Fluxo recomendado para utilizadores finais:

1. Descarregar o asset `sbd-toe-mcp-poc-vX.Y.Z-bundle.zip` ou `sbd-toe-mcp-poc-vX.Y.Z-bundle.tar.gz` em **GitHub Releases**.
2. Extrair o archive para um diretório local.
3. Confirmar que a extração já inclui `dist/` e `data/publish/`.
4. Copiar `.env.example` para `.env`.
5. Abrir a pasta extraída no VS Code.
6. Reutilizar o `.vscode/mcp.json` já incluído no bundle.
7. Abrir o chat e usar perguntas reais sobre o manual.

Exemplo:

```bash
cp .env.example .env
```

Depois de extrair a release, não é necessário correr `npm ci` nem `npm run build`.
Também não é necessário editar manualmente a configuração MCP se usares a pasta extraída como workspace do VS Code.

## Instalação a partir do source

Se preferires trabalhar a partir do source deste repositório:

```bash
npm ci
npm run check
npm run build
```

O checkout de source já traz `data/publish/` versionado. Portanto, mesmo a partir do source, o uso normal do MCP **não** depende do builder semântico.

O script abaixo é apenas para mantenedores que queiram atualizar o bundle embutido a partir de um checkout local do `sbd-toe-knowledge-graph`:

```bash
npm run checkout:backend
```

## Configuração `.env`

Copiar `.env.example` para `.env` e ajustar apenas o que fizer sentido para o teu ambiente local.

Variáveis mais relevantes para runtime:

| Variável | Uso |
| --- | --- |
| `DOCS_SNAPSHOT_FILE` | snapshot documental local |
| `ENTITIES_SNAPSHOT_FILE` | snapshot de entidades local |
| `INDEX_SETTINGS_FILE` | metadados dos índices publicados |
| `RUN_MANIFEST_FILE` | proveniência do bundle embutido |
| `SYSTEM_PROMPT_FILE` | system prompt usada pela tool de answer |
| `DEBUG_MODE` | ativa debug adicional nas respostas |

Variáveis de manutenção opcional:

| Variável | Uso |
| --- | --- |
| `UPSTREAM_KNOWLEDGE_GRAPH_DIR` | checkout local do `sbd-toe-knowledge-graph` |
| `BACKEND_CHECKOUT_FILE` | manifesto local do último refresh do bundle |

Não há API keys obrigatórias neste projeto: o modelo continua a ser o do utilizador no VS Code.

## Integração com VS Code

O exemplo de configuração está em [`examples/vscode.mcp.json`](examples/vscode.mcp.json).

Para o fluxo mais simples via GitHub Release, o bundle já inclui [`.vscode/mcp.json`](.vscode/mcp.json) com este formato:

```json
{
  "servers": {
    "sbdToe": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Se abrires a pasta extraída no VS Code, `${workspaceFolder}` passa a apontar para esse bundle e o editor pode usar a configuração diretamente.

Exemplo realista para um bundle extraído fora do workspace atual:

```json
{
  "servers": {
    "sbdToe": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/sbd-toe-mcp-poc/dist/index.js"],
      "envFile": "/absolute/path/to/sbd-toe-mcp-poc/.env"
    }
  }
}
```

Se estiveres a trabalhar diretamente neste repositório, podes adaptar para `${workspaceFolder}`.

## Exemplo de uso no chat

Perguntas úteis para validar a integração:

```text
quais os requisitos de autenticacao que preciso implementar para esta aplicacao L1
```

```text
Que policies governam pipelines CI/CD?
```

Comportamento esperado:

- o chat usa `search_sbd_toe_manual` ou `answer_sbd_toe_manual`
- o MCP recupera records relevantes do bundle local
- a resposta final usa apenas o contexto recuperado
- a resposta cita records e aponta páginas determinísticas quando existirem

## Troubleshooting e debug

- Se `dist/` não existir, estás provavelmente num checkout de source sem build concluído.
- Se `data/publish/` não existir, a instalação está incompleta ou o archive foi extraído incorretamente.
- Se o cliente MCP não suportar `sampling`, usa `search_sbd_toe_manual` como fluxo principal.
- Usa `inspect_sbd_toe_retrieval` para ver retrieval, seleção final e prompt montado.
- Ativa `DEBUG_MODE=true` para anexar metadados de debug à resposta.
- Se precisares de atualizar o snapshot embutido, usa `npm run checkout:backend` a partir de um checkout local do `sbd-toe-knowledge-graph`.

## Contribuição

O fluxo de contribuição está em [`CONTRIBUTING.md`](CONTRIBUTING.md).

Em resumo:

- trunk-based development com `master`
- branches `feat/`, `fix/`, `docs/`, `chore/` e `hotfix/`
- validação local com `npm ci`, `npm run check` e `npm run build`
- teste manual no VS Code antes de abrir PR
- squash merge para `master`
- releases por tag `vX.Y.Z`

## Próximas iterações

Os pontos abertos e candidatos a evolução futura estão em [`NEXT-STEPS.md`](NEXT-STEPS.md), incluindo a hipótese de uma extensão wrapper para publicação no VS Code Marketplace.

## Suporte

Ver [`SUPPORT.md`](SUPPORT.md).

## Segurança

Ver [`SECURITY.md`](SECURITY.md). Vulnerabilidades devem ser reportadas em privado por email, nunca por issue público.

## Licença

Este repositório usa **split licensing**:

- código e runtime: [`LICENSE`](LICENSE) (`Apache-2.0`)
- documentação e snapshots embutidos: [`LICENSE-DATA`](LICENSE-DATA) (`CC BY-SA 4.0`)
- nota de mapeamento e atribuição: [`LICENSE-NOTE.md`](LICENSE-NOTE.md)
