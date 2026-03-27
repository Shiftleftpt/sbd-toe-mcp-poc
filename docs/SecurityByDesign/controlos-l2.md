---
version: "1.0"
date: "2026-03-27"
risk-level: "L2"
status: "active"
review-due: "2026-09-27"
---

# Controlos L2 — sbd-toe-mcp

Lista de controlos aplicáveis ao nível de risco L2, com estado atual de implementação.

Fonte: Manual SbD-ToE Cap. 01 — Matriz de Controlos por Nível de Risco + `plan_sbd_toe_repo_governance`.

Ver [`requisitos.md`](requisitos.md) para o catálogo REQ-XXX com rastreabilidade completa. Ver [`threat-model.md`](threat-model.md) para as ameaças associadas a cada controlo.

---

## Controlos Obrigatórios

| ID | Categoria | Descrição | Estado | Evidência |
|---|---|---|---|---|
| CTRL-ACCESS-001 | Acesso | Branch protection com ≥1 reviewer obrigatório | ✅ Implementado | GitHub branch protection em `master` |
| CTRL-ACCESS-002 | Acesso | CODEOWNERS definido para paths críticos | ✅ Implementado | `.github/CODEOWNERS` |
| CTRL-CICD-001 | CI/CD | Pipeline de CI obrigatório em PRs | ✅ Implementado | `.github/workflows/ci.yml` |
| CTRL-CICD-002 | CI/CD | SAST em CI (CodeQL/semgrep) | ✅ Implementado | `.github/workflows/codeql.yml` — queries `security-and-quality` |
| CTRL-QUALITY-001 | Qualidade | Linting e type-checking em CI | ✅ Implementado | `tsc --noEmit` em `ci.yml` |
| CTRL-QUALITY-002 | Qualidade | Cobertura de testes mínima ≥70% | ⚠️ Parcial | `vitest` configurado; gate de cobertura não enforced em CI |
| CTRL-QUALITY-003 | Qualidade | Code review obrigatório (L2: 1 reviewer) | ✅ Implementado | Branch protection + CODEOWNERS |
| CTRL-SECRETS-001 | Segredos | Scanning de segredos (gitleaks/trufflehog) | ❌ Em falta | Não configurado — gap identificado |
| CTRL-SUPPLY-001 | Supply chain | Dependency scanning (Dependabot/Renovate) | ✅ Implementado | `.github/dependabot.yml` — npm + github-actions |

---

## Controlos Recomendados

| ID | Categoria | Descrição | Estado | Evidência |
|---|---|---|---|---|
| CTRL-SUPPLY-002 | Supply chain | SBOM gerado em cada release | ❌ Em falta | `release.yml` não gera SBOM — ver [`sbom-policy.md`](sbom-policy.md) |

---

## Resumo de Gaps

| Controlo | Gap | Mitigação proposta |
|---|---|---|
| CTRL-QUALITY-002 | Cobertura não é gate em CI — pode passar PR com <70% | Adicionar `--coverage` com threshold em `ci.yml` |
| CTRL-SECRETS-001 | Secrets scanning não configurado | Adicionar `gitleaks` ou `trufflehog` ao pipeline CI |
| CTRL-SUPPLY-002 | SBOM não gerado no release workflow | Integrar `syft` ou `cyclonedx-npm` em `release.yml` |

---

## Auditoria Trimestral

Usar o issue template `release-checklist.yml` para registar evidências por ciclo. Os itens abaixo são o scope esperado:

- Rever permissões de acesso ao repositório
- Verificar que dependências estão actualizadas (Dependabot)
- Rever branch protection e CODEOWNERS
- Rever resultados SAST/dependency scan dos últimos 30 dias
- Confirmar que exceções ativas ainda têm TTL válido

---

## Exceções Formais

Os seguintes controlos são inaplicáveis no estado atual. Ver `.github/ISSUE_TEMPLATE/security-exception.md` para submeter exceção formal.

| Controlo | Justificação | TTL |
|---|---|---|
| MFA obrigatório | Sem sistema de autenticação de utilizadores | Rever se auth for adicionada |
| Política de passwords | Sem gestão de credenciais de utilizadores | Rever se auth for adicionada |
| Proteção brute force | Sem endpoints de autenticação | Rever se HTTP transport for adicionado |
| RBAC multi-perfil | Ferramenta local sem perfis de utilizador | Rever com múltiplos clientes MCP |
