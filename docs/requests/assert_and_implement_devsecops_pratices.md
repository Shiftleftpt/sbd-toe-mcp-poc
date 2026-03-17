# Introduzir tools MCP para planeamento de governação de repositórios com base no SbD-ToE

## Contexto

O servidor MCP `sbd-toe-mcp-poc` consome índices e entidades produzidos pelo repositório `sbd-toe-knowledge-graph`.

O objetivo do MCP é permitir que agentes e ferramentas (por exemplo VS Code ou Copilot) possam:

- consultar práticas SbD-ToE
- avaliar aplicabilidade
- planear ações de engenharia segura

Com a introdução de controlos de governação de repositórios no manual SbD-ToE, torna-se possível suportar um novo tipo de tool:

**planeamento de baseline de segurança para repositórios e plataformas de desenvolvimento.**

Esta tool deve permitir responder a perguntas como:

- "Estou a criar um novo repositório para uma aplicação L2. Que controlos devo aplicar?"
- "Este repositório cumpre as práticas SbD-ToE para governação de repositórios?"
- "Que alterações devo aplicar para alinhar este repositório com o playbook?"

## Pedido

Introduzir no MCP uma ou mais tools orientadas a **planeamento de governação de repositórios** com base nas práticas SbD-ToE.

Exemplo de tool principal:

`plan_sbd_toe_repo_governance`

Inputs possíveis:

- tipo de repositório
- plataforma (`github`, `gitlab`, etc.)
- nível de risco (`L1`, `L2`, `L3`)
- contexto organizacional (`solo`, `team`, `regulated`)
- estado atual opcional do repositório

Output esperado:

- controlos aplicáveis
- controlos obrigatórios
- controlos recomendados
- evidência esperada
- gaps face ao baseline
- recommended next steps

Opcionalmente, uma segunda tool pode gerar **plano de implementação específico para GitHub**, incluindo:

- regras de branch protection
- required checks
- labels a criar
- security features a ativar
- comandos `gh` ou payloads de API correspondentes

Importante: estas tools devem **gerar planos e recomendações**, não aplicar alterações automaticamente.

## Artefactos relevantes

- índices gerados pelo `sbd-toe-knowledge-graph`
- entidades e campos estruturados associados a controlos e evidência

## Restrições

- não aplicar alterações diretamente em repositórios
- gerar apenas planos e recomendações
- manter compatibilidade com outras tools MCP existentes
- evitar dependência exclusiva de GitHub

## Resultado esperado

1. nova tool MCP para planeamento de baseline de governação de repositórios
2. integração com entidades e práticas do SbD-ToE
3. outputs estruturados e utilizáveis por agentes ou developers
4. base para futura tool de geração de planos de hardening de repositórios