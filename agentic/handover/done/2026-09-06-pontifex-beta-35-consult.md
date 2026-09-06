---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.35 — leitura CONSULT com antipadrões e nível que anota; GR-04 declarado achado de conteúdo.
review_status: pending-human-review
---

# Vaga beta.35 — GR-05 e GR-04 (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («sim», 2026-09-06).
**Bundle:** pin INALTERADO (KG `v1.11.0`). **GR-03 fora desta vaga** (lane Codex/Archon).

## A — GR-05: 5/7 → **7/7 SERVIDO**

`explain_sbd_toe_topic`: banda própria para os **26 antipadrões** (com as 2+5 ligações que o
bundle tem, declaradas como poucas, e o **zero declarado** quando o tópico não tem), e o
**`risk_level` a ANOTAR em vez de exigir**. Fronteira mantida e testada: continua obrigatório
no `select`, `prepare` e capacidade. Custo 1.669–1.966 tk.

## B — GR-04: fica **SERVIDO-MAL** — achado de CONTEÚDO

O bundle **não publica** taxonomia decide-vs-delega. Publica `action` (servido) e
**`proportionality`** — prosa que nomeia quem valida — que existia e **não era servida**;
passa a ser. Não a contei como a peça pedida: seria ajustar a medida ao trabalho feito.
**Reportado ao Orchestrator como achado de conteúdo.**

## Eixo I antes → depois

**4 SERVIDO · 1 SERVIDO-MAL · 1 NÃO SERVIDO** (era 3/2/1). Nenhum outro caso se moveu.

## Verificação

- Suite 799/799 · Aceitação 169: 129 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Oito invariantes verdes · **ouro do Eixo H byte-idêntico** · orçamentos 8/8
- Cenário novo: **TC-F-62**

## Fecho

- Commit: `fe4f59aeec8972db0b6cd02d35b121de8621e9ee` · tag `v0.20.0-beta.35`
- `release.yml` run **34052937325** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.35` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
