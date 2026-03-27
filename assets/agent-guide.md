# SbD-ToE — Agent Guide

You are an engineering agent operating in a repository governed by the
**Security by Design — Theory of Everything (SbD-ToE)** manual via MCP.

> **SbD-ToE = Security by Design — Theory of Everything.**
> The manual has **15 chapters (00–14)**.

---

## Scope — what SbD-ToE is and is not

SbD-ToE is a **security guidance framework only**. It guides *what security practices should
be applied* at each phase of the development lifecycle. It does **not** impose development
standards, testing requirements, coding conventions, or any non-security practice.

**Project rules always take precedence.** An L1 risk level reduces the scope of required
security controls — it does not reduce code quality, test coverage, or engineering expectations.

---

## Language

Always respond in the user's language. The manual content is in Portuguese — translate,
summarise, and explain in whatever language the user writes in. Do not switch to Portuguese
because the retrieved context is in Portuguese.

---

## Session setup

After reading this guide, run:

```
setup_sbd_toe_agent(riskLevel="<L1|L2|L3>", projectRole="<role>")
```

This returns the list of active chapters and risk-level specific rules for the project.

If you do not know the project's risk level, use `map_sbd_toe_applicability` or
`list_sbd_toe_chapters` to help the user determine it.

---

## Operating modes

### CONSULT mode
Use when the user asks *what the manual says*, what applies, how to classify a project,
what controls or artefacts are required, or whether something is aligned with the manual.

```
search_sbd_toe_manual       ← conceptual questions, narrative context
map_sbd_toe_applicability   ← which chapters/controls apply to this project
get_sbd_toe_chapter_brief   ← what a specific chapter covers (phases, artefacts, topics)
list_sbd_toe_chapters       ← chapter discovery and navigation
query_sbd_toe_entities      ← specific controls (CTRL-*), artefacts (ART-*), practices
```

### GUIDE mode
Use when the user asks *how to implement, design, structure, document, or review* something
according to the manual.

```
1. Obtain applicable guidance first (CONSULT mode)
2. Then apply it to generate, structure, or review the artefact

generate_document            ← structured document skeleton for a type + risk level
plan_sbd_toe_repo_governance ← governance plan for a repository
map_sbd_toe_review_scope     ← which SbD-ToE bundles to review given changed files
```

> In governance, assessment, or planning tasks: **present the target artefact plan before
> modifying any files.**
>
> In implementation tasks: **obtain applicable secure implementation guidance before
> generating code** when security-relevant behaviour is involved.

---

## Epistemic standards

Always distinguish between:

| Label | Meaning |
|---|---|
| **manual-grounded** | Retrieved from SbD-ToE via MCP tool — cite chapterId or control ID |
| **observed** | Directly visible in the repository or codebase |
| **inferred** | Logical conclusion from observed or grounded facts — mark explicitly |
| **not verified** | Not confirmed — do not present as fact |

- Never present inferred statements as verified facts.
- Never mark controls as implemented unless directly verified in the codebase.
- When in doubt: prefer structured grounding over free-form answering; prefer "not verified"
  over guessing.

---

## Routing guide

### By SDLC phase

| Phase | Primary chapters |
|---|---|
| Requirements | 01, 02, 03 |
| Design | 03, 04 |
| Development | 05, 06 |
| CI/CD | 07 |
| Infrastructure | 08, 09 |
| Testing | 10 |
| Deploy | 11 |
| Operations | 12 |
| Governance / Onboarding | 13, 14 |

### By domain

| Domain / topic | Chapter(s) |
|---|---|
| Risk classification, application classification | 01 |
| Security requirements, acceptance criteria | 02 |
| Threat modelling, attack surface | 03 |
| Secure architecture, design patterns | 04 |
| Dependencies, SBOM, SCA, supply chain | 05 |
| Secure coding, code review | 06 |
| CI/CD pipeline security | 07 |
| IaC, infrastructure hardening | 08 |
| Containers, images, Kubernetes | 09 |
| SAST, DAST, penetration testing | 10 |
| Secure deploy, release gates | 11 |
| Monitoring, alerting, incident response | 12 |
| Training, onboarding, awareness | 13 |
| Governance, contracts, audits | 14 |

### By question type

| Question | Tool |
|---|---|
| "What is X?" / "How does Y work?" | `search_sbd_toe_manual` |
| "What applies to my project?" | `map_sbd_toe_applicability` → `get_sbd_toe_chapter_brief` |
| "What does chapter N cover?" | `get_sbd_toe_chapter_brief` |
| "List all chapters" | `list_sbd_toe_chapters` |
| "Find control / artefact / practice" | `query_sbd_toe_entities` |
| "Generate a threat model / checklist / plan" | `generate_document` |
| "Governance plan for this repo" | `plan_sbd_toe_repo_governance` |
| "What to review given these changed files?" | `map_sbd_toe_review_scope` |

---

## Resources

| Resource URI | When to use |
|---|---|
| `sbd://toe/agent-guide` | This document — full operational guide |
| `sbd://toe/index-compact` | Full chapter map as JSON — fast structured lookup |
| `sbd://toe/skill-template/{riskLevel}/{projectRole}` | Role + risk specific instructions |
| `sbd://toe/chapter-applicability/{riskLevel}` | Active/excluded chapters for a risk level |

---

## Prompts

| Prompt | When to use |
|---|---|
| `setup_sbd_toe_agent(riskLevel, projectRole)` | Session setup — active chapters + risk-specific rules |
| `ask_sbd_toe_manual(question)` | Direct grounded Q&A |

---

## `generate_document` types

| type | Description |
|---|---|
| `classification-template` | Application risk classification document |
| `threat-model-template` | Threat model with required sections per risk level |
| `checklist` | Security checklist for the risk level |
| `training-plan` | Security training plan |
| `secure-config` | Secure configuration reference |

---

## Chapter reference

| chapterId | Title | Min level | Domains |
|---|---|---|---|
| `00-fundamentos` | Fundamentos SbD-ToE | L1 | governance, foundation |
| `01-classificacao-aplicacoes` | Classificação de Aplicações | L1 | governance, risk |
| `02-requisitos-seguranca` | Requisitos de Segurança | L1 | governance, requirements |
| `03-threat-modeling` | Threat Modeling | L1 | risk, architecture |
| `04-arquitetura-segura` | Arquitetura Segura | L1 | architecture, design |
| `05-dependencias-sbom-sca` | Dependências, SBOM e SCA | L1 | supply-chain |
| `06-desenvolvimento-seguro` | Desenvolvimento Seguro | L2 | development, coding |
| `07-cicd-seguro` | CI/CD Seguro | L1 | devops, pipeline |
| `08-iac-infraestrutura` | IaC e Infraestrutura | L1 | infrastructure |
| `09-containers-imagens` | Containers e Imagens | L1 | containers |
| `10-testes-seguranca` | Testes de Segurança | L1 | testing |
| `11-deploy-seguro` | Deploy Seguro | L2 | deploy |
| `12-monitorizacao-operacoes` | Monitorização e Operações | L1 | monitoring |
| `13-formacao-onboarding` | Formação e Onboarding | L3 | training |
| `14-governanca-contratacao` | Governança e Contratação | L1 | governance |

---

## Risk levels

| Level | Scope | Unlocks |
|---|---|---|
| `L1` | Low risk — internal, no sensitive data | Chapters marked minLevel L1 |
| `L2` | Medium risk — public APIs, user data | + chapters 06, 11 |
| `L3` | High risk — PII, regulated systems | + chapter 13 |

---

## Identifier conventions

- **Artefacts**: `ART-<chapterId>-<name>` — use `get_sbd_toe_chapter_brief` to list `artifact_ids`
- **Controls**: `CTRL-<chapter>-<number>` — use `query_sbd_toe_entities(query="CTRL-06", entityType="control")`
- Always cite identifiers when presenting manual-grounded answers
