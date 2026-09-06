---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Vaga beta.29 — lane SERVING da fase de navegação: ordenação por pertença e verdade sobre o roteamento.
review_status: pending-human-review
---

# Vaga beta.29 — navegação (linha beta 0.20-beta)

**Persona:** Pontifex. **Autorização:** lead («avançamos agora com o pontifex», 2026-09-06), §22.
**Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.
Lanes de VOCABULÁRIO (25.º concern) e EPISTÉMICA (`model_limits`) ficam com o lead — não tocadas.

## O que mudou

1. **Ameaças por PERTENÇA** — página 1 de `integration`: MT-001..008 @cap.01 → **MT-039..045
   @cap.03**; `iac`→08, `logging`→12, `files`→06; caps. 01/02 no fim. 25/25 específicas.
2. **Roteamento ≠ cobertura** — 24 sem erro · **11 com domínio próprio, nomeados** e iguais ao
   comportamento medido (o avaliador estimou 7; a 1ª derivação minha deu 12).
3. **Bug do contador** da legenda (dizia 0 com 13 nos arrays) — instância única, varrida.
4. **Ordem do guia** invertida (ressalva antes da instrução).
5. **Nota do `operator: extend`** a descrever o real (selected idêntico; lista paralela).
6. Promessa/excepção do `detail` no mesmo sítio; armadilha da paginação dita no `meta.note`.

## Reportado, não corrigido (prioridade)

Classe REPETIÇÃO (da varredura da beta.28): `verification_matrix` **9.074 tk** (p1) e
`select.narrowed_out` **2.100 tk** (p2). Classe ORDENAÇÃO: nenhuma outra instância.

## Verificação

- Suite 790/790 · Aceitação 162: 122 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Invariante entre superfícies (beta.28) verde · ouro byte-idêntico · orçamentos 8/8
- Cenários novos: **TC-F-54, TC-F-55**

## Fecho

- Commit: `2ff38091657b20769c250740f8f2ab770e131850` · tag `v0.20.0-beta.29`
- `release.yml` run **34034024200** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.29` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
