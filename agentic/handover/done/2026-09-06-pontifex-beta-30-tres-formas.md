---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Ciclo «três formas de pedir» — B e C de primeira classe, recurso de modelo, invariante de alcançabilidade.
review_status: pending-human-review
---

# Vaga beta.30 — as TRÊS FORMAS DE PEDIR (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead, 2026-09-06 (desenho ratificado, §7 + §23).
**Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.

## Inventário da alcançabilidade (ANTES das correcções)

| | |
|---|---|
| capítulos inalcançáveis | **0** |
| sem atalho de conceito | **5** (01, 02, 06, 13, 14) — órfãos verdadeiros: **01, 13, 14** |
| categorias órfãs | **3**: CLA, GOV, TRN |
| **caminhos FALSOS** | **9** (3 capítulos × 3 níveis) — todos eliminados |

## O que se abriu

- **B** (`chapters`/`categories` no `select`, traço `declared_structure`) — cap. 14 → 14 GOV;
  cap. 01 → 8 CLA; `unknown_structural` para valores fora do catálogo. **Já existia:**
  `resolve_entities`, `verification_matrix(requirement_ids)`, `trace_requirement_sources`.
- **C** já existia (`trace_sbd_toe_graph`): ganhou estatuto no arranque e no modelo.
- **`sbd://toe/model`** (2.731 tk) e **`sbd://toe/quick-start`** (500 tk vs 13.135).
- `activate_with` sempre verdadeiro; ficheiro só como opção condicionada.

## Verificação

- Suite 793/793 · Aceitação 164: 124 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Cinco invariantes anteriores verdes (33 asserções) · ouro byte-idêntico · orçamentos 8/8
- Cenários novos: **TC-F-56, TC-F-57**

## Fecho

- Commit: `e374f7c8c1a514b621c314f629b9ad1937224df0` · tag `v0.20.0-beta.30`
- `release.yml` run **34035926529** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.30` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
