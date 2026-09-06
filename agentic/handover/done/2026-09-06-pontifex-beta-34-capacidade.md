---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.34 — vista IMPL com a medida de capacidade; GR-01 sobe de NÃO SERVIDO a SERVIDO.
review_status: pending-human-review
---

# Vaga beta.34 — CAPACIDADE (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («avança», 2026-09-06).
**Oráculo:** GR-01 + emenda v1.1. **Bundle:** pin INALTERADO (KG `v1.11.0`).

## O que se abriu

`get_sbd_toe_chapter_capability` — a vista **IMPL**: os KPIs que o Manual define, com
`thresholds_by_level` (L1/L2/L3) como DADO, mais os artefactos da capacidade.
cap.07@L2 = 3.270 tk (7 KPIs + 29 artefactos) · um KPI = 449 tk · os 99 = 6.165 tk paginados.
Ciclo fechado nos dois sentidos com o `assess_sbd_toe_implementation`.

## Eixo I antes → depois

| caso | beta.33 | **beta.34** |
|---|---|---|
| **GR-01** | NÃO SERVIDO | **SERVIDO** (5/5) |
| outros cinco | — | inalterados |

**3 SERVIDO · 2 SERVIDO-MAL · 1 NÃO SERVIDO** (era 2/2/2).

## Dois registos

1. **O «0 artefactos» era defeito da SONDA**: o brief serve 29 para o cap. 07 — chamava-se
   com `chapter` em vez de `chapterId` e lia `artifact_ids` em vez de `artifacts`.
2. **Declarado, não corrigido:** o `chapter_implementation_checklist` não cobre capacidade
   organizacional (1-2 itens por capítulo, e são secções de prosa). Decisão do lead.

## Verificação

- Suite 799/799 · Aceitação 168: 128 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Oito invariantes verdes · **ouro do Eixo H byte-idêntico** · orçamentos 8/8
- Cenário novo: **TC-F-61**

## Fecho

- Commit: `4f56bbe29cba92696324faa2be27e8857b709bbd` · tag `v0.20.0-beta.34`
- `release.yml` run **34051699997** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.34` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
