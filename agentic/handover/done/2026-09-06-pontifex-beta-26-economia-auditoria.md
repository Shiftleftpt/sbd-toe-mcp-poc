---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.26 — economia e auditoria: os 8 itens que restavam da lista do avaliador, numa vaga.
review_status: pending-human-review
---

# Vaga beta.26 — economia e auditoria (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («junta o que resta», 2026-09-06).
**Fonte:** design note §17 + §18. **Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.

## Regra que enquadrou a vaga

Nenhum item toca fidelidade, motor ou documentação derivada — e **a selecção não se mexeu**:
o ouro é byte-idêntico ao da beta.25 nos dois braços.

## Os 8 itens

1. **EP por PERTENÇA ao âmbito** — sonda A 5/5 fora → 5/5 dentro; sonda B deixa de depender
   de sorte alfabética; promessa «ranked by relevance» corrigida; `debug.notes` com o cap efectivo.
   **Não resolvido e declarado:** EP-AUT-009 continua fora do `minimal` (é o 18.º de 25
   igualmente no âmbito; promovê-lo exigiria ranking pelo texto da tarefa).
2. **threat_landscape** — `needs_input` a 434 tk (era 8,3k); cobertura na descrição;
   ordem declarada; `unsupported_concerns` mantido a par (garantia da beta.23, literal).
3. **Traço multi-activador** — `activated_by[]` com todos os pares.
4. **Dieta do `select`** — legenda de justificações: −40%/−48% (115 req), −50%/−58% (baseline L3).
5. **Denominadores** — 4 nomeados e definidos + `meta.eligible_denominator`.
6. **`obligation_ids`** no overlay + nota a dizer que a citação é o artigo do diploma.
7. **P1-3/P1-4** — cobertura parcial declarada; gap inexistente deixa de ser declarado.
8. **cap. 01** — explicado, não activado (dar-lhe activador mudaria a selecção).

## Verificação

- Suite 780/780 · Aceitação 156: 116 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Ouro byte-idêntico à beta.25: `discover` **10/0/0** · declarativo **6/4/0**
- Orçamentos 8/8 do prepare · gate completo · guarda nova `beta26-invariants` (6 propriedades)
- Cenários novos: **TC-F-47, TC-F-48, TC-F-49**

## Fecho

- Commit: `b1ab9a73fb862f88db1ed4233f58ff00937a67c3` · tag `v0.20.0-beta.26`
- `release.yml` run **34026770992** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.26` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
