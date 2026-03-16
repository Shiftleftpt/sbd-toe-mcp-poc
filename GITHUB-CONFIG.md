# Configuração Recomendada no GitHub UI

Este documento cobre apenas o que **não** fica totalmente controlado por ficheiros versionados no repositório.

## 1. Default branch

- definir `master` como default branch

## 2. Branch protection ou ruleset para `master`

Configuração recomendada:

- Require a pull request before merging
- Require conversation resolution before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require linear history
- Do not allow force pushes
- Do not allow deletions

### Checks obrigatórios recomendados

- `Validate`
- `Analyze (javascript-typescript)`

### Aprovações

Enquanto existir apenas um mantenedor:

- `0` approvals pode ser aceitável
- manter os checks obrigatórios

Quando houver 2 ou mais contribuidores ativos:

- exigir pelo menos `1` approval
- ativar `Require review from Code Owners`
- ativar `Require approval from someone other than the last pusher`
- ativar `Dismiss stale approvals`

## 3. Security & analysis

Ativar:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Code scanning
- Secret scanning
- Push protection
- Private vulnerability reporting

Se o GitHub tiver `default setup` de CodeQL ativo, desativá-lo antes de usar o workflow customizado deste repositório.

## 4. GitHub Discussions

Recomendado:

- ativar GitHub Discussions para dúvidas de uso, integração com VS Code e perguntas não-bug
- manter bugs, documentação, enhancement e segurança fora de Discussions

## 5. Labels mínimas recomendadas

- `tipo:bug`
- `tipo:documentacao`
- `tipo:feature`
- `tipo:seguranca`
- `tipo:chore`
- `status:triage`
- `status:em-progresso`
- `status:bloqueado`
- `area:runtime`
- `area:release`
- `area:docs`
- `area:data`
- `area:github`

## 6. CODEOWNERS

O ficheiro versionado em `.github/CODEOWNERS` só produz efeito real quando:

- está presente no branch base do PR
- os owners têm permissões de escrita no repositório
- o branch protection ou ruleset exige review por code owners

## 7. Release settings

Recomendado:

- usar GitHub Releases como canal principal de distribuição
- manter `Latest release` apontado para a release estável mais recente
- publicar apenas tags `vX.Y.Z`
- evitar editar manualmente os assets anexados pela automação

## 8. Actions permissions

Em `Settings -> Actions -> General`:

- permitir GitHub Actions oficiais usadas no repositório
- manter permissões padrão reduzidas
- exigir aprovação para workflows vindos de forks

## 9. Security contact

Confirmar que o contacto operacional publicado é:

- `security@shiftleft.pt`

## 10. Verificação rápida pós-configuração

1. abrir um PR de teste para `master`
2. confirmar execução de `Validate`
3. confirmar execução de `Analyze (javascript-typescript)`
4. confirmar que push direto para `master` está bloqueado
5. confirmar que issues mostram as templates configuradas
6. confirmar que o `Security` tab apresenta policy e features ativas
