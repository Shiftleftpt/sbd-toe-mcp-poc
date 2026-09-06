---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.28 — invariantes ENTRE SUPERFÍCIES; primeiro ciclo com âmbito por classe.
review_status: pending-human-review
---

# Vaga beta.28 — invariantes entre superfícies: a classe, não a instância

**Persona:** Pontifex. **Autorização:** lead («avança com o beta.28», 2026-09-06), §20.
**Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.

## Inventário da suite (corrida ANTES de qualquer correcção)

5 candidatos → **3 instâncias reais** + **2 falsos positivos da própria suite**:

| # | instância | veredicto |
|---|---|---|
| 1 | `consult` × `exposure` | REAL (P0) |
| 2 | `consult` × `data_sensitivity` | REAL |
| 3 | `map_applicability` × `technologies` | falso positivo (assinatura truncada a 4.000 chars) |
| 4 | guia: `cross-surface` «24 de 24» vs `concerns` «SUBCONJUNTO» | REAL |
| 5 | guia: a mesma acusação ao `select` | falso positivo (atribuição errada da frase) |

Detector corrigido antes de se confiar nele. **Todas as reais fechadas — zero dívida.**

## Correcções

- **`ignored_activators`** no consult: 72 (select) vs 13 (consult), **59 requisitos em causa
  incluindo controlo de acesso**; declarados com os concerns equivalentes, a contagem
  derivada e quem os honra, mais entrada própria no `rule_trace`.
- **Caixa do guia derivada** — fim da contradição entre dois blocos GERADOS.
- **`routing_basis`** no threat (`domain_chapter` vs `activated_controls`) + `routing_note`.
- **Dedup como nível de `detail`** (não renomeia campos publicados): −51% em `minimal`.

## «Onde mais vive esta classe?» (varredura feita)

`threat.associated_control_ids` 5.451 tk — **corrigido aqui**; `verification_matrix`
**9.074 tk (prioridade 1)** e `select.narrowed_out` **2.100 tk (prioridade 2)** — reportados.

## Verificação

- Suite 790/790 · Aceitação 160: 120 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Ouro byte-idêntico à beta.27 nos dois braços · orçamentos 8/8 · gate completo
- Cenários novos: **TC-F-52, TC-F-53**

## Fecho

- Commit: `37ef1144acc86a9949e321949489cec627a82629` · tag `v0.20.0-beta.28`
- `release.yml` run **34031389949** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.28` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
