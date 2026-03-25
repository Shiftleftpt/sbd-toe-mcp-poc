---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: documentation
reasoning: Feature request for repository-specific SbD-ToE guidance tool
review_status: pending-human-review
---

# Gerar guidance SbD-ToE adaptada a um repositório concreto

## Contexto

O uso recente do `sbd-toe-mcp-poc` com o Copilot mostrou um padrão recorrente: além de responder perguntas livres sobre o manual, também é útil produzir guidance estruturada adaptada ao projeto em causa.

Exemplos de output desejado:

- base para `.github/copilot-instructions.md`
- base para `docs/sbd-toe-applicability.md`
- mapeamento "tipo de alteração -> capítulo a consultar"
- lista de evidência esperada neste repositório
- exceções formais prováveis no estado atual do projeto

Hoje isto pode ser obtido por iteração com prompting livre e retrieval manual, mas esse processo:

- depende bastante da qualidade do prompting
- não é facilmente repetível entre repositórios
- torna mais difícil manter coerência editorial no ecossistema SbD-ToE

O problema não é "editar ficheiros automaticamente". O problema é traduzir o manual para guidance de projeto estruturada e reutilizável.

## Pedido

Avaliar se faz sentido expor, no `sbd-toe-mcp-poc`, uma tool específica para gerar guidance de projeto a partir do manual SbD-ToE.

Nome de trabalho sugerido:

- `draft_sbd_toe_repo_guidance`

ou, alternativamente:

- `build_sbd_toe_project_guidance`

Quero uma avaliação e, se fizer sentido, um desenho de schema e comportamento para uma tool que receba o contexto de um repositório e devolva guidance estruturada que possa alimentar artefactos como `copilot-instructions.md`.

## Artefactos relevantes

- `.github/copilot-instructions.md`
- `docs/sbd-toe-applicability.md`
- `docs/role.md`
- `docs/requests/mcp-structured-tools.md`
- `docs/requests/sbd-review-scope-tool.md`
- `data/publish/algolia_docs_records.json`
- `data/publish/algolia_entities_records.json`

## Restrições

- A tool não deve editar ficheiros do repositório.
- A tool não deve ser um executor de shell nem um leitor arbitrário do workspace.
- O output deve ser guidance estruturada, não claims de conformidade automáticas.
- A tool deve preservar a separação entre:
  - consulta semântica do manual
  - edição efetiva da documentação do repo por agente/humano
- Se os índices atuais não oferecerem estrutura suficiente, isso deve ser explicitado.

## Resultado esperado

Quero no fim:

1. decisão sobre se esta capability deve existir como tool MCP
2. nome recomendado da tool
3. schema proposto de input/output
4. avaliação de viabilidade com os índices atuais
5. relação desta tool com `map_sbd_toe_applicability` e `map_sbd_toe_review_scope`
6. gaps de índice que devam ser tratados no `sbd-toe-knowledge-graph`

## Schema proposto

Input mínimo sugerido:

```json
{
  "projectName": "sbd-toe-mcp-poc",
  "repoRole": "mcp-wrapper",
  "riskLevel": "L1",
  "runtimeModel": "local-stdio",
  "techStack": ["nodejs", "typescript", "vscode-mcp"],
  "distributionModel": "github-release-bundle",
  "hasCi": true,
  "hasReleaseWorkflow": true,
  "hasRuntime": false,
  "usesContainers": false,
  "usesIaC": false,
  "hasOperationalMonitoring": false
}
```

Output mínimo sugerido:

```json
{
  "classification": {
    "riskLevel": "L1",
    "assumptions": [
      "local stdio transport",
      "public documentation corpus",
      "consultative tool without automated external actuation"
    ]
  },
  "chapterApplicability": [
    {
      "chapterId": "01",
      "title": "Classificacao de Criticidade",
      "applicability": "direct",
      "reason": "defines baseline risk framing for all subsequent controls"
    }
  ],
  "changeTriggers": [
    {
      "context": "src/",
      "reviewChapters": ["02", "06"],
      "themes": ["T05", "T08"],
      "expectedEvidence": [
        "input validation",
        "safe error handling"
      ]
    }
  ],
  "expectedEvidence": [
    {
      "area": "ci-cd",
      "artifacts": [
        ".github/workflows/ci.yml",
        ".github/workflows/release.yml"
      ]
    }
  ],
  "likelyExceptions": [
    "full authentication controls",
    "session lifecycle controls"
  ],
  "copilotInstructionsOutline": {
    "sections": [
      "repository role",
      "risk classification",
      "chapter consultation order",
      "change triggers",
      "project-specific guardrails"
    ]
  }
}
```

## Resumo operacional

- avaliar se guidance de projeto merece uma tool própria ou se deve ser derivada de outras tools
- comparar esta capability com `map_sbd_toe_applicability` e `map_sbd_toe_review_scope`
- testar até que ponto os índices atuais suportam output estruturado deste tipo
- explicitar o que é guidance e o que continua a exigir edição humana
- registar gaps de schema no upstream se faltarem capítulos, evidence ou artefactos normalizados
