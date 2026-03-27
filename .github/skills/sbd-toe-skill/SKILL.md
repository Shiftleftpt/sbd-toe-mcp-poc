---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: documentation
produced_by: executor
target: ai-client
slice_id: s9
---

# SbD-ToE MCP Server — Skill Guide

Este guia orienta o modelo a usar eficientemente o servidor MCP `sbd-toe-mcp-poc` para responder
a perguntas sobre o manual **Security by Design — Theory of Everything (SbD-ToE)**.

> **SbD-ToE = Security by Design — Theory of Everything.**
> Nunca "Trail of Evidence", nunca "Terms of Engagement".

---

## Workflow recomendado por tipo de pergunta

### Tipo 1 — Pergunta conceptual ("O que é X?", "Como funciona Y?")

```
1. search_sbd_toe_manual(question="<pergunta>")
   → obtém contexto grounded do manual
2. Responder com base no contexto devolvido
   → citar ART-* ou CTRL-* relevantes quando disponíveis
```

### Tipo 2 — Avaliação de aplicabilidade ("O que se aplica ao meu projecto?")

```
1. map_sbd_toe_applicability(riskLevel="L2", technologies=["containers","ci-cd"])
   → obtém active/excluded/activatedBundles
2. get_sbd_toe_chapter_brief(chapterId="<id>")   [opcional, para detalhe]
   → obtém fases, artefactos e intent_topics de cada capítulo relevante
3. Apresentar bundles activados com reasoning
```

### Tipo 3 — Pesquisa de entidades específicas (controlos, artefactos, práticas)

```
1. query_sbd_toe_entities(query="<pesquisa>", entityType="practice_assignment")
   → localiza entidades por semântica
2. search_sbd_toe_manual(question="<contexto adicional>")   [se necessário]
   → enriquece com contexto narrativo
```

### Tipo 4 — Listagem de capítulos / navegação estrutural

```
1. list_sbd_toe_chapters()   ou   list_sbd_toe_chapters(riskLevel="L1")
   → obtém lista com id, title e readableTitle
2. get_sbd_toe_chapter_brief(chapterId="<id>")   [para capítulos de interesse]
```

### Tipo 5 — Resposta assistida com sampling (quando disponível)

```
1. answer_sbd_toe_manual(question="<pergunta>")
   → faz retrieval + sampling no cliente MCP
   → se sampling indisponível, devolve top-3 documentos com sampling_unavailable: true
```

---

## Mapeamento de domínios SbD-ToE → chapterId

| Domínio / Tecnologia        | chapterId                        | readableTitle                  |
|-----------------------------|----------------------------------|--------------------------------|
| Fundamentos, conceitos base | `00-fundamentos`                 | Fundamentos SbD-ToE            |
| Classificação de aplicações | `01-classificacao-aplicacoes`    | Classificação de Aplicações    |
| Requisitos de segurança     | `02-requisitos-seguranca`        | Requisitos de Segurança        |
| Threat modeling / ameaças   | `03-threat-modeling`             | Threat Modeling                |
| Arquitectura e design       | `04-arquitetura-segura`          | Arquitetura Segura             |
| Dependências, SBOM, SCA     | `05-dependencias-sbom-sca`       | Dependências, SBOM e SCA       |
| Boas práticas de código     | `06-desenvolvimento-seguro`      | Desenvolvimento Seguro         |
| CI/CD, pipelines            | `07-cicd-seguro`                 | CI/CD Seguro                   |
| IaC, infraestrutura         | `08-iac-infraestrutura`          | IaC e Infraestrutura           |
| Containers, Kubernetes      | `09-containers-imagens`          | Containers e Imagens           |
| SAST, DAST, pentest         | `10-testes-seguranca`            | Testes de Segurança            |
| Deploy, release             | `11-deploy-seguro`               | Deploy Seguro                  |
| Monitoring, observability   | `12-monitorizacao-operacoes`     | Monitorização e Operações      |
| Formação, onboarding        | `13-formacao-onboarding`         | Formação e Onboarding          |
| Governance, contratos       | `14-governanca-contratacao`      | Governança e Contratação       |

---

## Convenções canónicas

### Identificadores de artefactos (`ART-*`)

Os artefactos são identificados com prefixo `ART-` seguido do chapterId.
Exemplo: `ART-01-classificacao-ativos` refere-se ao artefacto principal do capítulo 01.

Use `get_sbd_toe_chapter_brief` para obter a lista de `artifact_ids` de um capítulo.

### Identificadores de controlos (`CTRL-*`)

Os controlos de segurança são referenciados como `CTRL-<capítulo>-<número>`.
Exemplo: `CTRL-03-001` é o primeiro controlo do capítulo de Modelação de Ameaças.

Use `query_sbd_toe_entities(query="CTRL-03", entityType="control")` para listar controlos.

### Níveis de risco (`L1`, `L2`, `L3`)

| Nível | Descrição                              | Âmbito típico                          |
|-------|----------------------------------------|----------------------------------------|
| `L1`  | Risco baixo / projecto interno simples | Aplicações internas sem dados sensíveis |
| `L2`  | Risco médio / exposição parcial        | APIs públicas, dados de utilizadores   |
| `L3`  | Risco alto / dados críticos ou pessoais| Dados pessoais, sistemas regulados     |

---

## Exemplos ponta-a-ponta

### Exemplo 1 — "Que capítulos se aplicam ao meu projecto com containers em L2?"

```
Pergunta: "Que capítulos SbD-ToE se aplicam a um projecto L2 com containers e CI/CD?"

→ map_sbd_toe_applicability({
    riskLevel: "L2",
    technologies: ["containers", "ci-cd"]
  })

Resultado esperado:
  activatedBundles.foundationBundles: [01, 02, 03]  ← sempre obrigatórios
  activatedBundles.domainBundles:     [06, 09]       ← L2+ e containers
  activatedBundles.operationalBundles:[07, 11]       ← ci-cd e L2+

→ Apresentar lista com readableTitle de cada capítulo activado
→ Para cada bundle: explicar a reason do brief
```

### Exemplo 2 — "O que são SBOM e como implementar?"

```
Pergunta: "O que é SBOM e como o SbD-ToE recomenda implementar?"

→ search_sbd_toe_manual(question="O que é SBOM e como implementar?")

Resultado esperado:
  Documentos do capítulo 05-dependencias-sbom-sca
  Referências a ART-05-* e práticas de geração de SBOM

→ Responder com contexto grounded, citar chapterId e artefactos relevantes
```

### Exemplo 3 — "Quais os controlos de autenticação para uma API pública L2?"

```
Pergunta: "Quais os controlos de autenticação para uma API pública L2?"

→ query_sbd_toe_entities({
    query: "autenticação autorização API",
    chapterId: "08-autenticacao-autorizacao",
    riskLevel: "L2"
  })

→ get_sbd_toe_chapter_brief(chapterId="08-autenticacao-autorizacao")

Resultado esperado:
  Lista de practice_assignments com risk_levels incluindo L2
  Artefactos: ART-08-*
  intent_topics: ["oauth2", "jwt", "rbac", ...]
```

---

## Quando NÃO usar este servidor MCP

- **Perguntas fora do âmbito SbD-ToE**: questões genéricas de programação, arquitectura não relacionada com segurança, ou ferramentas externas ao manual (ex: AWS, Azure, frameworks específicos)
- **Perguntas sobre outros frameworks**: OWASP ASVS, ISO 27001, NIST — o servidor só contém o manual SbD-ToE
- **Geração de código**: o servidor fornece contexto documental, não gera código
- **Pesquisa web ou documentação externa**: todas as respostas são baseadas no snapshot local do manual
- **Quando o utilizador claramente não está a trabalhar num projecto de software**: ex: questões de gestão pura, RH, etc.

Se a pergunta estiver fora do âmbito, responde directamente sem chamar tools.
