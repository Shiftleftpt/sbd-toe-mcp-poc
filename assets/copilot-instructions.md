---
# Installation: copy this file to .github/copilot-instructions.md in your project
# GitHub Copilot Chat reads this file automatically as repository context
---

# SbD-ToE MCP — Copilot Instructions

This repository uses the **SbD-ToE MCP server** (`@shiftleftpt/sbd-toe-mcp`).

**SbD-ToE = Security by Design — Theory of Everything** — a 15-chapter security guidance
framework. NOT "Trail of Evidence". NOT "Terms of Engagement".

## Scope

SbD-ToE guides **security practices only**. It does not impose development standards,
testing requirements, or coding conventions. Project rules always take precedence.
A lower risk level reduces required security controls — not code quality expectations.

## When to use the MCP

Use the SbD-ToE MCP tools whenever the request touches:
security practices, risk classification, threat modelling, secure architecture,
SBOM, supply chain, secure coding, CI/CD security, infrastructure hardening,
containers, security testing, secure deploy, monitoring, governance, or compliance.

**Never answer SbD-ToE questions from training knowledge — always call a tool first.**

## Operating modes

**CONSULT** — retrieve what the manual says, what applies, what controls/artefacts are required.

**GUIDE** — use retrieved guidance to implement, structure, document, or review.
Obtain applicable guidance before generating or modifying anything.

## Tool selection

| Question type | Tool |
|---|---|
| Conceptual / narrative | `search_sbd_toe_manual` |
| Project applicability | `map_sbd_toe_applicability` → `get_sbd_toe_chapter_brief` |
| Chapter detail | `get_sbd_toe_chapter_brief` |
| Controls / artefacts | `query_sbd_toe_entities` |
| Document generation | `generate_document` |
| Repo governance plan | `plan_sbd_toe_repo_governance` |
| Review scope for changed files | `map_sbd_toe_review_scope` |

## Resources (read at session start)

| Resource | Purpose |
|---|---|
| `sbd://toe/index-compact` | Full chapter map — bootstrap context |
| `sbd://toe/skill-template/{riskLevel}/{projectRole}` | Role + risk specific instructions |
| `sbd://toe/chapter-applicability/{riskLevel}` | Active/excluded chapters for a risk level |

## Epistemic standards

Always distinguish:
- **manual-grounded** — retrieved via MCP (cite chapterId or control ID)
- **observed** — directly visible in the codebase
- **inferred** — logical conclusion, mark explicitly
- **not verified** — do not present as fact

Never mark controls as implemented unless directly verified.

## Chapter map

| chapterId | Title | Min level |
|---|---|---|
| `00-fundamentos` | Fundamentos SbD-ToE | L1 |
| `01-classificacao-aplicacoes` | Classificação de Aplicações | L1 |
| `02-requisitos-seguranca` | Requisitos de Segurança | L1 |
| `03-threat-modeling` | Threat Modeling | L1 |
| `04-arquitetura-segura` | Arquitetura Segura | L1 |
| `05-dependencias-sbom-sca` | Dependências, SBOM e SCA | L1 |
| `06-desenvolvimento-seguro` | Desenvolvimento Seguro | L2 |
| `07-cicd-seguro` | CI/CD Seguro | L1 |
| `08-iac-infraestrutura` | IaC e Infraestrutura | L1 |
| `09-containers-imagens` | Containers e Imagens | L1 |
| `10-testes-seguranca` | Testes de Segurança | L1 |
| `11-deploy-seguro` | Deploy Seguro | L2 |
| `12-monitorizacao-operacoes` | Monitorização e Operações | L1 |
| `13-formacao-onboarding` | Formação e Onboarding | L3 |
| `14-governanca-contratacao` | Governança e Contratação | L1 |

## Risk levels

| Level | Scope |
|---|---|
| `L1` | Low risk — internal apps, no sensitive data |
| `L2` | Medium risk — public APIs, user data — adds chapters 06, 11 |
| `L3` | High risk — PII, regulated systems — adds chapter 13 |
