---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: handover
reasoning: Adenda ao ciclo beta.24 — teoria do minLevel morta na geração do guia + varredura do guia inteiro.
review_status: pending-human-review
---

# Vaga beta.25 — adenda ao beta.24: a teoria do minLevel e o resto

**Persona:** Pontifex. **Autorização:** adenda do lead ao ciclo beta.24 (2026-09-06).
**Bundle:** pin INALTERADO (KG `v1.11.0`). **Estável:** intocada.
Vaga própria porque a beta.24 já estava publicada e a tag é imutável.

## O essencial

As duas afirmações que o avaliador nomeou já tinham caído na beta.24 (o relatório foi
escrito contra a beta.23). **Mas a teoria sobreviveu num bloco gerado pela própria
beta.24** — a coluna «Presente desde» reintroduzia-a pela forma. Eliminada, com afirmação
positiva nos dois blocos. A varredura do guia inteiro achou mais nove contradições
(«TWO bands», «L1 reduz o âmbito», doutrina pré-declarativa, tamanhos com 30-45% de erro,
proveniência incompleta, search sem a marca NÃO-NORMATIVO).

## Verificação

- Suite 774/774 · Aceitação 153: 113 PASS · 17 PART · **0 FAIL**, gate **PASS** (TC-F-46)
- Ouro byte-idêntico ao da beta.24: `discover` **10/0/0** · declarativo **6/4/0**
- Orçamentos 8/8 · gate completo · guarda do guia de 6 → 10 propriedades

## Fecho

- Commit: `0c3060e9d4e64fc9ad3c459d54831ba86719d015` · tag `v0.20.0-beta.25`
- `release.yml` run **34024615011** → npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.25` = `beta`
- `gitHead` = commit da tag ✓ · `latest` = 0.19.4 **intocado**
