# Eixo I — LEITURAS vs oráculo do lead — 2026-09-06-bordas2 — @shiftleftpt/sbd-toe-mcp@0.20.0-beta.36

Oráculo: `DevelopmentGovernance/docs/golden-reading-cases.md` — v1 (ratificado 2026-09-06, «adjudico», sem emendas). **Os casos são do programme lead: transcritos, nunca emendados, e as expectativas NÃO se ajustam ao comportamento observado.**

Bundle servido: KG `v1.11.0`.

**Medição, não portão** — o Eixo E continua a ser o único gate de promoção. A evolução mede-se por MIGRAÇÃO DE ESTADO, não por percentagem.

Veredictos: **4 SERVIDO · 1 SERVIDO-MAL · 1 NÃO SERVIDO** (de 6).

| Caso | Leitura | Veredicto | Peças servidas | Superfícies usadas |
|---|---|---|---|---|
| GR-01 | IMPL | **SERVIDO** | 5/5 | get_sbd_toe_chapter_implementation_checklist, get_sbd_toe_chapter_brief, get_sbd_toe_chapter_capability, get_guide_by_role, select_sbd_toe_requirements |
| GR-02 | CROSS-CHECK/PLAYBOOK | **SERVIDO** | 5/5 | map_sbd_toe_regulatory_activation, get_sbd_toe_playbook, search_sbd_toe_manual, map_sbd_toe_regulatory_activation(PCI-DSS) |
| GR-03 | PROGRAMA | **NÃO SERVIDO** | 2/6 | plan_sbd_toe_rollout, query_sbd_toe_entities, resolve_entities, select_sbd_toe_requirements |
| GR-04 | PAPEL/MOMENTO | **SERVIDO-MAL** | 3/4 | get_guide_by_role |
| GR-05 | CONSULT | **SERVIDO** | 7/7 | explain_sbd_toe_topic, consult_security_requirements, get_threat_landscape, query_sbd_toe_entities, get_sbd_toe_verification_matrix, get_guide_by_role |
| GR-06 | SETUP | **SERVIDO** | 4/4 | read_sbd_toe_resource(quick-start, model, agent-guide), generate_sbd_toe_skill |

## Por caso — evidência e o que falta para SUBIR DE ESTADO

### GR-01 — IMPL: pôr de pé um capítulo (capacidade organizacional)

> A organização quer implementar o cap. 07 (CI/CD seguro). O que precisa de ter, como sabe que está capaz, e como mede?

**Veredicto: SERVIDO**

| Peça do must-have | Servida | Evidência |
|---|---|---|
| checklist de implementação do capítulo | sim | 2 itens de checklist |
| KPIs/métricas DO CAPÍTULO | sim | get_sbd_toe_chapter_capability: 7 KPIs com thresholds por nível |
| artefactos que a capacidade exige | sim | 29 no brief · 29 na vista IMPL |
| papéis envolvidos e momento no ciclo | sim | 29 atribuições na fase |
| ligação ao cap. 14 (governação/excepção) | sim | 13 requisitos GOV alcançáveis |

> ESCASSEZ DECLARADA (v1.2 regra 2): 2 bloco(s) — achado de CONTEÚDO, sobe ao Author

### GR-02 — CROSS-CHECK/PLAYBOOK: usar uma norma com o Manual (DORA)

> Somos entidade financeira sujeita a DORA. Como é que o SbD-ToE nos serve?

**Veredicto: SERVIDO**

| Peça do must-have | Servida | Evidência |
|---|---|---|
| playbook: mapa artigo→capítulo→acção | sim | get_sbd_toe_playbook (NORMATIVO): 3 playbooks, 29 secções |
| as 6 fases com marcos (M0-M2 … M12-M18) | sim | nas secções do playbook servido |
| checklist de leitura | sim | nas secções do playbook servido |
| delimitação honesta (manual vs overlay/compliance) | sim | 15 áreas activadas |
| princípio declarado (cobre base AppSec; conformidade exige formalização) | sim | delimitação servida em toda a resposta da superfície de playbooks |

> a resposta disponível é contagem de obrigações activadas — o must-NOT do caso

> variante negativa (PCI-DSS): o servidor recusa/declara em vez de improvisar ✓

### GR-03 — PROGRAMA: implementar SbD de raiz

> Organização de ~200 pessoas, sem programa de segurança aplicacional. Por onde começamos e com que sequência?

**Veredicto: NÃO SERVIDO**

| Peça do must-have | Servida | Evidência |
|---|---|---|
| travessia longitudinal (cap. 14: governo em operação E pôr o programa de pé) | **não** | sem entidade de «programa» |
| ordem/fases do programa | sim | 8 fases no rollout |
| o que é pré-requisito de quê | **não** | o rollout declara que o DAG de dependências está adiado |
| papéis a criar | **não** | sem caminho para papéis do PROGRAMA (só papéis de prática) |
| ligação à classificação (cap. 01) como primeiro passo | sim | 7 requisitos CLA alcançáveis por estrutura |
| macro-processos MP1–MP5 como dados | **não** | só PROSA nos chunks — não existem como entidades no KG |

**O que falta para subir de estado:**

- travessia longitudinal (cap. 14: governo em operação E pôr o programa de pé) — sem entidade de «programa»
- o que é pré-requisito de quê — o rollout declara que o DAG de dependências está adiado
- papéis a criar — sem caminho para papéis do PROGRAMA (só papéis de prática)
- macro-processos MP1–MP5 como dados — só PROSA nos chunks — não existem como entidades no KG

> o oráculo declara NÃO SERVIDO esperado por construção enquanto os MP1–MP5 não forem modelados

### GR-04 — PAPEL/MOMENTO: o que faço eu, agora

> Sou Product Owner, início de sprint, equipa a construir uma feature de exportação de dados. O que tenho de garantir?

**Veredicto: SERVIDO-MAL**

| Peça do must-have | Servida | Evidência |
|---|---|---|
| user stories aplicáveis ao papel | sim | 10 histórias / 12 atribuições |
| o momento no ciclo | sim | 12 atribuições com fase |
| o que o PO decide vs o que delega | **não** | não publicado como dado — o bundle tem `proportionality` (12/12 atribuições, prosa que nomeia quem valida) e NENHUMA taxonomia de decisão. ACHADO DE CONTEÚDO, não de serving. |
| a evidência que fica | sim | DoD/evidência nas histórias |

**O que falta para subir de estado:**

- o que o PO decide vs o que delega — não publicado como dado — o bundle tem `proportionality` (12/12 atribuições, prosa que nomeia quem valida) e NENHUMA taxonomia de decisão. ACHADO DE CONTEÚDO, não de serving.

> denominadores declarados: 12 atribuições / 10 histórias

### GR-05 — CONSULT: o que o Manual diz sobre X (sem tarefa)

> O que é que o SbD-ToE diz sobre gestão de segredos?

**Veredicto: SERVIDO**

| Peça do must-have | Servida | Evidência |
|---|---|---|
| requisitos | sim | 16 pela leitura de conhecimento (sem nível) · 14 pelo consult |
| práticas / onde no ciclo | sim | get_guide_by_role por fase |
| provas | sim | matriz de verificação |
| ameaças | sim | 137 ameaças |
| antipadrões (o que NÃO fazer) | sim | banda própria: 0 neste tópico (vazio com CAMINHO CONCRETO: 8 capítulos com chamada executável e rótulos) |
| proveniência marcada (manual-grounded) | sim | provenance no payload |
| não exige risk_level para uma pergunta de conhecimento | sim | explain_sbd_toe_topic responde sem nível; o nível ANOTA quando dado |

> a pergunta foi feita como o oráculo a escreve: sem tarefa, sem projecto e sem `risk_level`

> banda vazia com CAMINHO CONCRETO: 8 capítulos com chamada executável e rótulos

### GR-06 — SETUP: configurar-se para usar bem o Manual (controlo positivo)

> Sou um agente novo neste repositório. Como me configuro para trabalhar com o SbD-ToE?

**Veredicto: SERVIDO**

| Peça do must-have | Servida | Evidência |
|---|---|---|
| arranque barato (quick-start) | sim | 583 tk |
| skill/subagente do papel certo | sim | generate_sbd_toe_skill(role) |
| vocabulário e as três formas de pedir | sim | formas publicadas: A,B,C |
| declaração do que o servidor NÃO faz | sim | declarado no guia/quick-start |
