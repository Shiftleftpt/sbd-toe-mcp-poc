---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.36 — varrimento sobre inventário vivo, conservação na banda (v1.2), e o resto das bordas.
review_status: pending-human-review
---

# Vaga beta.36 — AS BORDAS OUTRA VEZ (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («sim», 2026-09-06), §28 + emenda v1.2.
**Bundle:** pin INALTERADO (KG `v1.11.0`). **GR-03 e GR-04 fora desta vaga.**

## O que a invariante sobre inventário vivo apanhou

Sobre as 28 tools servidas: **uma instância real** —
`get_sbd_toe_chapter_capability → assess`: sugeria `metrics=`, o parâmetro é `kpi_values`.
Nas três tools novas (playbook, capability, explain): só essa. Mais **3 falsos positivos
meus** (o regex apanhava a cauda de `riskLevel="…"`), corrigidos antes de confiar.

## Conservação na banda

`explain(concern="secrets")` → 0 antipadrões. Estruturalmente o servidor **não sabe** que os
do cap. 07 são sobre segredos (o `secrets` publica `activates_chapters: []`), e sabê-lo
exigiria ler rótulos — inferência que não se reintroduz. Passa a dar o **caminho concreto**:
`elsewhere.by_chapter` com chamada executável e rótulos (+535 tk, só quando vazia).

## Painel do Eixo I sob v1.2 (medido nas duas builds)

| | beta.35 | beta.36 |
|---|---|---|
| painel | **3 · 2 · 1** | **4 · 1 · 1** |
| GR-05 | SERVIDO-MAL | **SERVIDO** |

## Achados de CONTEÚDO ao lead

1. Magreza do `implementation_checklist` (2 blocos no cap. 07) — declarada, não enriquecida.
2. Ausência de ligação publicada antipadrão↔tópico.

## Verificação

- Suite 801/801 · Aceitação 170: 130 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Nove invariantes verdes (41 asserções) · **ouro H byte-idêntico** · orçamentos 8/8
- Cenário novo: **TC-F-63**

## Fecho

- Commit: `b26461181e74ecf8e8f5628f010b1bda00e5ffe5` · tag `v0.20.0-beta.36`
- `release.yml` run **34055196074** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.36` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
