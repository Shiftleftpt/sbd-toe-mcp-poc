---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.32 — Eixo I (leituras): medição implementada e primeira baseline contra o oráculo novo do lead.
review_status: pending-human-review
---

# Vaga beta.32 — EIXO I: a medição das LEITURAS (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («adjudico» + «avança», 2026-09-06).
**Oráculo:** `golden-reading-cases.md` v1 — do lead, imutável, transcrito sem emendas.
**Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.

## A baseline — 1 SERVIDO · 5 SERVIDO-MAL · 0 NÃO SERVIDO

| Caso | Leitura | Veredicto | Peças | O que falta |
|---|---|---|---|---|
| GR-01 | IMPL | SERVIDO-MAL | 3/5 | KPIs por capítulo; artefactos da capacidade |
| GR-02 | CROSS-CHECK | SERVIDO-MAL | 1/5 | playbook só por superfície NÃO-NORMATIVA; fases, checklist e princípio não são dados |
| GR-03 | PROGRAMA | SERVIDO-MAL | 3/6 | MP1–MP5 não existem no KG; sem entidade de programa |
| GR-04 | PAPEL/MOMENTO | SERVIDO-MAL | 3/4 | decide-vs-delega não publicado |
| GR-05 | CONSULT | SERVIDO-MAL | 5/7 | antipadrões sem porta; `risk_level` exigido para conhecimento |
| GR-06 | SETUP | **SERVIDO** | 4/4 | — (controlo positivo) |

Nenhum must-NOT violado. **Nada foi corrigido: a medição é o produto.**

## Dois registos para o lead

1. **O controlo positivo apanhou a MEDIÇÃO, não o servidor**: o GR-06 deu SERVIDO-MAL à
   primeira por um falso positivo da minha sonda (a 1ª menção ao `setup_sbd_toe_agent` está
   dentro da própria ressalva; e a regex falhava na quebra de linha). Corrigida a sonda, passa.
2. **Divergência oráculo vs medição no GR-03**: o oráculo prevê NÃO SERVIDO por construção; a
   medição dá SERVIDO-MAL porque HÁ caminho (`plan_rollout` entrega a peça «ordem/fases»).
   Não ajustei nada — fica para o lead decidir se «caminho» deve exigir a peça central.

## Verificação

- Suite 799/799 · Aceitação 166: 126 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Oito invariantes verdes (39 asserções) · **ouro do Eixo H byte-idêntico** · orçamentos 8/8
- Eixo I **nunca entra no gate** (como o H); `npm run eval:axis-i`

## Fecho

- Commit: `aad6ea768aab79e0d9ed9689ea4edfa4fd9aca9b` · tag `v0.20.0-beta.32`
- `release.yml` run **34049524817** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.32` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
