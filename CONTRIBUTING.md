# Guia de Contribuição

Este repositório usa **trunk-based development**, com `master` como ramo principal e publicável.

O objetivo deste guia é manter o `sbd-toe-mcp-poc` coerente com o ecossistema SbD-ToE sem confundir o papel deste projeto com o do `sbd-toe-knowledge-graph` ou do `Shiftleftpt/SbD-ToE-Manual`.

## Antes de começar

- Verifica se já existe uma issue aberta para o tema.
- Se não existir, abre a issue adequada antes de iniciar a implementação.
- Mantém claro no PR se a alteração afeta runtime, release bundle, documentação, governance ou snapshots embutidos.

## Convenções de branches

| Tipo | Padrão | Uso |
| --- | --- | --- |
| principal | `master` | fonte de verdade |
| feature | `feat/<tema>` | novas capacidades |
| fix | `fix/<tema>` | correções funcionais |
| docs | `docs/<tema>` | README, docs, examples, governance |
| chore | `chore/<tema>` | build, tooling, CI, manutenção |
| hotfix | `hotfix/<tema>` | correção urgente pós-release |

Exemplos:

```bash
git switch -c feat/release-bundle-checksum
git switch -c docs/readme-public-install
git switch -c fix/retrieval-ranking-debug
```

## Convenções de commit

Usa mensagens curtas, explícitas e rastreáveis.

Formato recomendado:

```text
feat(release): attach bundled archives to GitHub releases
fix(retrieval): clamp invalid topK values
docs(readme): clarify VS Code installation from release asset
chore(ci): add CodeQL workflow
```

Se a alteração estiver ligada a uma issue, inclui a referência:

```text
feat(release): attach bundled archives to GitHub releases (#123)
```

## Fluxo de contribuição

1. Criar uma branch a partir de `master`.
2. Implementar a alteração com escopo pequeno e claro.
3. Executar validação local.
4. Testar manualmente o servidor no VS Code quando a alteração tocar runtime, prompts, config ou release bundle.
5. Abrir PR para `master`.
6. Referenciar a issue associada no corpo do PR com `Closes #<num>` quando aplicável.
7. Fazer merge por **Squash and Merge** depois dos checks obrigatórios passarem.

## Validação local obrigatória

Antes de abrir PR:

```bash
npm ci
npm run check
npm run build
```

Se a alteração tocar packaging de release, também é recomendado validar o bundle:

```bash
npm run package:release -- --version v0.1.0-local
```

## Teste manual no VS Code

Antes de abrir PR para mudanças de runtime, prompts, retrieval, config MCP ou release:

1. confirmar que `dist/` foi gerado com `npm run build`
2. confirmar que `data/publish/` existe
3. apontar o VS Code para `dist/index.js` e para o `.env`
4. testar perguntas reais, incluindo:

```text
quais os requisitos de autenticacao que preciso implementar para esta aplicacao L1
```

```text
Que policies governam pipelines CI/CD?
```

5. se necessário, usar `inspect_sbd_toe_retrieval` e `DEBUG_MODE=true`

## Issues, PRs e rastreabilidade

- Usa uma branch por tema ou issue.
- Liga PRs a issues com `Closes #<num>`.
- Se a alteração for apenas documental, usa a template de documentação.
- Não abras issues públicas para vulnerabilidades. Usa o processo descrito em `SECURITY.md`.

## Atualização dos snapshots embutidos

Este repositório **consome** artefactos publicados; não reconstrói o pipeline semântico.

Se precisares de atualizar o bundle embutido:

1. garante que o snapshot certo já foi produzido no `sbd-toe-knowledge-graph`
2. aponta `UPSTREAM_KNOWLEDGE_GRAPH_DIR` para esse checkout local
3. corre:

```bash
npm run checkout:backend
```

4. confirma as alterações em:

- `data/publish/`
- `data/reports/run_manifest.json`

Além disso, confirma localmente que `data/upstream/backend-checkout.json` foi regenerado, mas não o adiciones ao commit: é um artefacto de manutenção local e não faz parte do conteúdo público do repositório.

Ao rever um PR deste tipo, valida que a alteração é um refresh de artefactos publicados e não uma reconstrução ad hoc feita neste repo.

## Releases e versionamento

- O branch de release é `master`.
- Cada release pública é marcada por uma tag `vX.Y.Z`.
- O workflow de release só deve ser usado para tags que apontem para commits contidos em `master`.
- O asset principal é o bundle gerado para GitHub Releases, não um package npm.

Fluxo recomendado:

1. merge aprovado para `master`
2. criar tag anotada `vX.Y.Z`
3. fazer push da tag
4. deixar o workflow `Release` validar, empacotar e anexar os assets

## Regras práticas

- Não alterar a arquitetura MCP nesta linha de contribuição sem discussão explícita.
- Não introduzir runtime remoto, backend HTTP ou dependência de Algolia em runtime.
- Não mover a responsabilidade de build semântico para este repo.
- Quando mudares docs públicas, mantém coerência editorial com o ecossistema SbD-ToE, mas adapta ao contexto técnico deste projeto.
