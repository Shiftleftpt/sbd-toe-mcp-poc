---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.37 — expor a vista processual (MP1–MP5) no MCP beta e medir o GR-03.
review_status: pending-human-review
---

# Vaga beta.37 — A VISTA PROCESSUAL (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** dispatch do Orchestrator
(`2026-09-06-orchestrator-pontifex-exposicao-macro-processos.md`).
**Bundle:** re-pin para o dev-build `kg-v1-manual-v1.8.1-aligned-2026-09-06`.
**Estável intocada** (latest 0.19.4, KG formal v1.11.0). **Nada promovido.**

## A superfície: `get_sbd_toe_macro_processes` (leitura PROGRAMA)

Tool nova, a 29ª. Responde a «por onde começamos, e com que sequência?».

| Vista | Chamada | Custo |
|---|---|---|
| PROGRAMA | `get_sbd_toe_macro_processes()` | 2.651 tk |
| um MP | `get_sbd_toe_macro_processes(mp_id="MP-01")` | 2.019 tk |
| id desconhecido | `mp_id="MP-99"` | `status: unknown_macro_process` + os 5 ids que existem |

**Activa-se pela PERGUNTA, não por palavras-chave à mão:** a leitura está publicada na tabela de
leituras do guia GERADO, e cada resposta declara-se em `reading.id`. Não há lista de keywords.

## A ordem, e a prova de que só pode ser `dependency`

`levels = [[MP-01], [MP-02 ∥ MP-04], [MP-03], [MP-05]]`, `first_step: MP-01`, com a `rule`
verbatim da fonte. 14 pares `dependency`, cada um com o **artefacto consumido**. As 9 `feedback`
vêm em banda própria, e `excluded_from_order` diz porquê.

**O TC-F-64 não acredita na declaração.** Reconstrói o grafo COM as feedback e **exige que
cicle**; se algum dia não ciclar, a exclusão deixou de ser demonstrável e a suite parte. Verifica
ainda que cada `dependency` é coerente com a ordem publicada — nenhuma pode apontar para trás.

## Os três limites (declarados, não contornados)

1. **Não existe entidade «programa»** — recusa de curadoria, ratificada. Publicam-se os cinco MP
   e a ordem; o «programa» é o que a organização monta com isto.
2. **Travessia MP↔fase do SDLC é lacuna publicada** — parcial e não publicada. **Não se deriva**
   de capítulos nem de atribuições; o teste falha se um MP passar a trazer `phases`.
3. **Três segmentações paralelas** — MacroProcess, capítulo e fase. `traverses_bundles` é
   **percurso publicado e ordenado, nunca contenção**.

## O re-pin: proveniência mudou, conteúdo não

O beta servia ainda o release formal `v1.11.0` (manual v1.8.0 + ontologia v2.4). Passa ao
dev-build `f87d5b46bf10` (contract v1.18, manual v1.8.1 + ontologia v2.5), que traz os dois
`semantic/*.jsonl` (entradas novas em `bundle-files.json`, `optional`).

- 8 snapshots de ouro do codegen mexeram: **139 linhas, todas de proveniência** (`kg`,
  `manual_commit_sha`) — **0 linhas de conteúdo**.
- **Ouro do Eixo H byte-idêntico nos dois braços** contra a beta.36 (`results` e
  `declarative_results` comparados campo a campo).

## Medição — Eixo I: **5 SERVIDO · 1 SERVIDO-MAL · 0 NÃO SERVIDO**

| Caso | b.36 | b.37 | Peças |
|---|---|---|---|
| GR-01 IMPL | SERVIDO | SERVIDO | 5/5 |
| GR-02 CROSS-CHECK | SERVIDO | SERVIDO | 5/5 |
| **GR-03 PROGRAMA** | **NÃO SERVIDO (2/6)** | **SERVIDO (6/6)** | migração |
| GR-04 PAPEL/MOMENTO | SERVIDO-MAL | SERVIDO-MAL (3/4) | conteúdo |
| GR-05 CONSULT | SERVIDO | SERVIDO | 4/4 |
| GR-06 SETUP | SERVIDO | SERVIDO | 4/4 |

O GR-03 sobe **sem** a entidade «programa»: a peça central ratificada é «macro-processos MP1–MP5
como dados», e a sequência que a pergunta procura está publicada. A ausência da entidade vai
**declarada como limite** na resposta e não bloqueou nenhuma peça do must-have. Os must-NOT do
oráculo passam a ser **verificados** (eram lista morta): 0 ids de requisito na vista de programa.

**Disciplina da sonda:** a etiqueta da peça central manteve-se verbatim; só mudou por onde a sonda
a procura. O oráculo é do lead.

## Achados

**De serving (fechados nesta vaga):** nenhum aberto.

**De conteúdo (a montante, não corrigidos aqui):**
- **GR-04** — o bundle não publica taxonomia decide-vs-delega; serve-se a `proportionality` que
  existe (12/12 atribuições, prosa) sem a fazer passar pelo que não é. Inalterado desde a b.35.
- **Travessia MP↔fase** — lacuna declarada a montante; a decisão de a publicar é do lead.
- **Entidade «programa»** — ausência deliberada e ratificada; registada aqui como o que é.

**De disciplina (desta estação):** a divulgação de uso de IA no CHANGELOG vinha a dizer
`Claude Fable 5`; esta vaga corre em **Claude Opus 5** e passa a dizê-lo, com o modelo acrescentado
ao roster do `AI-USE-DISCLOSURE.md`. Linhas anteriores não se reescrevem (append-only).

## Verificação

Suite **801/801** · aceitação **171, 0 FAIL, gate PASS** (TC-F-64 novo) · **10 invariantes verdes
(40 asserções)** · **ouro do Eixo H byte-idêntico** · orçamentos **14/14** · Eixo I **5·1·0** ·
**29 tools** · `npm run check` verde com o pin verificado.
