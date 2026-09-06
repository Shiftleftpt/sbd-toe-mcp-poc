---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.33 — caminho normativo para cross-checks e playbooks; GR-02 sobe de NÃO SERVIDO a SERVIDO.
review_status: pending-human-review
---

# Vaga beta.33 — PLAYBOOKS com caminho próprio (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («avança», 2026-09-06).
**Oráculo:** GR-02 + emenda **v1.1** (peça central). **Bundle:** pin INALTERADO (KG `v1.11.0`).

## O que se abriu

`get_sbd_toe_playbook` — superfície NORMATIVA para os 20 playbooks e 450 secções que o
bundle já publicava e só eram alcançáveis por `search_sbd_toe_manual` (não-normativo).
Índice completo 2.276 tk · índice por framework 1.341 tk · secções paginadas 3.129 tk (10 de 29).

- **Autoridade visível:** exemplos ilustrativos em banda separada, com `authority.tier`.
- **Delimitação obrigatória:** «o SbD-ToE não é uma norma» em toda a resposta.
- **Sem cross-check:** `status: "no_cross_check"` + roadmap derivado do Manual.
- **Dois sentidos:** overlay → playbook → obrigações.

## Eixo I antes → depois

| caso | beta.32 | beta.33 (v1.1) |
|---|---|---|
| **GR-02** | NÃO SERVIDO (v1.1) | **SERVIDO** (5/5) |
| GR-01 · GR-03 | SERVIDO-MAL | NÃO SERVIDO — re-classificação da emenda, não regressão |
| GR-04 · GR-05 | SERVIDO-MAL | SERVIDO-MAL |
| GR-06 | SERVIDO | SERVIDO |

Total: **2 SERVIDO · 2 SERVIDO-MAL · 2 NÃO SERVIDO**.

## Verificação

- Suite 799/799 · Aceitação 167: 127 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Oito invariantes verdes · **ouro do Eixo H byte-idêntico** · orçamentos 8/8
- Cenário novo: **TC-F-60**

## Fecho

- Commit: `f2262f81d8bc83cb8ba253c3ad38f50580676ef3` · tag `v0.20.0-beta.33`
- `release.yml` run **34050890354** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.33` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
