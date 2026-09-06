---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Adenda ao beta.26 — P0 do consult, regra de contraprova no guia, e a invariante entre superfícies.
review_status: pending-human-review
---

# Vaga beta.27 — adenda ao beta.26 (assessment da beta.25)

**Persona:** Pontifex. **Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.
O âmbito original do beta.26 foi entregue por inteiro — nada foi empurrado.

## A — P0 do `consult`

11 dos 24 concerns davam 0 em silêncio e o `rule_trace` AFIRMAVA «0 requirements active»
(com 247 aplicáveis ao nível). Causa: resolvia por `concernsMap` cru em vez do mapa
publicado. Corrigido à raiz + mecanismo (`unsupported_concerns`, `empty_at_level`,
`rule_trace` verdadeiro). **Efeito não previsto:** curou também o mapa de ameaças — os 24
concerns passam a roteáveis, porque ele roteia através do consult.

## B — o guia manda CONTRAPROVAR

Vazio sem declaração ⇒ contraprova contra `select`/vocabulário antes de comunicar; «uma
discordância entre superfícies é sinal, não ruído». Bloco derivado novo (`cross-surface`).

## C — invariante entre superfícies (24 × 3)

Apanhou 4 defeitos à primeira execução (vocabulário a prometer menos do que o servidor
entrega para `agents`; vazio por nível mudo no consult e nas ameaças; valores fora do
vocabulário ignorados nas ameaças) **e 2 defeitos introduzidos nesta própria vaga** (cache
de suporte envenenada pela guarda de recursão; banda `next` largada no `needs_input`).

## Verificação

- Suite 785/785 · Aceitação 158: 118 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Ouro byte-idêntico à beta.26 nos dois braços, incluindo o braço `consult`
- Orçamentos 8/8 do prepare · gate completo · cenários novos **TC-F-50, TC-F-51**

## Fecho

- Commit: `f1bc7dcf77268291b0ab24c11bb3000fbb77139c` · tag `v0.20.0-beta.27`
- `release.yml` run **34028041205** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.27` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
