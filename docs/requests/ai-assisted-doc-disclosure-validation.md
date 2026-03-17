# Exigir disclosure e revisão humana para documentos gerados com apoio de IA/MCP

## Contexto

Este repositório já usa o `sbd-toe-mcp-poc` como apoio a iterações com Copilot e outros agentes para produzir documentação técnica e de compliance, por exemplo:

- `docs/dora-applicability.md`
- `docs/threat-model.md`
- outros documentos de risco, aplicabilidade, governação ou segurança

Nesses casos, mesmo quando o conteúdo fica útil, continua a ser importante deixar explícito que:

- houve assistência de IA/MCP na geração ou redação do documento
- o documento não deve ser tratado como automaticamente validado
- é necessária revisão humana antes de merge ou uso externo

O objetivo não é "detetar autoria por probabilidade" como mecanismo primário. O objetivo é ter uma política explícita, verificável e aplicável em PR/CI.

## Pedido

Desenhar e, quando fizer sentido, implementar uma capacidade de governance/validação que exija disclosure e revisão manual para documentos sensíveis gerados ou substancialmente editados com apoio de IA/MCP.

Quero avaliar um desenho com estas peças:

1. formato obrigatório de disclosure no ficheiro
2. template de PR com confirmação explícita
3. validação automática em GitHub Actions
4. opcionalmente CODEOWNERS/revisão humana obrigatória para certos tipos de documentos

Exemplos de formato aceitável:

- front matter com campos como `ai_assisted`, `manual_review_required`, `reviewed_by`, `review_date`
- ou banner Markdown padrão no topo do documento

## Artefactos relevantes

- `.github/pull_request_template.md`
- `.github/workflows/ci.yml`
- `docs/dora-applicability.md`
- `docs/threat-model.md`
- `docs/sbd-toe-applicability.md`
- `SECURITY.md`
- `.github/CODEOWNERS`

## Restrições

- Não depender de deteção probabilística de autoria por IA como gate principal.
- Não assumir que o MCP consegue, por si só, impor política de merge.
- O enforcement real deve viver no repositório, via CI/checks e regras de revisão.
- A solução deve ser simples de manter e suficientemente explícita para contribuidores humanos.
- Se existir análise heurística opcional, deve ser advisory e não condição principal de merge.

## Resultado esperado

Quero no fim:

1. proposta de política para documentos assistidos por IA
2. formato padrão de disclosure recomendado
3. desenho de validação em PR/CI
4. decisão sobre se o check deve falhar em falta de disclosure
5. decisão sobre que tipos de documento entram no scope inicial
6. recomendação sobre CODEOWNERS / branch protection para estes docs

## Direção provável

Uma primeira versão razoável deverá incluir:

- um formato padrão de disclosure no topo do documento
- um script do repositório que analise os ficheiros alterados no PR
- um workflow GitHub Actions que falhe se documentos sensíveis não tiverem o disclosure obrigatório
- atualização do PR template para obrigar confirmação de revisão humana

Scope inicial provável:

- `docs/*applicability*.md`
- `docs/*threat-model*.md`
- `docs/*risk*.md`
- `docs/*security*.md`

## Resumo operacional

- definir o formato de disclosure obrigatório
- identificar os paths de documentação sensível a cobrir primeiro
- validar a presença do disclosure via script + GitHub Action
- reforçar a revisão humana via template de PR e, se necessário, CODEOWNERS
- tratar qualquer análise heurística de autoria por IA como opcional e advisory
