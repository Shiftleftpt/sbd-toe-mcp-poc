---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.31 — as bordas: notas geradas do comportamento, invariante alargada às superfícies de vocabulário.
review_status: pending-human-review
---

# Vaga beta.31 — AS BORDAS (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («avança», 2026-09-06), §25.
**Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.

## Inventário das 11 superfícies que resolvem vocabulário

| # | instância | quem a conhecia |
|---|---|---|
| 1 | `get_guide_by_role × fornecedores-terceiros` | avaliador (P0) |
| 2 | `meta.knownRoles` omitia o papel resolvido | avaliador |
| 3 | `chapter_implementation_checklist × 00-fundamentos` | **ninguém** |
| 4 | `map_regulatory_activation × ENISA-CSA` | **ninguém** |

Todas fechadas. O `unsupported_obligations` (pedido 4×) saiu como instância da classe.

## Notas fósseis

Varredura de 6 superfícies → **1 fóssil**: o `meta.note` do threat descrevia a ordenação da
beta.26 e dava o conselho OPOSTO ao correcto. `behaviour-notes.ts` passa a ser fonte única de
descrição + nota, com guarda de 4 propriedades.

## Restantes

`routing_basis` por concern e desambiguado (sem renomear o valor publicado) · `cross_surface_check`
(63 tk) torna possível a contraprova que o guia exige, sem alargar o consult · `equivalent_to`
(regulated ≡ personal) · `distinctUserStoryCount`.

## Verificação

- Suite 799/799 · Aceitação 166: 126 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Ouro byte-idêntico à beta.30 · orçamentos 8/8 · gate completo
- Cenários novos: **TC-F-58, TC-F-59**

## Fecho

- Commit: `711b6b523f00876fb65b7aa9f7e2677e4b97b5f8` · tag `v0.20.0-beta.31`
- `release.yml` run **34041253012** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.31` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
