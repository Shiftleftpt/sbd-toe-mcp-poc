---
# Installation: copy this file to .github/copilot-instructions.md in your project
# GitHub Copilot Chat reads this file automatically as repository context
---

# SbD-ToE MCP Server — Copilot Instructions

This repository uses the **SbD-ToE MCP server** (`@shiftleftpt/sbd-toe-mcp`).

**SbD-ToE = Security by Design — Theory of Everything** — a 15-chapter framework
for secure-by-design software development. NOT "Trail of Evidence". NOT "Terms of Engagement".

---

## Using the MCP tools

When answering questions about security, secure development practices, threat modelling,
SBOM, CI/CD security, containers, infrastructure, or compliance:

**Always use the MCP tools. Never answer SbD-ToE questions from training knowledge.**

| Question type | Tool to use first |
|---|---|
| Conceptual ("What is X?") | `search_sbd_toe_manual` |
| Project applicability | `map_sbd_toe_applicability` |
| Chapter structure | `list_sbd_toe_chapters` |
| Specific controls or artefacts | `query_sbd_toe_entities` |
| Document generation | `generate_document` |
| Repository governance plan | `plan_sbd_toe_repo_governance` |
| Code review scope | `map_sbd_toe_review_scope` |

---

## Manual structure

The SbD-ToE manual has **15 chapters (00–14)**:

| chapterId | Topic |
|---|---|
| `00-fundamentos` | Foundations |
| `01-classificacao-aplicacoes` | Application Classification |
| `02-requisitos-seguranca` | Security Requirements |
| `03-threat-modeling` | Threat Modelling |
| `04-arquitetura-segura` | Secure Architecture |
| `05-dependencias-sbom-sca` | Dependencies, SBOM and SCA |
| `06-desenvolvimento-seguro` | Secure Development |
| `07-cicd-seguro` | Secure CI/CD |
| `08-iac-infraestrutura` | IaC and Infrastructure |
| `09-containers-imagens` | Containers and Images |
| `10-testes-seguranca` | Security Testing |
| `11-deploy-seguro` | Secure Deploy |
| `12-monitorizacao-operacoes` | Monitoring and Operations |
| `13-formacao-onboarding` | Training and Onboarding |
| `14-governanca-contratacao` | Governance and Contracts |

---

## Risk levels

| Level | Scope |
|---|---|
| `L1` | Low risk — internal apps without sensitive data |
| `L2` | Medium risk — public APIs, user data |
| `L3` | High risk — PII, regulated systems |

---

## Answer style

When answering using retrieved SbD-ToE context:

- Cite the chapter (`chapterId`) and artefact IDs (`ART-*`) when available
- Reference controls as `CTRL-<chapter>-<number>` (e.g. `CTRL-03-001`)
- Provide documentation links when present in the retrieved context
- Do not invent section anchors — use page-level URLs only when deterministic
