---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Brief da vaga beta.24 — a última peça manual (agent-guide gerado) e o âmbito da promessa never-silent.
review_status: pending-human-review
---

# Vaga beta.24 — a última peça manual e o âmbito da promessa (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («avança com o beta.24», 2026-09-06).
**Diagnóstico:** design note §16. **Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.

## Âmbito executado

1. **Agent-guide GERADO.** Origem dos «13 concerns» confirmada antes de gerar: são o
   `supported_values` do mapa de ameaças, carácter a carácter — e o complemento são
   exactamente os 11 `unsupported_concerns` da beta.23. Derivados: concerns (24),
   activadores, roles (13), resources (10), prompts (3), chapters (15), risk levels.
   Autoral: START HERE, modos, standards epistémicos, routing, leitura de output,
   convenções. Guarda: `agent-guide-derived.test.ts` (6 propriedades).
2. **`out_of_scope_chapters`** — a promessa never-silent passa a declarar o âmbito.
   133 requisitos em 14 capítulos que desapareciam sem uma linha, agora por contagem com
   `activate_with` derivado e verificado. Custo 538 tk (11,7%) contra 3.689 se listados.
   Invariante de conservação estendida ao universo.
3. **Higiene do `task`** — 2 resíduos de inferência corrigidos; `task_context` canónico
   com `task` mantido como alias e ainda motor em `discover`.

## Achados reportados (dentro e à margem do âmbito)

- `01-classificacao-aplicacoes` **não tem activador publicado nenhum** (8 req. a L2).
- `REQ-AGN-001..004` viviam fora de todas as bandas e de toda a declaração.
- Guia: faltava `sbd://toe/activation-vocabulary` nos recursos e `prepare_grounded_codegen`
  nos prompts; a tabela de níveis contradizia a aplicabilidade graduada de 0.14.0.

## Verificação

- Suite 769/769 · Aceitação 152: 112 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Ouro byte-idêntico ao da beta.23: `discover` **10/0/0** · declarativo **6/4/0**
- Orçamentos 8/8 inalterados · gate: stdout JSON-RPC, exit 0, package_version coerente
- Cenários novos: **TC-F-43, TC-F-44, TC-F-45**

## Fecho

- Commit da vaga: `863ed99bacb3797b9603ef387b4c736dd8ec40c1` · tag anotada `v0.20.0-beta.24`
- Registo em FREEZE-REGISTRY: `d7ee9d2`
- `release.yml` run **33999753605** (success) → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.24` = `beta`
- `gitHead` publicado = commit da tag ✓ · `latest` = 0.19.4 **intocado**
