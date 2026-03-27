---
version: "1.0"
date: "2026-03-27"
risk-level: "L2"
status: "active"
review-due: "2026-09-27"
---

# Política de Testes de Segurança — sbd-toe-mcp

Define as obrigações, ferramentas e critérios de validação para testes de segurança do repositório `@shiftleftpt/sbd-toe-mcp`, em conformidade com o Manual SbD-ToE Cap. 02 e Cap. 10 (obrigatório para L2).

---

## Princípios

1. **Sinal automático não substitui decisão humana.** Ferramentas de SAST reportam findings — a decisão de bloquear, excecionar ou promover pertence sempre a um role humano e deixa evidência rastreável.
2. **Findings críticos bloqueiam.** CWEs de alta severidade impedem merge sem exceção aprovada via `security-exception.yml`.
3. **Cobertura mínima enforced.** O CI deve rejeitar PRs com cobertura de testes abaixo do threshold L2.

---

## Ferramentas Activas

| Ferramenta | Tipo | Fase | Threshold de bloqueio |
|---|---|---|---|
| CodeQL (`security-and-quality`) | SAST | PR + push master | Critical/High sem exceção aprovada |
| `tsc --noEmit` | Type checking | PR + push master | Qualquer erro |
| `vitest` | Testes unitários | PR + push master | Cobertura ≥ 70% (**gate não enforced** — gap) |
| `npm audit` | SCA | PR + push master | Vulnerabilidades Critical/High |
| Dependabot | SCA contínuo | Semanal | Alerta automático |

---

## Gaps Actuais

| Gap | Impacto | Acção proposta |
|---|---|---|
| Cobertura de testes não é gate em CI | PRs com <70% de cobertura passam | Adicionar `--coverage --coverage.thresholds.lines=70` em `ci.yml` |
| Secrets scanning não configurado | Segredos acidentais podem entrar no histórico | Adicionar `gitleaks` ou `trufflehog` ao CI (CTRL-SECRETS-001) |
| DAST não aplicável | O servidor MCP não tem endpoint HTTP em runtime | Reavaliar se transporte HTTP for adicionado |

---

## Processo por Fase

### PR / Pre-merge
1. CodeQL executa automaticamente — findings reportados no PR
2. `npm audit` executa — falha em Critical/High
3. Type checking executa — falha em qualquer erro
4. Reviewer humano valida findings antes de aprovar

### Pré-release
Usar o issue template `release-checklist.yml` para registar:
- Estado dos findings CodeQL (zero Critical/High não excepcionados)
- Resultado de `npm audit` (zero Critical/High)
- Cobertura de testes (valor actual vs. threshold)
- Exceções de segurança ativas com TTL válido

### Pós-incidente
Após qualquer incidente de segurança:
- Rever se testes existentes cobrem o vector explorado
- Adicionar teste de regressão antes de fechar o IR

---

## Critérios de Aceitação de Findings

| Severidade | Acção obrigatória |
|---|---|
| Critical | Bloqueia merge. Requer fix ou exceção aprovada com justificação |
| High | Bloqueia merge. Requer fix ou exceção aprovada com justificação |
| Medium | Não bloqueia. Registar em backlog com prazo de resolução |
| Low / Info | Não bloqueia. Rever trimestralmente |

---

## Separação: Sinal Automático vs. Decisão Humana

Os gates de CI são **sinal** — indicam o que foi detectado. A **decisão** (promover, bloquear, excecionar) é sempre do reviewer humano e deve ser documentada:

- Override de gate: submeter `security-exception.yml` com justificação e TTL
- Aceitação de finding: registar decisão no PR com referência ao REQ afectado
- Promoção para release: assinar checklist de release com evidências

---

## Referências

- Manual SbD-ToE — Cap. 10: Testes de Segurança
- Manual SbD-ToE — Cap. 02: Requisitos de Segurança
- [`controlos-l2.md`](controlos-l2.md) — CTRL-CICD-002, CTRL-QUALITY-002
- [`requisitos.md`](requisitos.md) — REQ-005, REQ-007
