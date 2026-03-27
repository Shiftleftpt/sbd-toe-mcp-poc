---
# Installation: copy this file to .github/skills/sbd-toe-skill/SKILL.md in your project
# Claude Code will make it available as /skill sbd-toe-skill
---

# SbD-ToE MCP Server — Skill Guide

This guide configures Claude to use the `sbd-toe-mcp` MCP server to answer questions
about the **Security by Design — Theory of Everything (SbD-ToE)** manual.

> **SbD-ToE = Security by Design — Theory of Everything.**
> Never "Trail of Evidence". Never "Terms of Engagement".
> The manual has **15 chapters (00–14)**.

---

## Scope — what SbD-ToE is and is not

**SbD-ToE is a security guidance framework only.**
It guides *what security practices should be applied* at each phase of the development lifecycle.
It does NOT impose development standards, coding conventions, testing frameworks, or any other
non-security practice.

**SbD-ToE never overrides project rules.** If the project requires unit tests, linting, a specific
branching strategy, or any other development practice, those rules always apply regardless of
the project's risk level. An L1 classification does not reduce code quality requirements —
it only reduces the scope of *security controls* required.

Examples of what SbD-ToE does NOT govern:
- Whether to write unit tests (that is a project/team decision)
- Code style, linting, formatting
- Branching strategy or PR conventions
- Choice of frameworks, libraries, or languages
- General architecture decisions unrelated to security

Use SbD-ToE context only to answer questions explicitly about security practices, controls,
threat modelling, secure architecture, SBOM, secure CI/CD, or compliance.

---

## Core rule

**Never answer SbD-ToE questions from training knowledge.**
Always call a tool first. The MCP server contains the authoritative, up-to-date content.

---

## Workflow by question type

### Type 1 — Conceptual ("What is X?", "How does Y work?")

```
1. search_sbd_toe_manual(question="<question>")
   → retrieves grounded context from the manual
2. Answer based on retrieved context
   → cite ART-* or CTRL-* identifiers when available
```

### Type 2 — Project applicability ("What applies to my project?")

```
1. map_sbd_toe_applicability(riskLevel="L2", technologies=["containers","ci-cd"])
   → returns active/excluded/activatedBundles
2. get_sbd_toe_chapter_brief(chapterId="<id>")   [optional, for detail]
   → returns phases, artefacts and intent_topics per chapter
3. Present activated bundles with reasoning
```

### Type 3 — Specific entities (controls, artefacts, practices)

```
1. query_sbd_toe_entities(query="<search>", entityType="practice_assignment")
   → finds entities by semantic similarity
2. search_sbd_toe_manual(question="<context>")   [if needed]
   → enriches with narrative context
```

### Type 4 — Chapter listing / structural navigation

```
1. list_sbd_toe_chapters()   or   list_sbd_toe_chapters(riskLevel="L1")
   → returns list with id, title and readableTitle
2. get_sbd_toe_chapter_brief(chapterId="<id>")   [for chapters of interest]
```

### Type 5 — Document generation

```
1. generate_document(type="threat-model-template", riskLevel="L2")
   → returns structured document skeleton with required sections
```

### Type 6 — Repository governance

```
1. plan_sbd_toe_repo_governance(repoType="service", platform="github", riskLevel="L2")
   → returns governance plan with applicable controls and evidence checklist
```

### Type 7 — Code review scope

```
1. map_sbd_toe_review_scope(changedFiles=["src/auth.ts","infra/k8s.yaml"], riskLevel="L2")
   → maps changed files to relevant SbD-ToE knowledge bundles
```

---

## Chapter map

| Domain / Technology         | chapterId                        | Readable title                 |
|-----------------------------|----------------------------------|--------------------------------|
| Foundations, core concepts  | `00-fundamentos`                 | Fundamentos SbD-ToE            |
| Application classification  | `01-classificacao-aplicacoes`    | Classificação de Aplicações    |
| Security requirements       | `02-requisitos-seguranca`        | Requisitos de Segurança        |
| Threat modelling            | `03-threat-modeling`             | Threat Modeling                |
| Secure architecture         | `04-arquitetura-segura`          | Arquitetura Segura             |
| Dependencies, SBOM, SCA     | `05-dependencias-sbom-sca`       | Dependências, SBOM e SCA       |
| Secure coding               | `06-desenvolvimento-seguro`      | Desenvolvimento Seguro         |
| CI/CD pipelines             | `07-cicd-seguro`                 | CI/CD Seguro                   |
| IaC, infrastructure         | `08-iac-infraestrutura`          | IaC e Infraestrutura           |
| Containers, Kubernetes      | `09-containers-imagens`          | Containers e Imagens           |
| SAST, DAST, testing         | `10-testes-seguranca`            | Testes de Segurança            |
| Secure deploy, release      | `11-deploy-seguro`               | Deploy Seguro                  |
| Monitoring, observability   | `12-monitorizacao-operacoes`     | Monitorização e Operações      |
| Training, onboarding        | `13-formacao-onboarding`         | Formação e Onboarding          |
| Governance, contracts       | `14-governanca-contratacao`      | Governança e Contratação       |

---

## Risk levels

| Level | Description                        | Typical scope                          |
|-------|------------------------------------|----------------------------------------|
| `L1`  | Low risk / simple internal project | Internal apps without sensitive data   |
| `L2`  | Medium risk / partial exposure     | Public APIs, user data                 |
| `L3`  | High risk / critical or personal data | PII, regulated systems              |

---

## Identifier conventions

- **Artefacts**: `ART-<chapterId>-<name>` — e.g. `ART-03-threat-model`
- **Controls**: `CTRL-<chapter>-<number>` — e.g. `CTRL-03-001`
- Use `get_sbd_toe_chapter_brief` to list `artifact_ids` for a chapter
- Use `query_sbd_toe_entities(query="CTRL-03", entityType="control")` to list controls

---

## When NOT to use this server

- Questions outside SbD-ToE scope (generic programming, unrelated architecture)
- Other frameworks (OWASP ASVS, ISO 27001, NIST) — server only contains SbD-ToE
- Code generation — server provides documentary context, not code
- External web search or documentation — all answers are from the local manual snapshot
