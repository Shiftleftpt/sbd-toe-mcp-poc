---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-06
purpose: documentation
reasoning: v0.20.0-beta.34 (beta line, npm `beta`) — CAPACIDADE: `get_sbd_toe_chapter_capability` dá caminho à MEDIDA de capacidade (99 KPIs com thresholds por nível + artefactos), fecha o ciclo com o assess nos dois sentidos, e declara a leitura IMPL vs GUIDE na própria resposta e no guia. GR-01 no Eixo I: NÃO SERVIDO → SERVIDO (5/5). Descoberto que o brief JÁ servia os artefactos — o zero era defeito da sonda. Declarada a lacuna do checklist. Selecção intocada; ouro H byte-idêntico.
review_status: pending-human-review
---

# Changelog

## 0.20.0-beta.34 — 2026-09-06

**CAPACIDADE — o GR-01 sai de NÃO SERVIDO.** Autorizado pelo lead («avança», 2026-09-06) a
partir da medição #2 do Eixo I. Oráculo: GR-01 + emenda v1.1 (**peça central = os KPIs/medida
de capacidade do capítulo**). Bundle pin INALTERADO (release KG `v1.11.0`); **linha estável
intocada**.

> A leitura IMPL — «a organização quer implementar o cap. 07: que capacidade precisa de ter,
> como sabe que está capaz, e como mede?» — não tinha a sua peça central: as 99 métricas
> estão publicadas com thresholds por nível, e a única superfície que lhes tocava
> (`assess_sbd_toe_implementation`) avalia KPIs que o CHAMADOR traz. **Nada havia a construir
> a montante; faltava a porta.**

### A forma: `get_sbd_toe_chapter_capability`

| pedido | custo |
|---|---|
| `chapter="07-cicd-seguro", risk_level="L2"` | **3.270 tk** — 7 KPIs + 29 artefactos |
| `metric_id="CIC-K01"` | **449 tk** |
| todos os 99 KPIs | 6.165 tk (paginado, 25/página) |

Alcançável **por capítulo**, **por `metric_id`** e **por dimensão**; `risk_level` acrescenta
`target_at_level`. O que a torna uma superfície de MEDIR e não de listar é servir os
**`thresholds_by_level`** como dado (L1/L2/L3, com operador, valor e unidade) — mais o tipo,
o período e a proveniência. Capítulo sem KPIs publicados devolve `no_measures_published`
declarado, nunca um vazio mudo.

### O ciclo fecha-se nos dois sentidos

A vista IMPL encaminha para `assess_sbd_toe_implementation` («traz os teus valores medidos»)
e a avaliação passa a apontar de volta para os KPIs que o Manual define. Até aqui o chamador
tinha de trazer os KPIs **às cegas**, porque nada publicava os que o Manual estabelece.

### Os artefactos: o defeito era da MEDIÇÃO, não do servidor

O GR-01 media «0 artefactos no brief». Investigado: **o brief serve 29 artefactos para o
cap. 07** — a sonda é que o chamava com `chapter` em vez de `chapterId` e lia `artifact_ids`
em vez de `artifacts`. Terceira vaga seguida em que o instrumento tinha um defeito que se
lia como defeito do servidor; corrigi a sonda. A vista IMPL serve-os na mesma, com
`mandatory` e categoria, porque a leitura pede-os no mesmo sítio que a medida.

### IMPL ≠ GUIDE, declarado onde é preciso

A mesma pergunta sobre um capítulo tem duas respostas legítimas, e servir uma quando se
pedia a outra é o must-NOT do próprio caso. Agora: a resposta da vista IMPL traz o campo
**`reading: { id: "IMPL" }`** com a distinção explícita, e o guia ganha um bloco GERADO novo
— **«As LEITURAS»** — que mapeia as seis leituras (GUIDE · IMPL · CONSULT · CROSS-CHECK ·
PAPEL/MOMENTO · SETUP) às superfícies que as servem.

### Declarado, não corrigido (decisão do lead)

Confirmada a lacuna que o avaliador suspeitou: **o `chapter_implementation_checklist` não
cobre capacidade organizacional** — devolve 1 item para o cap. 02, 2 para o cap. 07 e 2 para
o cap. 14, e os itens são **secções de prosa** (chunks de retrieval), não uma checklist de
capacidade. Mudar isto é decisão do lead, não desta vaga.

### O EIXO I, antes → depois

| caso | beta.33 | **beta.34** |
|---|---|---|
| **GR-01** | **NÃO SERVIDO** | **SERVIDO** — 5/5 peças |
| GR-02 | SERVIDO | SERVIDO |
| GR-03 | NÃO SERVIDO | NÃO SERVIDO |
| GR-04 · GR-05 | SERVIDO-MAL | SERVIDO-MAL |
| GR-06 | SERVIDO | SERVIDO |

**3 SERVIDO · 2 SERVIDO-MAL · 1 NÃO SERVIDO** (era 2/2/2). **Nenhum outro caso se moveu.**

### Verificação

- **Suite** 799/799 · **Aceitação** 168 → **128 PASS · 17 PART · 0 FAIL**, gate **PASS**
  (novo TC-F-61).
- **As oito invariantes verdes** (39 asserções).
- **Ouro do Eixo H byte-idêntico ao da beta.33** nos dois braços: `discover`
  **10 PASS / 0 / 0**, declarativo **6 PASS / 4 PART / 0 FAIL**. **A selecção não se mexeu.**
- **Orçamentos** 8/8 do `prepare` inalterados — a superfície nova é independente e paginada.
- **Gate**: stdout só JSON-RPC · exit 0 · 27 tools.

## 0.20.0-beta.33 — 2026-09-06

**PLAYBOOKS com caminho próprio — o GR-02 sai de NÃO SERVIDO.** Autorizado pelo lead
(«avança», 2026-09-06) a partir da baseline medida do Eixo I. Oráculo: GR-02 + **emenda
v1.1** («há caminho» exige a PEÇA CENTRAL; a do GR-02 é **o playbook**). Bundle pin
INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

> A medição da beta.32 deu ao GR-02 **1 de 5 peças**, e sob o critério v1.1 isso é **NÃO
> SERVIDO**: o playbook do DORA só era alcançável por `search_sbd_toe_manual`, declarado
> NÃO-NORMATIVO. É a leitura que os clientes fazem primeiro — «como é que o SbD-ToE me serve
> para o DORA?» — e era a que estava pior.

### Não havia nada a construir a montante

Confirmado: `overlay/overlay_playbooks.json` publica **20 entradas** (6 cross-check normativo
· 5 playbooks de implementação · 3 notas de convergência · 5 exemplos ilustrativos · 1
índice) e todas ligam por `document_id` a **450 secções** nos chunks de
`002-cross-check-normativo`. **Faltava a porta** — e é só isso que esta vaga é.

### A forma: `get_sbd_toe_playbook`

Tool nova, porque é uma LEITURA distinta (não é selecção) e precisa de declarar autoridade
própria; um resource não paginaria 450 secções.

| pedido | resposta |
|---|---|
| sem argumentos | índice completo — **2.276 tk** |
| `framework="DORA"` | os playbooks do diploma — **1.341 tk** |
| `playbook_id="OVR-DORA-playbook"` | secções paginadas (10 por defeito) — **3.129 tk**; as 29 completas = 7.497 tk |
| `kind=…` | filtra o índice por tipo |

Alcançável pelas três formas onde faz sentido: **por framework** (conceito), **por
`playbook_id`** (estrutura), **por tipo** (estrutura), e o `next` navega para as obrigações.

### Como distingo playbook de exemplo ilustrativo

O Manual distingue-os e a superfície **nunca os mistura**: os 5 `illustrative_example` (+ o
índice) saem numa **banda própria**, `illustrative_examples`, com aviso de que *mostram uma
forma de fazer e não normalizam*. Cada resposta traz `authority.tier`
(`normative` | `illustrative`) mais o `authority_class`, `curation_status` e
`adoption_status` que o bundle publica. Um exemplo servido como cross-check parte o cenário.

### A delimitação é obrigatória, não opcional

Toda a resposta desta superfície traz a **delimitação honesta**: *o SbD-ToE não é uma norma;
implementá-lo cobre grande parte da base AppSec e operacional, mas a conformidade final
depende de formalização regulatória adicional, que fica fora do Manual*. Sem esta peça,
servir um playbook vira claim de conformidade — que é o que este programa nunca faz.

### Frameworks sem cross-check: declarados, com o roadmap DO MANUAL

`framework="PCI-DSS"` (ou ISO 27001, HIPAA, SOC2, FedRAMP, CSA STAR) devolve
`status: "no_cross_check"` com a lista **derivada do próprio Manual** (a secção «Frameworks a
Incluir (Roadmap)» do `002-cross-check-normativo-01-intro`), a razão, e o que EXISTE — o
grounding no AppSec Core — com a proibição explícita de construir um cross-check a partir de
requisitos genéricos. A variante negativa do GR-02 continua a passar.

### Ligação nos dois sentidos

Quem pede `map_sbd_toe_regulatory_activation` passa a ser encaminhado para o playbook (era a
peça mais rica e a invisível); o playbook aponta de volta para as obrigações e para os
requisitos do capítulo. **Sobre o `framework_ids` plural:** verificado — **nenhuma superfície
de serving lia os playbooks** antes desta vaga, portanto o defeito de agrupar por
`framework_id` singular não existia aqui; a nova superfície lê o campo plural, como
publicado.

### O EIXO I, antes → depois

| caso | beta.32 (critério v1) | beta.33 (critério **v1.1**) |
|---|---|---|
| **GR-02** | SERVIDO-MAL → **NÃO SERVIDO** sob v1.1 | **SERVIDO** (5/5 peças, por caminho normativo) |
| GR-01 | SERVIDO-MAL | **NÃO SERVIDO** — *sem alteração de código: é o critério v1.1 a aplicar-se* (a peça central são os KPIs por capítulo, que continuam sem caminho) |
| GR-03 | SERVIDO-MAL | **NÃO SERVIDO** — idem (MP1–MP5 não existem como entidades) |
| GR-04 · GR-05 | SERVIDO-MAL | SERVIDO-MAL (inalterados) |
| GR-06 | SERVIDO | SERVIDO (controlo positivo) |

**Total: 2 SERVIDO · 2 SERVIDO-MAL · 2 NÃO SERVIDO.** Os movimentos do GR-01 e GR-03 são a
**re-classificação prevista pela própria emenda v1.1**, não regressões — e é isso que a
emenda queria: uma escala que discrimina.

> **A sonda do GR-03 tinha um falso positivo meu**, da mesma família do que o controlo
> positivo apanhou na beta.32: dava os MP1–MP5 como «encontrados» porque o regex casava com o
> **título de um chunk** (`os-cinco-macro-processos`) — ou seja, com a PROSA que o oráculo já
> declara existir. Apertei a sonda para exigir **entidade** (`resolve_entities` com id
> `MP-[1-5]`), e o caso passou a NÃO SERVIDO, que é o que o oráculo prevê. Corrigi a
> MEDIÇÃO, não o servidor.

### Verificação

- **Suite** 799/799 · **Aceitação** 167 → **127 PASS · 17 PART · 0 FAIL**, gate **PASS**
  (novo TC-F-60).
- **As oito invariantes verdes** (39 asserções).
- **Ouro do Eixo H byte-idêntico ao da beta.32** nos dois braços: `discover`
  **10 PASS / 0 / 0**, declarativo **6 PASS / 4 PART / 0 FAIL**. **A selecção não se mexeu.**
- **Orçamentos** 8/8 do `prepare` inalterados — a superfície nova é independente e paginada.
- **Gate**: stdout só JSON-RPC · exit 0 · 26 tools (com `get_sbd_toe_playbook`).

## 0.20.0-beta.32 — 2026-09-06

**EIXO I (leituras): a medição e a primeira baseline.** Autorizado pelo lead («adjudico» +
«avança», 2026-09-06). Oráculo novo, **imutável e do lead**:
`DevelopmentGovernance/docs/golden-reading-cases.md` v1 (GR-01..06) — transcrito, nunca
emendado, e as expectativas **não** foram ajustadas ao comportamento observado. Bundle pin
INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

> Porque existe: os 10 casos do Eixo H medem UMA leitura (GUIDE — «que requisitos se aplicam
> a esta tarefa») e medem-na bem. As outras seis nunca foram medidas — e é por isso que onze
> ciclos de melhoria não moveram o Eixo H: melhoraram tudo menos a selecção por tarefa.

### A BASELINE — 1 SERVIDO · 5 SERVIDO-MAL · 0 NÃO SERVIDO

| Caso | Leitura | Veredicto | Peças | O que falta para SUBIR DE ESTADO |
|---|---|---|---|---|
| **GR-01** | IMPL | SERVIDO-MAL | 3/5 | **KPIs por capítulo** (existem 99 métricas no bundle, sem caminho para as pedir por capítulo) · **artefactos** da capacidade (0 no brief do cap. 07) |
| **GR-02** | CROSS-CHECK | SERVIDO-MAL | **1/5** | o **playbook DORA** só existe por `search_sbd_toe_manual`, que está declarado **NÃO-NORMATIVO** · as **6 fases com marcos** e a **checklist de leitura** não têm entidade nem caminho · o **princípio declarado** não é dado |
| **GR-03** | PROGRAMA | SERVIDO-MAL | 3/6 | **MP1–MP5 não existem como entidades no KG** · sem entidade de «programa» · o `plan_rollout` declara o DAG de dependências adiado · sem papéis do PROGRAMA |
| **GR-04** | PAPEL/MOMENTO | SERVIDO-MAL | 3/4 | **o que o papel decide vs o que delega** não é publicado como dado (nem no assignment nem na história) |
| **GR-05** | CONSULT | SERVIDO-MAL | 5/7 | os **26 antipadrões** não têm caminho próprio · **todas as superfícies normativas exigem `risk_level`** para uma pergunta de conhecimento |
| **GR-06** | SETUP | **SERVIDO** | 4/4 | — (controlo positivo) |

**Nenhum must-NOT violado** em nenhum dos seis.

### O controlo positivo fez o seu trabalho — sobre a MEDIÇÃO

Na primeira corrida o **GR-06 deu SERVIDO-MAL**. O oráculo prevê que ele passe e o despacho
manda investigar a medição antes de concluir — e era mesmo a medição: a minha sonda comparava
a primeira **menção** a `setup_sbd_toe_agent` com a primeira ocorrência de «prompt MCP», e a
primeira menção está **dentro da própria ressalva** («ANTES de o tentares chamar — verdade do
canal: `setup_sbd_toe_agent` é um **prompt MCP**»); além disso a regex falhava na quebra de
linha do markdown. Corrigida a SONDA (compara a **invocação** com a ressalva, sobre texto
normalizado), o GR-06 passa a **SERVIDO** e as 4 peças estão servidas. **O servidor não foi
tocado.**

### Divergência entre a previsão do oráculo e a medição — para o lead

O oráculo ratificado diz que o **GR-03 entra «com NÃO SERVIDO esperado por construção»**. A
medição dá **SERVIDO-MAL**, e a razão é o critério: *NÃO SERVIDO = não há caminho*, e há —
`plan_sbd_toe_rollout` responde e entrega **uma** das peças do must-have (a ordem/fases). As
outras cinco faltam, incluindo os MP1–MP5. **Não ajustei o oráculo nem forcei o veredicto**:
registo a divergência para o lead decidir se o critério de «caminho» deve ser mais exigente
(p.ex. exigir que o caminho sirva a peça CENTRAL da leitura, não uma qualquer).

### O que RESISTI a corrigir

Todas as lacunas acima. Duas eram tentadoramente triviais e ficaram por tocar, para a
baseline ser honesta: **(a)** dar caminho aos 26 antipadrões (GR-05) — o `resolve_entities`
já os tem como `record_type`, faltava só ensino e uma porta; **(b)** os artefactos do cap. 07
no GR-01, que o brief já resolve para outros capítulos. Ambas passam para a fila do ciclo
seguinte, agora com alvo medido.

### Como está montado

`scripts/acceptance/axis-i.mjs` (os seis casos transcritos + a classificação) e
`scripts/run-axis-i-readings.mjs` (`npm run eval:axis-i`), no padrão do Eixo H. O registo em
`docs/acceptance-runs/` guarda **veredicto, peça a peça, evidência e o que falta** — para a
evolução se medir por **migração de estado** entre corridas, não por percentagem. Como o
Eixo H, **o Eixo I é medição e nunca entra no gate de promoção** (o Eixo E continua a ser o
único portão), e o relatório de aceitação passa a dizê-lo.

### Verificação

- **Suite** 799/799 (57 ficheiros) · **Aceitação** 166 → **126 PASS · 17 PART · 0 FAIL**,
  gate **PASS**.
- **As oito invariantes verdes** (39 asserções): conservação, entre-superfícies,
  contrato-de-superfície, alcançabilidade, superfícies de vocabulário, notas de
  comportamento, guia derivado, next-verbatim.
- **Ouro do Eixo H byte-idêntico ao da beta.31** nos dois braços: `discover`
  **10 PASS / 0 / 0**, declarativo **6 PASS / 4 PART / 0 FAIL**. **A selecção não se mexeu**
  — esta vaga não alterou comportamento, só instrumentou a medição.
- **Orçamentos** 8/8 inalterados · **Gate**: stdout só JSON-RPC · exit 0 · versão coerente.

## 0.20.0-beta.31 — 2026-09-06

**AS BORDAS: o que descreve comportamento tem de ser gerado a partir do comportamento.**
Autorizado pelo lead («avança», 2026-09-06); §25 da design note. Bundle pin INALTERADO
(release KG `v1.11.0`); **linha estável intocada**.

> «O NÚCLEO — selecção, bandas, denominadores, traço — está sujeito a geração e a suite. As
> BORDAS não. **Todos os achados desta versão estão nas bordas**, e todos são da mesma
> família: texto que descreve comportamento e que não é gerado a partir do comportamento.»

### 1 — Invariante alargada: o INVENTÁRIO das 11 superfícies que resolvem vocabulário

O P0 entrou porque o `get_guide_by_role` **nunca esteve no varrimento**. A regra «onde mais
vive esta classe?» aplicada ao próprio conjunto de superfícies vigiadas: inventariei as **11
tools que aceitam um valor de vocabulário** (papéis, fases, capítulos, categorias,
tecnologias, record_types, frameworks) e meti-as todas na invariante, corrida **antes** de
corrigir.

| # | instância | quem a conhecia |
|---|---|---|
| 1 | `get_guide_by_role × "fornecedores-terceiros"` — papel CANÓNICO, `assignments: []`, sem `unsupported_role` | o avaliador (P0) |
| 2 | `get_guide_by_role` — `meta.knownRoles` **omitia o papel que a própria resposta resolveu** como canónico | o avaliador (agravante) |
| 3 | `chapter_implementation_checklist × "00-fundamentos"` — vazio mudo | **ninguém** |
| 4 | `map_regulatory_activation × "ENISA-CSA"` — vazio mudo | **ninguém** |

**Duas das quatro eram desconhecidas** — o varrimento alargado pagou-se na primeira corrida.
Todas fechadas: `unsupported_role` (com os papéis que a superfície mapeia e a proibição
explícita de concluir ausência de responsabilidades), `knownRoles` a partir do vocabulário
publicado, `unsupported_chapter` no checklist, e **`unsupported_obligations`** no overlay —
o item que o avaliador pediu quatro vezes, resolvido aqui como instância da classe.

### 2 — Notas das respostas GERADAS da mesma fonte que as descrições

A varredura das notas que descrevem comportamento (6 superfícies) deu **duas**:

| nota | estado |
|---|---|
| `meta.note` do `get_threat_landscape` | **FÓSSIL**: descrevia a ordenação da beta.26 e dizia «não presumas que as primeiras são as mais relevantes» — **duas versões atrasada e o conselho OPOSTO ao correcto**, depois de a beta.29 ter posto a página 1 a ser precisamente a relevante |
| `meta.note` do `select` (paginação) | correcta, mas era um segundo texto manual à espera de divergir |

`serving/behaviour-notes.ts` passa a ser a **fonte única**: a descrição da tool e a nota da
resposta lêem a MESMA constante, e `behaviour-notes.test.ts` (4 propriedades) guarda que
aparecem nos dois, que a frase fóssil não volta, e que **a nota descreve o comportamento
real** (se promete domínio na página 1, a página 1 é do domínio). É a disciplina da beta.25,
que gerou o agent-guide, estendida ao último texto manual do sistema.

### 3 e 4 — `routing_basis` desambiguado, por concern, e os dois sentidos separados

A nota trazia `"capítulo(s) próprio(s): 4"` — o `4` era o **número do capítulo** e foi lido
como contagem. Agora `domain_chapters: ["04"]` (lista, sem ambiguidade) e **`by_concern[]`**,
porque num conjunto misto o `basis` escalar mentia: com `[architecture, api, encryption]` só
o `architecture` roteia por capítulo mapeado, e a resposta dizia uma coisa só para os três.
Os dois sentidos de «capítulo próprio» ficam separados: **`threat_domain_chapters`** (o
mapeamento de ameaças, que pode ser partilhado — `shared_with`) versus **`activates_chapters`**
(o que o concern activa na SELECÇÃO), que podem divergir no mesmo concern.

> **O valor `domain_chapter` NÃO foi renomeado.** Cheguei a renomeá-lo para
> `threat_domain_chapter` e dois cenários apanharam-no: é contrato publicado desde a beta.28,
> e renomeá-lo seria exactamente a classe de dano que esta vaga combate. A ambiguidade estava
> na NOTA, e é lá que foi corrigida.

### 5 — A contraprova que o guia exige passa a ser possível

O guia manda contraprovar contra o `consult`, mas o `consult` não aceita `chapters`, não
aceita `technologies` e tem `maxItems: 5` — a chamada principal de um agente real **não tinha
equivalente**. **Decisão declarada:** não alargar o `consult` (é superfície de CATÁLOGO;
aceitar activadores de selecção mudaria o que ela é — foi o que a beta.28 declarou em
`ignored_activators`). Em vez disso o `select` faz a verificação e devolve-a em
**`cross_surface_check`**: o que é comparável, se concordam nisso (27 = 27, ids iguais), e o
que **não** é comparável e porquê. Custo: **63 tk**.

### 6 — Menores

- **`equivalent_to`** em `data_sensitivity` (pedido 3×): `regulated` e `personal` activam
  exactamente o mesmo (37 requisitos, ids idênticos — verificado); a equivalência é declarada
  e aponta para onde a diferença VIVE de facto, que é o overlay regulatório.
- **`distinctUserStoryCount`** ao lado do `assignmentCount`: as «US-21 ×4» **não eram
  duplicação** — são 25 atribuições distintas que partilham 21 histórias. Desduplicar perderia
  atribuições; o que faltava era o denominador ao lado para o número não ser mal lido.

### Verificação

- **Suite** 799/799 (57 ficheiros) · **Aceitação** 166 → **126 PASS · 17 PART · 0 FAIL**,
  gate **PASS** (novos TC-F-58/59).
- **Ouro byte-idêntico ao da beta.30** nos dois braços: `discover` **10 PASS / 0 / 0**,
  declarativo **6 PASS / 4 PART / 0 FAIL**. **A selecção não se mexeu.**
- **Orçamentos** 8/8 do `prepare` inalterados.
- **Gate**: stdout só JSON-RPC · exit 0 · `package_version` coerente.
- **Um cenário meu voltou a cair na armadilha da CITAÇÃO** (3.ª vez na série): acusou a nota
  do `unsupported_role` de concluir ausência de responsabilidades quando ela **proíbe** essa
  conclusão. Corrigido, e a asserção passou a exigir também a distinção explícita entre
  «ausência de mapeamento» e «ausência de responsabilidades».

## 0.20.0-beta.30 — 2026-09-06

**As TRÊS FORMAS DE PEDIR: declarativo ≠ enumerado.** Autorizado pelo lead (2026-09-06);
desenho e as 4 decisões em `mcp-three-ways-to-ask-design-note.md` §7, princípio em §23.
Bundle pin INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

> **O contrário de «adivinhar prosa» não é «escolher de uma lista» — é «pedir com precisão».**
> Ao matar a inferência promovemos os `concerns` — que são um ATALHO — a interface única, e
> um grafo com dezenas de tipos passou a ser consumido como um menu de 24 botões. Prova: 14
> concerns declarados exaustiva e correctamente não chegaram ao cap. 14, e a única porta
> publicada era `changed_files=["docs/**"]` — **declarar um ficheiro que não existe**. Num
> contrato cuja regra é «declara só o que sabes ser verdade», o servidor pedia uma mentira.

### O INVENTÁRIO da alcançabilidade (corrido ANTES de qualquer correcção)

`reachability-invariant.test.ts`, três propriedades. Inventário da primeira corrida:

| | |
|---|---|
| capítulos **inalcançáveis** por qualquer forma | **0** |
| capítulos **sem atalho de conceito** (só por estrutura) | **5**: `01-classificacao-aplicacoes`, `02-requisitos-seguranca`, `06-desenvolvimento-seguro`, `13-formacao-onboarding`, `14-governanca-contratacao` — sendo que 02 e 06 são alcançados de facto pelas categorias da baseline; os **3 verdadeiramente órfãos** são 01, 13 e 14 |
| categorias sem atalho de conceito | **3**: `CLA`, `TRN`, `GOV` — exactamente as dos três capítulos órfãos |
| **caminhos FALSOS oferecidos** | **9** (3 capítulos × 3 níveis): `13` e `14` ofereciam SÓ `changed_files=["aos/**"]`/`["docs/**"]`; `01` declarava que não havia caminho nenhum |

Coerência que valida o inventário: as três categorias órfãs são as mesmas que a beta.26 já
tinha encontrado (`CLA`/`GOV`/`TRN`), e mapeiam exactamente para os três capítulos sem porta.

### 1 — B e C de primeira classe

**B (estrutura) abriu-se na PRÓPRIA superfície de selecção**: `chapters` e `categories` como
activadores declarados. Escolha declarada: pô-los ao lado da forma A dá-lhes as mesmas
bandas, o mesmo traço (`layer: "declared_structure"`), os mesmos denominadores e a mesma
declaração de fora-de-âmbito — a resposta fica comparável e auditável, em vez de mandar o
chamador para uma tool de listagem crua. É **aditivo**: sem eles, nada muda.

```
select_sbd_toe_requirements(risk_level="L3", chapters=["14-governanca-contratacao"])  → 14 requisitos GOV
select_sbd_toe_requirements(risk_level="L3", categories=["GOV"])                      → os mesmos 14
select_sbd_toe_requirements(risk_level="L2", chapters=["01-classificacao-aplicacoes"]) → 8 requisitos CLA
```

Valores que o catálogo não conhece vêm em `unknown_structural` — nunca descartados em
silêncio. **Já existia** e mantém-se: `resolve_entities(record_type, filters)`,
`get_sbd_toe_verification_matrix(requirement_ids)`, `trace_sbd_toe_requirement_sources`.

**C (navegação) já existia** (`trace_sbd_toe_graph(anchor, lens)`): o que faltava era estatuto
— passa a estar nomeada e exemplificada no arranque, no modelo e no guia.

### 2 — Recurso de MODELO (e um quick-start)

**`sbd://toe/model`** — o mapa, não a lista de botões. Derivado como tudo o resto: entidades
com contagens reais (273 requisitos, 233 ameaças, 260 práticas, 20 controlos…), **relações
com cardinalidades reais** (`requirement → control`: 305 arestas; `artifact → requirement`:
45; `signal → evidence`: 11…), e cada capítulo e categoria com **a forma que o alcança**.
Custo: **2.731 tk**.

**`sbd://toe/quick-start`** — o arranque mínimo que o avaliador pediu: **500 tk** contra
**13.135 tk** do arranque completo (guia + vocabulário), com o resto por leitura dirigida.

### 3 — Invariante de alcançabilidade e o fim dos caminhos falsos

`activate_with` passa a oferecer, por ordem de custo: atalho de conceito → tecnologia →
**ESTRUTURA (sempre verdadeira)** → e o caminho de ficheiro **só como opção adicional e
condicionada**: *«ou `changed_files=["docs/**"]` SE esses ficheiros existirem mesmo no teu
repositório»*. Depois da correcção: **0 caminhos falsos**, e a via estrutural presente em
todos os capítulos da banda. Custo da banda: 602 → **929 tk** (o preço de oferecer um caminho
verdadeiro a cada capítulo, em vez de um inventado a alguns).

### 4 — Ensino

O guia deixa de dizer «declara concerns» como via única: abre com **as três formas, quando
usar cada uma e um exemplo executável de cada** (bloco GERADO do mesmo modelo, para o ensino
não poder divergir do comportamento), e diz quais os capítulos e categorias que só se
alcançam por estrutura. Guia: 7.800 → **9.941 tk**; quem quiser o caminho barato lê o
quick-start de 500.

### 5 — Cap. 01: EXECUTAR ≠ ENSINAR

A precisão do lead fecha a questão antiga: o cap. 01 **explica como fazer a classificação** —
quem faz o quê, casos de uso, quando no lifecycle — e o que não faz é CALCULAR o nível. O
erro (meu, na beta.26) foi confundir executar com ensinar, e era absurdo exigir `risk_level`
em quase todas as tools sem ter caminho para explicar como se obtém. **O cap. 01 tem porta**
(`chapters=["01-classificacao-aplicacoes"]`, 8 requisitos) e o servidor **continua a nunca
emitir nível** — o quick-start di-lo explicitamente.

### Verificação

- **Suite** 793/793 (55 ficheiros) · **Aceitação** 164 → **124 PASS · 17 PART · 0 FAIL**,
  gate **PASS** (novos TC-F-56/57).
- **As cinco invariantes anteriores continuam verdes** (conservação, entre-superfícies,
  contrato-de-superfície, next-verbatim, guia derivado) — 33 asserções, 6/6 ficheiros.
- **Ouro byte-idêntico ao da beta.29** nos dois braços: `discover` **10 PASS / 0 / 0**,
  declarativo **6 PASS / 4 PART / 0 FAIL**. **A selecção por A não se mexeu.**
- **Orçamentos** 8/8 do `prepare` inalterados.
- **Gate**: stdout só JSON-RPC · exit 0 · 12 recursos (com `model` e `quick-start`) ·
  `package_version` = `sbd://toe/version` = `provenance.server`.
- **Um cenário meu foi actualizado com a razão declarada**: o TC-F-49 exigia que o cap. 01
  justificasse não ter activador com o princípio «superfície de engenharia» — **revogado pelo
  lead no §23**. Passa a exigir o contrato novo: caminho estrutural verdadeiro, nunca um
  ficheiro.

## 0.20.0-beta.29 — 2026-09-06

**Navegação: pôr o relevante à frente e dizer a verdade sobre o roteamento.** Autorizado
pelo lead («avançamos agora com o pontifex», 2026-09-06); §22 da design note, lane SERVING.
Bundle pin INALTERADO (release KG `v1.11.0`); **linha estável intocada**. As lanes de
VOCABULÁRIO (25.º concern) e EPISTÉMICA (`model_limits`) ficam com o lead — não tocadas.

### 1 — Ameaças ordenadas por PERTENÇA ao âmbito declarado

Reproduzido: a ordem era `mitigation_confidence` e depois `chapter_id`, mas **todas as
ameaças são `derived`** — logo era alfabética por capítulo, e as 40 primeiras eram
MT-001..040 dos caps. 01/02. Medido também o filtro: 14 concerns → 218 ameaças,
1 concern → 218 (**0% de redução** na sonda desta linha).

É a **mesma correcção que fechou os `evidence_patterns` na beta.27** — pertença primeiro.
Três escalões derivados do declarado: (1) capítulo de domínio dos concerns; (2) restantes
capítulos activados (chegaram pelos controlos); (3) **caps. 01 e 02 por último** —
classificação e meta-ameaças de PROCESSO, verdadeiras mas genéricas. Dentro de cada escalão,
a ordem antiga, para o resultado continuar determinístico.

**A página 1, antes → depois:**

| concern | antes | depois |
|---|---|---|
| `integration` | MT-001..008 @cap.01 («Overengineering», «Segurança opcional») | **MT-039..045 @cap.03** |
| `iac` | idem | **MT-132..138 @cap.08** (o seu capítulo de domínio) |
| `logging` | idem | **MT-197..203 @cap.12** |
| `files` | idem | **MT-093..099 @cap.06** |

Em todos os quatro casos a página 1 passou a ser **25/25 (ou 15/15) específicas**, e as
meta-ameaças de processo ficam no fim do conjunto completo — verificado por cenário, com
monotonia (nenhuma genérica à frente de uma específica). O conjunto NÃO muda: muda a ordem.
O payload da página 1 desce de ~6,7k para **5.834 tk** (5.221 em `detail="minimal"`).

**A varredura da classe «ordena por id prometendo relevância»:** varri as descrições de
todas as tools à procura de promessas de ordem. **Nenhuma outra superfície promete
relevância enquanto ordena por id** — o `prepare` já ordena por pertença desde a beta.27 e
di-lo; o `plan_sbd_toe_rollout` é phase-ordered e declara que o DAG está adiado. Ficou uma
etiqueta desactualizada («evidence-pattern relevance-cap metrics»), corrigida. As duas
entradas de REPETIÇÃO da varredura da beta.28 são de outra classe (duplicação, não ordem) e
**ficam reportadas com prioridade**: `get_sbd_toe_verification_matrix` **9.074 tk**
(prioridade 1) e `select.narrowed_out` **2.100 tk** (prioridade 2).

### 2 — Roteamento ≠ cobertura, dito ANTES de gastar a chamada

«24 de 24» era verdade só no sentido de «não dá erro». O terceiro estado — `routing_basis`
`domain_chapter` vs `activated_controls` — só aparecia depois da chamada. A tabela do guia
(bloco gerado) e a descrição da tool passam a publicar **duas colunas**: *resolve sem erro:
**24*** · *tem ameaças de domínio próprias: **11***, com os onze **nomeados**
(`architecture`, `build`, `deployment`, `distribution`, `iac`, `logging`, `monitoring`,
`release`, `supply_chain`, `testing`, `threat_modeling`).

> O avaliador estimou 7; a minha primeira derivação deu 12. **O número publicado é o
> medido**: 11, e o cenário verifica concern a concern que a lista publicada é exactamente a
> que o `routing_basis` produz. A diferença estava no `requirements`, cujo capítulo é o 02 —
> que a ordenação exclui por ser o das meta-ameaças. Publicar um número que o servidor não
> produz seria repetir o defeito dos «13 concerns» da beta.24.

### 3 — O bug do contador

`associated_control_legend.note` dizia «os **0** nomes e **0** ids DISTINTOS» com 13 nos
arrays. Causa: num literal de objecto, a nota era interpolada **antes** de o
`threats.map(...)` correr o `refOf` que preenche as legendas. O mapeamento passou para antes
do literal. *(Uma primeira tentativa com getter não resolveu — o spread avalia getters no
mesmo instante.)* **Varredura da classe:** percorri as notas de seis superfícies à procura de
contadores a zero contraditórios com arrays irmãos — **nenhum outro**. Era instância única.

### 4, 5, 6 — Guia, `extend`, e as armadilhas ditas onde se encontram

- **Ordem no guia invertida.** «After reading this guide, run `setup_sbd_toe_agent`» vinha
  ANTES da ressalva de que é um prompt MCP que muitos clientes não expõem — um agente
  sequencial chamava uma tool inexistente. A ressalva passa a vir primeiro, e a alternativa
  deixa de ser «equivalente» em letra miúda para ser o caminho completo.
- **`operator: "extend"`.** Verificado: `selected[]` é **idêntico** com e sem overlay (27 vs
  27) e as obrigações vêm em lista paralela. A nota descrevia o que NÃO acontece
  («ACRESCEM à selecção»); passa a descrever o real — não entram em `selected`, não têm
  `selection_trace`, não contam para `meta.eligible`, e o cruzamento é trabalho do chamador.
  O `replace` continua a aguardar o ADR 0014.
- **Promessa e excepção no mesmo sítio**: a descrição do threat diz agora, ela própria, que
  em `detail="standard"/"minimal"` os nomes e ids vêm por referência à legenda.
- **Armadilha da paginação**, dita onde o consumidor a encontra (`meta.note` do select):
  a paginação é por ID (alfabética por categoria — ACC primeiro, VAL por último), **não é
  relevância**, e com selecções grandes as últimas categorias ficam nas páginas finais.

### Verificação

- **Suite** 790/790 (54 ficheiros) · **Aceitação** 162 → **122 PASS · 17 PART · 0 FAIL**,
  gate **PASS** (novos TC-F-54/55).
- **A invariante entre superfícies da beta.28 continua verde** (10/10 nas duas suites).
- **Ouro byte-idêntico ao da beta.28** nos dois braços: `discover` **10 PASS / 0 / 0**,
  declarativo **6 PASS / 4 PART / 0 FAIL**. **A selecção não se mexeu** — esta vaga é de
  navegação.
- **Orçamentos** 8/8 do `prepare` inalterados.
- **Gate**: stdout só JSON-RPC · exit 0 · `package_version` = `sbd://toe/version` =
  `provenance.server`.
- **Dois cenários meus tiveram de ser corrigidos** e a razão é declarável: o TC-F-53 media
  uma percentagem fixa de poupança da dedup, que media a REPETIÇÃO da página 1 — e a página 1
  deixou de ser repetitiva justamente por causa desta vaga; passa a verificar que poupa e que
  as referências resolvem todas (sem perda). O TC-F-55 acusava a nota do `extend` por ela
  CITAR a frase antiga ao explicar o que substituiu — o mesmo tropeço do obituário do
  minLevel na beta.25.

## 0.20.0-beta.28 — 2026-09-06

**Invariantes ENTRE SUPERFÍCIES: a classe, não a instância.** Autorizado pelo lead
(«avança com o beta.28», 2026-09-06); §20 da design note. Bundle pin INALTERADO (release KG
`v1.11.0`); **linha estável intocada**.

> A classe: «uma superfície honra um contrato que outra não honra, e a divergência nunca é
> auto-declarada.» A disciplina já existia aplicada às TABELAS do guia (blocos gerados +
> suite de igualdade). Esta vaga estende-a às **RESPOSTAS**, e da igualdade-com-a-fonte para
> a **NÃO-CONTRADIÇÃO entre superfícies**.

### 1 — A suite primeiro, e o INVENTÁRIO que ela produziu

`surface-contract-invariant.test.ts` — as três asserções, escrita e corrida **antes** de
corrigir seja o que for. As mensagens de falha SÃO o inventário.

**Primeira corrida: 5 candidatos. Três reais, dois falsos positivos da própria suite.**

| # | instância | veredicto |
|---|---|---|
| 1 | `consult_security_requirements` × `exposure` — aceite, inerte, mudo | **REAL** (o P0) |
| 2 | `consult_security_requirements` × `data_sensitivity` — idem | **REAL** |
| 3 | `map_sbd_toe_applicability` × `technologies` | **falso positivo meu** — a tool honra-o (banda `conditional`); a minha assinatura truncava a 4.000 chars e não via a diferença |
| 4 | guia: `get_threat_landscape` — bloco `cross-surface` diz «24 de 24», bloco `concerns` diz «SUBCONJUNTO» | **REAL** |
| 5 | guia: `select_sbd_toe_requirements` — mesma acusação | **falso positivo meu** — a caixa fala do mapa de ameaças e só *menciona* o select; o detector não atribuía a afirmação à tool certa |

Corrigi o detector **antes** de confiar nele — um inventário com falsos positivos é pior do
que não o ter. Segunda corrida: **3 instâncias reais, todas corrigidas nesta vaga. Zero
dívida visível.** As outras duas asserções (concordância vocabulário/select/consult e
efeito-ou-declaração de `technologies`/`changed_files`) passaram à primeira — a beta.27
tinha fechado essa parte.

### 2 — As correcções

**`ignored_activators` no `consult` (P0).** Aceitava `exposure` e `data_sensitivity` e
deitava-os fora, com a limitação declarada só no schema, em letra miúda. Reproduzido, com os
números exactos do avaliador: mesmo input, `select` = **72** requisitos
(ACC/AUT/ENC/ERR/FIL/LOG/PRI/SES/VAL), `consult` = **13** (FIL/PRI) — **59 perdidos,
incluindo controlo de acesso**, num plano para aplicação autenticada com dados regulados.

O `consult` é uma superfície de CATÁLOGO e estes são activadores de SELECÇÃO — a correcção
não é fingir que os honra, é **dizer que não os honra**: `ignored_activators` com os valores,
os concerns que activariam noutra superfície, **quantos requisitos estão em causa** (59 — o
número é derivado do mesmo vocabulário e bate exactamente com a diferença real, verificado no
cenário) e quem os honra. Mais uma entrada própria no `rule_trace`
(`ACTIVATORS_NOT_HONOURED`).

**Guia: a caixa de aviso passou a ser DERIVADA.** Era texto fixo dentro de um bloco gerado,
escrito na beta.24 quando o mapa resolvia 13 de 24, e continuou a dizer «SUBCONJUNTO» depois
de a beta.27 o ter posto a resolver os 24 — enquanto o bloco `cross-surface`, derivado, dizia
«24 de 24». Agora lê a cobertura real e diz o que ela for.

**`get_threat_landscape`: base de routing declarada.** `files`/`privacy` devolviam dezenas
de ameaças de capítulos sem relação com o concern (06/07/08/12 para manipulação de ficheiros)
porque o routing passa pelos capítulos onde os CONTROLOS se definem. As ameaças eram reais; a
relevância era nominal, e nada o dizia. Passa a vir `routing_basis`:
`domain_chapter` (o concern tem capítulo de ameaças próprio) ou **`activated_controls`** com
a explicação de que não são «as ameaças deste domínio». Mais `routing_note` quando o concern
TEM domínio próprio e ele não contribuiu com uma única ameaça.

> Duas versões desta verificação foram descartadas por darem falsos alarmes — a primeira
> usava categoria→capítulo (dava o cap. 02, o do catálogo, e fazia as meta-ameaças de
> processo passarem por «ameaças do domínio»); a segunda olhava só para a página. A regra
> final usa o mapa de domínio do próprio roteamento, sobre o conjunto completo, com o cap. 02
> nunca a contar como prova de domínio.

**Deduplicação, como NÍVEL de serialização.** Os `associated_control_*` vinham repetidos
verbatim: **241 entradas para 13 nomes distintos**. Renomear campos publicados
(`associated_control_ids`, contrato v1.14 §1.21) por omissão seria a mesma classe de dano que
esta vaga combate — por isso segue o precedente da beta.26: `detail: "full"` (default)
byte-idêntico, `standard`/`minimal` com legenda + referências.

| concern | `full` | `minimal` |
|---|---|---|
| `files` | 12.039 tk | **5.922 (−51%)** |
| `privacy` | 11.617 tk | **5.538 (−52%)** |
| `auth` | 12.611 tk | **6.323 (−50%)** |
| `iac` | 5.713 tk | 4.866 (−15%) |

### 3 — «Onde mais vive esta classe?», com a varredura feita

Varri os cinco payloads principais à procura de strings repetidas ≥5×:

| superfície | desperdício por repetição | destino |
|---|---|---|
| `get_threat_landscape` | 5.451 tk (`associated_control_ids` ×36) | **corrigido nesta vaga** — era a instância ao lado, no mesmo payload, e a varredura apanhou-a |
| `get_sbd_toe_verification_matrix` | **9.074 tk** (caminhos do manual ×90) | **reportado — maior desperdício absoluto, prioridade 1 para a próxima vaga** |
| `select_sbd_toe_requirements` | 2.100 tk (razões do `narrowed_out` ×12) | **reportado — prioridade 2**; a dieta da beta.26 cobre o `selection_trace`, não o `narrowed_out` |
| `consult_security_requirements` · `get_guide_by_role` | 0 · 163 tk | limpos |

### Verificação

- **Suite** 790/790 (54 ficheiros) · **Aceitação** 160 → **120 PASS · 17 PART · 0 FAIL**,
  gate **PASS** (novos TC-F-52/53).
- **Ouro byte-idêntico ao da beta.27** nos dois braços: `discover` **10 PASS / 0 / 0**,
  declarativo **6 PASS / 4 PART / 0 FAIL**. O `consult` não mudou de conjunto — a correcção
  DECLARA, não altera a selecção.
- **Orçamentos** 8/8 do `prepare` inalterados. O `full` do threat sobe ~95 tk
  (`routing_basis`) — o custo de dizer a verdade — e o `minimal` desce metade.
- **Gate**: stdout só JSON-RPC · exit 0 · `package_version` = `sbd://toe/version` =
  `provenance.server`.

## 0.20.0-beta.27 — 2026-09-06

**Adenda ao beta.26** (assessment da beta.25). O âmbito original do beta.26 foi entregue
por inteiro — os 8 itens, incluindo o dos `evidence_patterns` — por isso **não houve nada a
empurrar**. Bundle pin INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

### A — P0: o `consult` perdia 11 dos 24 concerns, em silêncio, e AFIRMAVA a ausência

Reproduzido: os 13 legados resolviam; os 11 mais recentes davam `requirementCount: 0` e
`active_categories: []` — `privacy`@L2 dava **0** enquanto o vocabulário publicava **5** e o
`select` devolvia **5**. Pior que o caso do mapa de ameaças pelas três razões apontadas: sem
`unsupported_concerns`; com o `rule_trace` a **AFIRMAR** `«REQUIREMENT_APPLIES_BY_RISK(L2):
0 requirements active»` (asserção falsa, não silêncio — e L2 tem 247); e com o guia a
encaminhar esse vazio para «manual-grounded», o selo epistémico mais forte do servidor.

**Causa, à terceira aparição do mesmo conjunto de 11:** o `consult` resolvia concerns por
`concernsMap` **cru** enquanto o vocabulário publicado e o `select` resolvem por
`concernsMap ∪ suplemento`. Os 11 vivem só no suplemento. Verificado antes de mexer: os 13
legados são **byte-idênticos** nos dois mapas, logo a correcção não podia mexer-lhes.

Corrigido **à raiz** (a mesma resolução publicada), mais o mecanismo para o que vier:
`unsupported_concerns` + `supported_values` + nota que proíbe a conclusão, e um `rule_trace`
que diz a verdade (`247 requirements active`, depois `CONCERNS_FILTER_REQUIREMENTS: 247 → 5
(categories: PRI)`, e `CONCERNS_UNRESOLVED` quando é o caso).

> **Efeito não previsto, e o melhor argumento para a nota de método:** o mapa de ameaças
> roteia ATRAVÉS do consult. Corrigir a raiz tornou **os 24 concerns roteáveis por ameaças**
> — os 11 «não suportados» da beta.23 deixaram de existir. Uma causa alimentava três
> superfícies; o `unsupported_concerns` do mapa de ameaças fica como mecanismo dormente,
> pronto para o dia em que o bundle mude, que é o que se quer de uma guarda.

### B — o guia manda CONTRAPROVAR

A linha entrou na fonte do gerador. Um vazio **sem** `unsupported_concerns` deixa de poder
ser comunicado: contraprova-se contra `select_sbd_toe_requirements` ou contra
`sbd://toe/activation-vocabulary` antes de dizer o que quer que seja — «**uma discordância
entre superfícies é sinal, não ruído**» — e nunca se apresenta o vazio como
«manual-grounded». Acompanha um **bloco derivado novo** (`cross-surface`) que publica, por
superfície, quantos concerns cada uma resolve e o que devolve.

### C — INVARIANTE ENTRE SUPERFÍCIES (a peça de fundo)

`cross-surface-invariant.test.ts`: 24 concerns × 3 níveis, cinco propriedades — contagens,
**conjuntos de ids**, categorias, ausência de vazios mudos, e declaração de valores fora do
vocabulário. **Apanhou quatro defeitos à primeira execução, dois deles introduzidos nesta
própria vaga:**

1. **`agents`: o vocabulário prometia MENOS do que o servidor entrega** — 4 a L3 contra 19
   do `select`. Não era defeito do motor: eram **regras nomeadas publicadas**
   (`R1:principal-nao-humano` e a vaga agêntica) que o vocabulário não declarava. Passa a
   publicá-las em `also_activates_by_named_rule` (ids e contagens por nível). A beta.23 só
   verificava «prometido ⊆ em banda», nunca o inverso — por isso nunca o viu.
2. **`consult`: vazio por NÍVEL era mudo** (`privacy`@L1, `threat_modeling`@L1 — o concern
   resolve, o nível não tem nada dessas categorias). O `select` já o declarava desde a
   beta.22; o `consult` não. Ganha `empty_at_level`, com os níveis onde existem.
3. **mapa de ameaças: o mesmo vazio por nível**, também mudo → mesma declaração.
4. **mapa de ameaças: valores FORA do vocabulário ignorados em silêncio** (o `select`
   declara-os desde a beta.22) → passam a `unsupported_concerns`.

**E apanhou dois defeitos meus, desta vaga, antes de saírem da lane:**

- ao declarar os valores desconhecidos usei `threatConcernSupport()`, que devolve listas
  vazias enquanto está a sondar (guarda de recursão): a cache **envenenava-se a si própria**
  e classificava TODOS os concerns como desconhecidos — resultado dependente da ordem da
  primeira chamada, com `logging`/`iac`/`auth` a caírem para zero. A fonte certa é o
  vocabulário, que não recorre;
- o retorno `needs_input` do mapa de ameaças largava a banda `next` de topo, que o RF-H
  exige em **todas** as respostas — um pedido de declaração também é uma resposta.

O enunciado da invariante teve de ser afinado duas vezes até ficar exacto (como em beta.23):
a lei é **`select == requirements_at + named_rule`** e **`consult == requirements_at`**, e um
vazio conta como declarado se trouxer `unsupported_concerns` **ou** `empty_at_level`.

### Verificação

- **Suite** 785/785 (53 ficheiros) · **Aceitação** 158 → **118 PASS · 17 PART · 0 FAIL**,
  gate **PASS** (novos TC-F-50/51; o TC-F-51 verifica os **72 pares** concern×nível).
- **Ouro byte-idêntico ao da beta.26 nos dois braços**, incluindo o braço `consult`:
  `discover` **10 PASS / 0 / 0**, declarativo **6 PASS / 4 PART / 0 FAIL**. Os casos-ouro
  declaram concerns dos 13 legados, que a correcção não toca.
- **Orçamentos** 8/8 do `prepare` inalterados. O `consult` passa a **custar** onde antes
  devolvia zero (privacy 1.372 tk, build 2.111, deployment 3.965, supply_chain 4.570) — é o
  preço de responder em vez de mentir; os 13 legados ficam iguais (auth 2.022 tk).
- **Gate**: stdout só JSON-RPC · exit 0 · `package_version` = `sbd://toe/version` =
  `provenance.server`.
- **Cenários actualizados, com a razão declarada:** TC-F-40/43/48 assumiam `build`/
  `integration`/`privacy` como não-roteáveis por ameaças. Deixaram de o ser — a fixture
  mudou **para melhor**. Passam a exercer o mesmo mecanismo com valores que o vocabulário
  não conhece, que é o que a guarda tem de proteger.

## 0.20.0-beta.26 — 2026-09-06

**Economia e auditoria** — tudo o que restava da lista do avaliador, numa vaga. Autorizado
pelo lead («junta o que resta», 2026-09-06); itens em §17/§18 da design note. Bundle pin
INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

> As três propriedades estruturais (motor honra o vocabulário · fidelidade por invariante ·
> documentação derivada) estão fechadas e guardadas. **Nenhum item desta vaga lhes toca —
> e a selecção não se mexeu: o ouro é byte-idêntico ao da beta.25 nos dois braços.**

### 1 — `evidence_patterns` por PERTENÇA ao âmbito (o de maior retorno)

A causa não era o cap: era a ordenação. Um EP ligado a um **CONTROLO directo** pontuava
`1.0` e um ligado a um **REQUISITO do âmbito activado** apenas `0.7` — a pertença ao
controlo ganhava à pertença ao requisito, e o id desempatava o resto. As duas sondas do
avaliador, reproduzidas:

| sonda | antes | depois |
|---|---|---|
| A — `concerns:["validation"]` (âmbito ERR/VAL), cap 5 | **5 em 5 FORA do âmbito**: EP-API-002, EP-API-003, EP-API-007, EP-AUT-010, EP-CFG-005 — nem um EP-VAL/ERR | **5 em 5 DENTRO**: EP-ERR-001…005 |
| B — `concerns:["auth"]` (âmbito ACC/AUT/SES) | todos dentro, **por sorte alfabética** (`ACC < API < AUT < CFG < ERR < VAL`) | todos dentro, **por pertença** — a sorte deixou de ser necessária |

A ordem é agora: requisito do âmbito → controlo directo → controlo derivado, e o id só
desempata **dentro** do mesmo escalão. É comparação de pertença, não modelo de relevância —
e é por isso que virou invariante testável (monotonia: nenhum EP de fora antes de um de
dentro, em `minimal`/`standard`/`full`).

**A promessa falsa foi corrigida com ela:** a descrição dizia «ranked by relevance to the
activated scope». Passa a declarar a ordenação real **e** a avisar que, dentro de um
escalão, o id **não é ranking**. E o menor do mesmo achado: `debug.notes` contava o cap
clássico (`returned=25`) quando o nível dietado devolvia 5 — passa a contar o efectivo,
nomeando o cap do `detail`.

**O que esta vaga NÃO resolveu, e porquê:** em «exigir reautenticação», `EP-AUT-009`
continua fora do `minimal`. Verificado: **é** tier-1 (o requisito AUT-009 está no âmbito),
mas é o 18.º de **25 EPs igualmente no âmbito**, e o cap de 5 corta. Promovê-lo exigiria
ranking pelo TEXTO da tarefa — exactamente o que a beta.21 matou e o contrato v1.18 proíbe.
Fica declarado em vez de resolvido com um modelo de relevância pela porta das traseiras.

### 2 — `get_threat_landscape`: parar em vez de cobrar

Quando **todos** os concerns declarados são não-roteáveis, o roteamento caía no âmbito
largo e devolvia ~25 ameaças de governação — **8,3k tokens, zero úteis** — para acabar a
dizer que não sabia. Agora responde `needs_input` a **434 tk (−95%)**, com a lista do que
resolve e o encaminhamento para `select_sbd_toe_requirements` (onde os requisitos existem).

A **cobertura está declarada na DESCRIÇÃO da tool**, gerada da mesma fonte derivada
(13 de 24 concerns, nomeados) — não volta a ser folclore. E as ameaças declaram a sua
**ordem**: por `mitigation_confidence` e depois `chapter_id`, com aviso explícito de que
**não é ranking de relevância** e a paginação segue essa ordem.

> A garantia da beta.23 mantém-se **literal**: o payload de `needs_input` traz também
> `unsupported_concerns`. Quem aprendeu a lê-lo continua a lê-lo — uma promessa cumprida
> não se retira por se ter arranjado melhor. (Foram os dois cenários TC-F-40/43 que o
> apanharam quando o `needs_input` a substituiu em vez de a acompanhar.)

### 3 — Traço multi-activador

`concerns:["iac"]` + `technologies:["containers"]` activavam ambos o cap. 08 e o traço
registava só o primeiro. Cada capítulo passa a trazer **`activated_by[]` com todos** os
pares origem+gatilho (`source`/`trigger` mantêm-se, com o primeiro, para compatibilidade).
Testado como propriedade sobre **todos** os pares tecnologia×concern que partilham capítulo.

### 4 — Dieta do `select`

Medido nesta linha: numa selecção de 115 requisitos o `selection_trace` era **6.077 tk de
13.429 (45%)** e continha **12 entradas distintas para 115** — a mesma justificação
verbatim ×13. `detail` (`full` default e byte-idêntico · `standard` · `minimal`) move as
justificações distintas para `selection_trace_legend` e deixa cada item a referi-las:

| caso | full | standard | minimal |
|---|---|---|---|
| 115 req (6 concerns, L3) | 13.503 tk | 8.076 (**−40%**) | 7.015 (**−48%**) |
| baseline L3 (121 req) | 12.157 tk | 6.066 (**−50%**) | 5.108 (**−58%**) |
| auth L2 (27 req) | 5.497 tk | 4.322 (−21%) | 4.140 (−25%) |

**Dieta de serialização, nunca de conteúdo** — e isso é invariante, não promessa: a suite
reconstrói o `selection_trace` clássico a partir da legenda e verifica-o **byte a byte**,
e confirma que `full` continua idêntico ao comportamento anterior.

### 5 — Denominadores nomeados e definidos

`meta.eligible` valeu 121 e 187 na mesma sessão e 273 só aparecia em prosa. Agora cada um
tem nome, valor e definição no payload — e `meta.eligible_denominator` diz qual é:

| denominador | L2 (auth) | o que é |
|---|---|---|
| `baseline_at_level` | 114 | requisitos BASE do cap. 02 ao nível — o piso |
| `activated_at_level` | 114 | baseline ∪ capítulos activados ∪ categorias prometidas — **é o `meta.eligible`** |
| `catalogue_at_level` | 247 | tudo o que se aplica ao nível, activado ou não |
| `catalogue_total` | 273 | catálogo inteiro; **não é denominador de nada aqui** — vem nomeado para não voltar a aparecer só em prosa |

As desigualdades (`baseline ≤ activado ≤ catálogo do nível ≤ total`) e a identidade
`meta.eligible == activated_at_level` são propriedade testada. Custo: 259 tk.

### 6, 7, 8 — Overlay, cobertura parcial, cap. 01

- **`obligation_ids`** por área no `map_sbd_toe_regulatory_activation` (antes só
  `obligation_count`, e o consumidor tinha de ir ao `resolve_entities` adivinhar quais). E
  `example_citation_note` diz o que a citação **é**: `"30"` é o **artigo do diploma**, não
  um id do manual nem uma contagem.
- **P1-3**: `coverage_gaps` passa a declarar a **ausência PARCIAL de campo** —
  `evidence_patterns_without_validation_method` apanha exactamente EP-ENC-001/003/006/007:
  a linha existe, o método que a torna verificável não, e antes o payload dizia **0
  lacunas**. Meia cobertura declarada como total era a falha.
- **P1-4**: com `n=0` a nota deixa de declarar lacuna e encaminhamento que não existem.
- **cap. 01** (achado da beta.24): **não ganha activador**. Dar-lhe um mudaria a selecção
  de todas as chamadas, e nenhum item desta vaga pode mexer na selecção. Fica **explicado**:
  as suas categorias (`CLA` — e as irmãs `GOV`/`TRN`) não pertencem a nenhum concern porque
  o vocabulário activa por **superfície de engenharia**, e a classificação de risco é o
  procedimento que PRODUZ o `risk_level` que todas as outras respostas já usam. Não é
  lacuna nem «não aplicável» — e a banda dá a porta que existe
  (`map_sbd_toe_applicability` / `get_sbd_toe_chapter_brief`).

### Verificação

- **Suite** 780/780 (52 ficheiros), com `beta26-invariants.test.ts` (6 propriedades: EP por
  pertença, traço multi-activador ×2, denominadores, reconstrução da dieta, `full` intacto).
- **Aceitação** 156 → **116 PASS · 17 PART · 0 FAIL**, gate **PASS** (novos TC-F-47/48/49).
- **Ouro byte-idêntico ao da beta.25** nos dois braços: `discover` **10 PASS / 0 / 0**,
  declarativo **6 PASS / 4 PART / 0 FAIL**. A selecção não se mexeu.
- **Orçamentos**: 8/8 gates hard do `prepare` (fixture1 18.741/20.400 · 6.094/6.500 ·
  5.459/5.800 · 3.658/3.870; fixture2 25.161/26.700 · 9.087/9.200 · 8.372/8.450 ·
  4.802/4.840) — ligeiramente ABAIXO da beta.25, pelo conteúdo dos EPs reordenados.
- **Gate**: stdout só JSON-RPC · exit 0 · `package_version` = `sbd://toe/version` =
  `provenance.server`.

## 0.20.0-beta.25 — 2026-09-06

**Adenda ao beta.24: a teoria do minLevel, e o resto do que o guia dizia a mais.**
Autorizado pelo lead (adenda ao ciclo beta.24, 2026-09-06). Bundle pin INALTERADO (release
KG `v1.11.0`); **linha estável intocada**. Vaga própria porque a beta.24 já estava
publicada e a tag é imutável — a história é append-only.

### A teoria do minLevel, morta explicitamente

O relatório integral do avaliador apontava a coluna **«Min level»** (06→L2, 11→L2, 13→L3) e
o **«L2 unlocks + chapters 06, 11»** — retiradas na 0.14.0 e contraditas pelas próprias
tools (`list_sbd_toe_chapters`: *«the binary minLevel theory is retired»*;
`map_sbd_toe_applicability`: *«nothing is excluded by level»*).

**Verificado antes de agir:** essas duas afirmações concretas já tinham desaparecido na
beta.24, quando as tabelas escritas à mão passaram a geradas — o avaliador leu a beta.23.
**Mas a teoria sobreviveu, e num sítio pior: num bloco gerado pela própria beta.24.** A
coluna **«Presente desde»** calculava o primeiro nível com aplicabilidade e reintroduzia o
modelo *pela forma* — dizia ao leitor que a presença de um capítulo «começa» algures.
Renderizava `L1` nos 15, portanto era vácua **e** enganosa.

A coluna foi eliminada e os dois blocos gerados (`chapters`, `risk-levels`) passam a abrir
com a mesma frase explícita: nenhum capítulo se exclui por nível, todos os 15 estão
presentes em L1/L2/L3, o que escala é a exigência, **não existe «unlock»**, e **nenhuma
coluna deste guia volta a dizer quando um capítulo começa, porque nenhum começa**.

### A varredura do guia inteiro — o que mais contradizia o comportamento actual

| # | Afirmação do guia | Comportamento real |
|---|---|---|
| 1 | «returns **TWO bands**, both always listed» (e mais duas ocorrências: «two bands, above», «the same **two-band** summary») | **Quatro** bandas: `selected[]`, `narrowed_out[]`, `excluded_by_level[]` (0.15.0) e `out_of_scope_chapters` (beta.24) |
| 2 | «An L1 risk level **reduces the SCOPE** of required security controls» | Reduz a **EXIGÊNCIA**; o âmbito não muda («nothing is excluded by level») |
| 3 | «baseline ∪ chapters, **narrowed by declared task signals**» | O texto da tarefa **nunca** é activador no modo declarativo |
| 4 | «o grupo SES volta **quando a task menciona** sessão/login/token» | Volta quando **declaras** `technologies=["jwt"]` |
| 5 | «ACTIVADORES ESTRUTURADOS primeiro — **`task`** + exposure + … ; medição da ronda 5: 63 vs 7 da task sozinha; **a task refina**» | Doutrina pré-declarativa inteira: `task` listado como activador, e a promessa de que refina |
| 6 | `params: risk_level, **task?**, …` | `task_context?` (registado, inerte) e `mode?` (declarative\|baseline\|discover), ausente da lista |
| 7 | «Output size: L1 ≈ **22k**, L2 ≈ **36k**, L3 ≈ **36k** chars» | **32k / 47k / 51k** medidos — 30 a 45% de erro numa afirmação que o agente usa para decidir se cabe no contexto |
| 8 | «Every tool response carries the compact stamp `provenance.kg`» | Também `provenance.server` desde a beta.23 (`kg` é o conhecimento servido, `server` é quem serviu) |
| 9 | «activadores estruturados (`exposure`, `data_sensitivity`, **`stack`**, `changed_files`)» | Sem `concerns` nem `technologies`, e a promover `stack`, que o v1.18 explicitamente demove |
| 10 | `search_sbd_toe_manual` apresentado como par das superfícies de requisitos | A **própria tool** declara-se **NÃO-NORMATIVA**: «nunca caminho para um conjunto de requisitos» — o guia omitia-o e o routing mandava-lhe «What is X?» sem marca |

Os **tamanhos passaram a bloco GERADO** (`output-sizes`), medidos nesta build sobre
`consult_security_requirements` (~23 ms uma vez por processo): números medidos em vez de
recordados. As restantes são prosa autoral corrigida — a doutrina do #5 foi reescrita para
o que a linha faz hoje, com o porquê medido (a mesma feature em cinco redacções dava de 0 a
58 requisitos quando a prosa decidia).

### A guarda cresceu (e apanhou três instâncias vivas)

`agent-guide-derived.test.ts` passa de 6 para 10 propriedades: a teoria do minLevel não
volta (padrões proibidos, com a frase que a **enterra** excluída da varredura — nomear a
teoria para a matar não pode contar como publicá-la); o guia não descreve menos bandas do
que a resposta traz; os tamanhos anunciados batem com uma medição fresca; o guia não promete
inferência a partir do texto; e repete as declarações que as tools fazem sobre si próprias.

Ao correr pela primeira vez, a guarda apanhou **três** instâncias que a varredura manual
tinha deixado passar: duas de linguagem de «unlock»/«só se aplica a partir de» (afinal
dentro do próprio obituário — falso positivo meu, corrigido na guarda) e **uma terceira
ocorrência real de «two bands»** («Task-scoped recommendation with declared narrowing (two
bands, above)») que eu não tinha visto.

Varredura mecânica adicional: **todos os parâmetros que o guia nomeia existem nos schemas
reais** — zero divergências.

### Verificação

- **Suite**: 774/774 (51 ficheiros) · **Aceitação**: 153 → **113 PASS · 17 PART · 0 FAIL**,
  gate **PASS** (novo TC-F-46).
- **Ouro**: byte-idêntico ao da beta.24 — `discover` **10 PASS / 0 / 0**, declarativo
  **6 PASS / 4 PART / 0 FAIL**.
- **Orçamentos**: 8/8 gates hard inalterados. **Gate**: stdout só JSON-RPC · exit 0 ·
  `package_version` = `sbd://toe/version` = `provenance.server`.

## 0.20.0-beta.24 — 2026-09-06

**A última peça manual, e o âmbito da promessa.** Autorizado pelo lead («avança com o
beta.24», 2026-09-06); diagnóstico em §16 da design note. Bundle pin INALTERADO (release
KG `v1.11.0`); **linha estável intocada**.

> beta.21 matou a inferência · beta.22 fechou o silêncio de input · beta.23 garantiu a
> conservação do declarado · **beta.24 tira o guia da mão e dá âmbito à promessa.**

### 1 — O agent-guide passou a ser GERADO

**Origem real dos «13 concerns», confirmada antes de gerar nada:** a tabela que o guia
publicava sob o título *«Valid `concerns` values (ontology-controlled vocabulary)»* é,
carácter a carácter e na mesma ordem alfabética, o **`supported_values` do MAPA DE
AMEAÇAS**. A prova é estrutural, não estatística: o **complemento** dessa lista são
**exactamente os 11 `unsupported_concerns`** que a beta.23 descobriu
(`secrets, build, supply_chain, testing, threat_modeling, monitoring, release,
deployment, integration, files, privacy`). Não era lista desactualizada — era a **lista
errada com o nome errado**. Custo medido pelo avaliador: numa tarefa de webhooks com
dados pessoais, obedecer ao guia custava `integration` e `privacy` — 17 requisitos,
incluindo validação de assinatura e anti-replay.

`src/serving/agent-guide.ts` passa a expandir blocos marcados no asset a partir das
mesmas fontes que o servidor serve. **Derivado agora:** `concerns` (24, com categorias,
domínios, capítulos e contagens por nível), os restantes activadores declaráveis
(`exposure`, `data_sensitivity`, `technologies`, nº de padrões de `changed_files`, com os
valores INERTES nomeados), `roles` (13 canónicos + aliases), `resources` (10), `prompts`
(3), `chapters` (15) e `risk levels`. **Autoral (fica onde está):** o START HERE, o
âmbito, os modos de operação, os padrões de resposta, os standards epistémicos, o guia de
routing, a leitura de output e as convenções de identificadores.

Outros defeitos que a derivação fechou de caminho, todos da mesma família:

- a tabela de recursos **não listava `sbd://toe/activation-vocabulary`** — o recurso que o
  próprio guia manda ler no passo 1;
- a tabela de prompts listava **2 dos 3** (faltava `prepare_grounded_codegen`);
- a tabela de níveis dizia *«L2 → + capítulos 06, 11; L3 → + capítulo 13»*, contradizendo
  a **aplicabilidade graduada** de 0.14.0. O bloco gerado diz a verdade do modelo:
  **15 de 15 capítulos presentes em todos os níveis**, com a exigência a escalar
  (4 → 10 → 11 obrigatórios).

Para isto, a superfície MCP passou a viver num sítio só (`src/serving/server-surface.ts`:
`RESOURCE_CATALOG` + `PROMPT_CATALOG`), de onde `resources/list`, `prompts/list` e o guia
derivam. E a skill gerada (`generate_sbd_toe_skill`) passa a levar o guia **derivado**, não
o template — servir o template ali reintroduziria a lista escrita à mão pela porta das
traseiras.

**Guarda de suite** (`agent-guide-derived.test.ts`, 6 propriedades, família da invariante
next-verbatim): todo o marcador tem gerador e vice-versa; os 24 concerns do vocabulário
estão no guia servido; **os 11 não-roteáveis por ameaças estão lá** (a regressão nominal);
as contagens do guia são as do vocabulário; recursos e prompts batem com a superfície
real; nenhuma tool nomeada no guia é fantasma.

### 2 — A promessa «nunca em silêncio» passa a ter ÂMBITO declarado

`narrowed_out` cobria a baseline do cap. 02. Os capítulos de domínio que nenhuma
declaração activou desapareciam sem uma linha — no teste cego do avaliador, ~65 requisitos;
medido aqui em `concerns:["auth"]`@L2, **133 requisitos em 14 capítulos**. E o cabeçalho
prometia «nunca em silêncio» **sem dizer sobre o quê**.

Banda nova **`out_of_scope_chapters`**: por capítulo, `at_level`, `out_of_scope` e um
`activate_with` **copiável e derivado** do vocabulário (concern → tecnologia → caminho, por
ordem de custo para quem declara). Quando o vocabulário não tem forma de activar o
capítulo, **diz-se**: `01-classificacao-aplicacoes` não tem activador publicado nenhum —
8 requisitos a L2 que nenhuma declaração consegue trazer (achado, reportado).

O cabeçalho da promessa e o `meta.note` passam a **declarar o âmbito**: a promessa vale
para o universo, com `narrowed_out` (elegível que ficou de fora), `excluded_by_level`
(existe noutro nível) e `out_of_scope_chapters` (nada o activou).

**Custo medido — contagens, nunca requisitos por extenso:** 538 tokens no pior caso
(14 capítulos, 11,7% do payload de `select`); 481 tk (6,1%) com dois concerns declarados;
507 tk (7,2%) na baseline explícita. Listá-los por extenso custaria **3.689 tokens** —
6,9× mais. A banda **não existe em `discover`** (o oráculo não se toca) e **não entra no
`prepare`** (os 8 gates de dieta ficam byte-idênticos).

**A invariante de conservação deixou de varrer só a baseline** e apanhou três coisas — duas
delas defeitos da banda nova, antes de sair desta lane:

1. **cap. 02 declarado ausente com a baseline toda em banda** — a banda contava só os
   requisitos domain-specific do capítulo;
2. **`REQ-AGN-001..004` fora de todas as bandas e de toda a declaração** — vivem no cap. 02,
   que estava «presente», e a granularidade «capítulo inteiro» deixava-os cair. Foi o que
   obrigou a reformular a banda de «capítulos ausentes» para **«o que fica fora, por
   capítulo»**, que é a forma que fecha o universo exactamente;
3. **`01-classificacao-aplicacoes` sem activador publicado** (acima).

### 3 — Higiene do `task`

**Resíduos encontrados e corrigidos** (prometiam inferência e contradiziam o contrato
v1.18 no mesmo parágrafo):

- `select_sbd_toe_requirements`, cauda inglesa da descrição: *«domain chapters activated by
  the context (changed_files, technologies, stack, **task**)»* e *«then narrows
  deterministically by **the task's declared signals**»* — o `task` listado como activador
  de capítulos e como motor de narrowing;
- prompt `prepare_grounded_codegen`, argumento `concerns`: *«Otherwise **inferred by the
  activation engine**»*.

Varridos também os usos legítimos, que ficam: `mitigation_confidence: heuristic/inferred`,
`content_type: "inferred"` e os standards epistémicos (vocabulário de proveniência, outro
domínio) e as referências explícitas a `mode="discover"`.

**`task` → `task_context`** no `select`: o nome carregava semântica — um campo chamado
`task` convida o chamador a acreditar que o texto decide. `task_context` é o nome canónico;
**`task` continua aceite como alias** (aditivo, nunca renomeámos nada) e **continua a ser o
MOTOR em `mode="discover"`**. O `prepare` mantém `task` como nome: ali o texto é o assunto
do codegen, não um activador — renomeá-lo mudaria o que a tool é.

### Verificação

- **Suite**: 769/769 (51 ficheiros), com a guarda do guia (6) e a conservação estendida (7).
- **Aceitação**: 152 cenários — 112 PASS · 17 PART · **0 FAIL**, gate **PASS**. Novos
  TC-F-43 (guia derivado), TC-F-44 (âmbito declarado, com a dica de recuperação verificada
  a funcionar), TC-F-45 (higiene do `task`).
- **Ouro**: relatório **byte-idêntico** ao da beta.23 nos dois braços — `discover`
  **10 PASS / 0 / 0** (obrigatório), declarativo **6 PASS / 4 PART / 0 FAIL**. O item 2 não
  mexeu na selecção, como exigido.
- **Orçamentos**: 8/8 gates hard inalterados (fixture1 18.779/20.400 · 6.105/6.500 ·
  5.459/5.800 · 3.658/3.870; fixture2 25.200/26.700 · 9.098/9.200 · 8.372/8.450 ·
  4.802/4.840).
- **Gate**: stdout só JSON-RPC · exit 0 · `package_version` = `sbd://toe/version` =
  `provenance.server`.

## 0.20.0-beta.23 — 2026-09-05

**CONSERVAÇÃO** — *o motor não pode deitar fora o que foi declarado.* Autorizado pelo
lead («avança», 2026-09-05); diagnóstico vinculativo em
`DevelopmentGovernance/docs/mcp-declarative-first-design-note.md` §14. Bundle pin
INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

> A regra da beta.22 era *nada acontece sem traço, nada falta sem aviso*. Esta vaga
> acrescenta a metade que faltava: **nada prometido se perde**.

### A invariante de conservação (o que ela apanhou)

`src/serving/conservation-invariant.test.ts` — 5 propriedades sobre o vocabulário TODO:
24 concerns × 3 níveis, exposure, data_sensitivity, technologies e a tabela de paths.
Para cada valor × nível, tudo o que o vocabulário PROMETE activar tem de aparecer nalguma
banda (`selected` ∪ `narrowed_out` ∪ `excluded_by_level`), a aritmética tem de fechar, e o
`requirements_at` publicado tem de bater com o catálogo.

**Apanhou 12 violações — 4 famílias, não a única que a sonda externa tocou:**

| concern | categorias prometidas | perdido em L1 / L2 / L3 |
|---|---|---|
| `build` | CIC + **DEV** | 4/9 · 8/17 · **9/19** (inclui DEV-003, SAST como gate) |
| `supply_chain` | … + **CIC** | 5/14 · 9/31 · 10/36 |
| `release` | … + **OPS** | 2/8 · 11/20 · 15/26 |
| `deployment` | … + **IAC** | 4/18 · 11/38 · 13/43 |

**E apanhou um erro no enunciado da própria lei.** O despacho pedia
`selected + narrowed_out + excluded_by_level == eligible`. Essa soma **não pode** fechar:
`eligible` conta o que se aplica AO NÍVEL e `excluded_by_level` é precisamente o que NÃO
se aplica — é o livro-razão de fora, não uma parcela de dentro. A lei que fecha, e fecha
exactamente em todas as 72 combinações, é `selected + narrowed_out == eligible`
(ex.: `auth`@L1 = 18+43 = 61 = eligible; `excluded_by_level` = 60, à parte). A invariante
verifica as duas coisas separadamente, e é assim que está escrita.

### P0-1 — o motor cede à promessa publicada

Causa única, confirmada: o vocabulário activa por **CATEGORIA**; `domainEligible` exigia
o **CAPÍTULO** activado. (Verificado que não há segunda causa: os mapas categoria↔concern
do vocabulário e do motor coincidem valor a valor.) Requisitos de uma categoria prometida
cujo capítulo o concern não activa **desapareciam de todas as bandas** — nem seleccionados,
nem narrowed, nem excluídos. Silêncio, que é o que este contrato proíbe.

Decisão do lead: **a promessa publicada é o contrato; o motor é que cede.** Uma categoria
declarada torna os seus requisitos elegíveis ao nível, com capítulo activado ou sem ele,
com traço próprio **`declared_category`** — a inclusão nunca é anónima. Só no caminho
declarativo (em `discover` manda a continuidade histórica do oráculo).

**Efeito medido nos conjuntos — cirúrgico, não inflacionário:**

- **12 das 72** combinações concern×nível mudam; **60 ficam byte-idênticas**;
- em todas as 12, `selected` passa a bater **exactamente** com o `requirements_at`
  publicado: `build`@L3 10→**19** (=10 CIC+9 DEV), `supply_chain`@L3 26→**36**,
  `release`@L3 11→**26**, `deployment`@L3 30→**43**;
- **ouro: zero movimento.** O relatório do Axis H desta vaga é byte-idêntico ao da
  beta.22 nos dois braços (só muda a linha do carimbo) — `discover` **10 PASS / 0 / 0**
  (obrigatório) e declarativo **6 PASS / 4 PART / 0 FAIL**, caso a caso. Nenhum caso-ouro
  declara as 4 famílias afectadas de forma a tocar as 12 combinações.

### P0-2 — `unsupported_concerns`: zero deixa de ser mudo

11 dos 24 concerns (`secrets, build, supply_chain, testing, threat_modeling, monitoring,
release, deployment, integration, files, privacy`) devolviam `total: 0` +
`activeChapters: []`, indistinguível de «não há ameaças». `get_threat_landscape` passa a
declarar `unsupported_concerns` com a lista do que **é** suportado e a proibição explícita
de concluir ausência. A lista de suporte é **derivada** (não escrita à mão): um concern é
suportado quando, declarado sozinho, activa pelo menos um capítulo de ameaças — estável
nos três níveis, calculada uma vez por processo.

O caso que mais importa é o **misto**: `["build","auth"]` devolve 95 ameaças **e** mantém
`build` declarado como não-roteável. Antes, o concern por resolver desaparecia dentro de um
resultado que parecia completo.

**E o agent-guide deixou de mandar afirmar ausência a partir de lista vazia.** A linha que
mandava dizer *«manual-grounded: not applicable in this scope»* para `threats: []` foi
partida em duas: com `unsupported_concerns`, **proibido** afirmar não-aplicabilidade —
cita-se a nota e vai-se a `select_sbd_toe_requirements`; sem ela, só se pode afirmar vazio
*dentro do âmbito efectivamente resolvido* (com `meta.activeChapters` não-vazio a prová-lo).

### P0-3 — a guarda anti-zero cobre `technologies` (varridos os cinco activadores)

Duas metades, ambas corrigidas:

1. **a guarda descartava uma declaração com efeito real**: `technologies:["jwt"]` respondia
   «Nenhum activador DECLARADO» com `declared.technologies:["jwt"]` no mesmo payload —
   contradição interna — porque a regra nomeada SES-008 só era avaliada *depois* da guarda.
   Agora o efeito nomeado é conhecido antes: `technologies:["jwt"]` selecciona SES-008,
   **simétrico com `stack:"jwt"`** (a assimetria era a prova do defeito);
2. **`technologies` era o único activador que a guarda nunca nomeava**. Passa a ser a 4ª
   instância nomeada em `inert_declarations`, e tokens fora do vocabulário saem em
   **`unknown_technologies`** (mesma classe do `unknown_concerns` da beta.22) em vez de
   serem descartados em silêncio.

Varridos os cinco activadores declaráveis: `concerns` (unknown_concerns, beta.22),
`exposure`, `data_sensitivity`, `stack`, `changed_files` (beta.22) e agora `technologies` —
nenhum descarta em silêncio.

### P1 — a proveniência diz QUE SERVIDOR respondeu

A validação externa correu a mesma sonda em duas builds e obteve 33 e 42 requisitos com
`serving_contract` e `kg` idênticos: a resposta não era atribuível. `kg` identifica o
**conhecimento servido**; **`provenance.server`** identifica **quem o serviu**. Estampado
em 20 sítios (todas as ferramentas com proveniência) — e também nos payloads **bloqueados**
do `prepare`, que antes não traziam proveniência nenhuma: um bloqueio também é uma resposta,
e também tem de ser atribuível.

### Notas de verificação

- **Suite**: 761/761 (50 ficheiros), com a invariante de conservação nova (5 propriedades).
- **Aceitação**: 149 cenários — 109 PASS · 17 PART · **0 FAIL**, **gate PASS**. Novos
  TC-F-39 (conservação/P0-1), TC-F-40 (P0-2, incluindo o caso misto), TC-F-41 (P0-3 com o
  controlo de simetria e o token desconhecido), TC-F-42 (P1 em 4 ferramentas).
- **Orçamentos**: os 8 gates hard seguram com o campo novo dentro do payload — fixture1
  `full` 18.779/20.400, `standard` 6.105/6.500, `minimal` 5.459/5.800, `ultrathin`
  3.658/3.870; fixture2 25.200/26.700, 9.098/9.200, 8.372/8.450, 4.802/4.840. Um budget de
  secção foi ajustado **com a medida à frente**: `rest` do `full` 1.350 → 1.360 (medido
  1.356; +6 tokens = o campo `provenance.server`).
- **Snapshots do diet**: `provenance.server` é normalizado para `<pkg>` nos golden bytes —
  fixá-lo faria a suite da dieta partir a cada bump por razão alheia à dieta. O gate de
  orçamento continua a medir o payload REAL, com o campo lá dentro.
- **Achado colateral, corrigido**: `npm run smoke:mcp` estava partido **desde a beta.21**
  (pedia `prepare` só com `task`, que sob o default declarativo responde `needs_input`).
  Não era regressão desta vaga — verificado contra o build de `6a695af`. O smoke passa a
  declarar activadores: é um smoke de transporte e dieta, não do contrato de declaração.

## 0.20.0-beta.22 — 2026-09-05

**«O caminho para 9»** — os 7 itens da validação externa da linha declarativa (avaliador,
05-09; veredicto: *«a correcção arquitectural está feita EM COMPORTAMENTO; 9 é alcançável
sem alteração arquitectural»*). Todos da classe **«declarar o que o motor já sabe»**: zero
arquitectura nova. Autorizado pelo lead («avança», 2026-09-05); disposição em
`DevelopmentGovernance/docs/mcp-declarative-first-design-note.md` §12. Bundle pin
INALTERADO (release KG `v1.11.0`); **linha estável intocada**.

> Regra transversal do ciclo, verificada como propriedade: **nada acontece sem traço,
> nada falta sem aviso.**

### P1-A — a guarda anti-zero passou a indexar-se à ACTIVAÇÃO (era à presença de campos)

A sonda que a expunha: `exposure="local"` + `data_sensitivity="low"` — declarações
**válidas e inertes** — devolvia `selected: []` **sem** `needs_input`. Era o ponto cego do
antigo `empty_selection_warning` noutra roupa. Agora a guarda dispara sobre
`activated_categories == 0 && activated_chapters == 0`, **em qualquer caminho**, e o
`needs_input` **nomeia as declarações inertes** (`inert_declarations`). A decisão passou a
existir num único sítio (o motor): o `prepare` reage ao veredicto em vez de ter regra
própria.

**Testada como INVARIANTE, não como cenário** (`declarative-invariants.test.ts`, 192
combinações declaráveis) — e a invariante apanhou **duas instâncias que a sonda não
alcançava**:

1. **o nível esvazia**: `concerns:["privacy"]` (ou `["threat_modeling"]`) em **L1** activa
   categorias mas nenhum requisito delas se aplica ao nível → agora `needs_input` que
   **explica que o problema é o NÍVEL**, diz em que níveis existem, e traz a banda
   `excluded_by_level` como prova (15 grupos no caso de L1);
2. **caminhos que não casam a tabela**: `changed_files: ["Dockerfile"]` não casa nenhum
   padrão publicado → inércia **nomeada** («nenhum caminho casou a tabela de padrões»),
   que separa «não conheço estes caminhos» de «não há nada a aplicar».

`mode: "baseline"` continua a ser a saída explícita — nunca fallback da invariante.

### Os restantes seis

- **local/low publicados como INERTES** no vocabulário (`activates_concerns: []`,
  `inert: true`, nota): um conjunto que se declara `closed_set: true` não pode omitir
  valores válidos. Os enums passam a sair de `EXPOSURE_VALUES`/`SENSITIVITY_VALUES`.
- **P1-B — `unknown_concerns`**: `concerns:["authz","auth"]` descartava `authz` em
  silêncio. Agora vem `{values, valid_values (24), vocabulary_resource, note}` — mesmo
  padrão do `unknown_filter_fields` (0.15.0); sob declarative-first a gralha custa a
  categoria inteira, logo nunca é silenciosa.
- **P1-C — um vocabulário, um contrato**: o `enum` dos `concerns` é **gerado pelo mesmo
  builder** que produz o recurso, nas três tools. Antes: select **sem enum**, consult
  **13 de 24**, prepare **só na descrição**. Agora **24 nas três** (o
  `get_threat_landscape` foi harmonizado à boleia). O `maxItems: 5` do consult mantém-se e
  passa a estar **declarado como o que é** — tecto de PAYLOAD medido, não limite do
  vocabulário.
- **P1-D — traço do `stack`**: a única leitura de texto que resta (token exacto do conjunto
  fechado) não deixava rasto — 33 requisitos invisíveis ao auditor. Agora emite
  `{source: "stack_token", produced, trigger: "stack", reason: "token exacto de
  technologies encontrado em stack…"}`.
- **P1-E — traço das regras nomeadas por tecnologia**: `technologies:["jwt"]` accionava
  `SES-008-por-tecnologia` sem entrada de traço (SES-008 confundia-se com a via do
  `exposure`). Agora emite `{source: "named_rule", produced: "SES-008", trigger: "jwt"}`.
- **P2-A — fim da etiqueta órfã**: `source: "task_term"` era emitido **com `task` vazio**
  (o `reason` já dizia a verdade: mapeamento concern→slice family). No caminho declarativo
  passa a `concern_slice_mapping`; em `discover` o `task_term` legítimo mantém-se.

### Verificação

Suite **756/756** (49 ficheiros; +`declarative-invariants.test.ts`). `npm run check` ✅.
`eval:acceptance` (`docs/acceptance-runs/2026-09-05-caminho-para-9-v0.20.0-beta.22-*`):
**145 cenários, 122 executados — 105 PASS · 17 PART · 0 FAIL · 23 SKIP; gate E PASS
(16/1/0)**; **25/25 tools**; Eixo G 3/3. Casos-ouro: **discover 10/10** (continuidade) +
declarativo **6 PASS / 4 PART / 0 FAIL** (inalterado face à beta.21 — os 7 itens são de
superfície e silêncios, não de selecção). Cenários novos **TC-F-37** (guarda anti-zero nas
três instâncias + gralha declarada + baseline explícita) e **TC-F-38** (traços
stack_token/named_rule/concern_slice_mapping + enum idêntico nas 3 tools); **TC-F-27**
actualizado (declara a tecnologia: `Dockerfile` não casa a tabela, e a inércia é agora
declarada).

**Orçamentos.** Série histórica (fixtures em `discover`): **byte-idêntica** à beta.20/21 —
f1 18 773 / 6 099 / 5 452 / 3 651; f2 25 193 / **9 092**/9 200 / **8 365**/8 450 /
**4 796**/4 840. Caminho declarativo (fixtures declarativas da beta.21, agora com os traços
novos): f1 19 147 / 6 495 / 5 848 / 3 838 (49 req.); f2 24 776 / 8 077 / 7 351 / 4 657
(66 req.) — **+9/+12 tokens** face à beta.21, o custo do rasto que faltava.

### Fora de âmbito (reportado, não corrigido)

**P2-B** `get_threat_landscape` alarga em vez de estreitar (10/15 capítulos, ~8,4k tk, sem
ordenação por relevância). **P2-C** `changed_files` não prevê quem ainda **não tem código**
(fase de design) — é **decisão de contrato do lead**, não bug; esta vaga só torna a inércia
visível. **P2-D** granularidade de capítulo em `technologies` (`containers` traz 22 reqs de
IaC). **P3** deriva de documentação — em particular a **contradição declarada**: o `prepare`
dizia «preferir `stack`» enquanto o `select` diz «preferir `technologies`»; corrigi apenas o
que o P1-C tocou (a descrição dos `concerns`), **a contradição do `stack` fica registada
para triagem**, com `src/config.ts` como padrão literal na tabela geral e o jargão PT/EN.

## 0.20.0-beta.21 — 2026-09-05

**EXPERIÊNCIA da linha beta — «declarativo primeiro».** Autorizada pelo programme lead
(2026-09-05, «fazemos isso no beta!»); desenho vinculativo em
`DevelopmentGovernance/docs/mcp-declarative-first-design-note.md` §§3/7/8/9. **A linha
estável NÃO muda**; nada aqui se propaga sem números e decisão explícita do lead.
Bundle pin INALTERADO (release KG `v1.11.0`, sha `b7444094…03df`).

> Princípio operacional aplicado a cada decisão: **«o MCP pode NORMALIZAR o que lhe
> disseram; não pode DECIDIR o que quiseram dizer»**.

### Novo — `sbd://toe/activation-vocabulary` (a peça que substitui o motor lexical)

Recurso **derivado** (nunca escrito à mão) das mesmas tabelas e dados que o motor usa:
**24 concerns** (com categorias/capítulos que activam e contagem de requisitos por nível),
**3 exposure**, **3 data_sensitivity**, **9 technologies** (incl. `jwt`, que aciona a regra
nomeada SES-008), **13 padrões de path** de `changed_files`, **13 papéis**, **8 fases**,
baseline por nível, e `not_activators` (`task`, `stack`) declarados como tal. ≈2,9k tokens.
Publicado no catálogo e legível por `read_sbd_toe_resource`. Se o motor mudar, o vocabulário
muda com ele — ou o teste parte (`selection.declarative.test.ts` verifica que a promessa
`auth@L2` bate certo com a selecção real).

### Mudou — `select` e `prepare` respondem ao DECLARADO

- **Selecção = f(risk_level, concerns, exposure, data_sensitivity, changed_files,
  technologies).** O `task` passa a `{text, role: "recorded_context",
  affects_selection: false}` — auditoria, não motor. O `activation_trace` perde
  `task_term`/`alias_expansion`/`compound_term`/`intent_keyword` no caminho declarativo.
- **Sem sinal declarado ⇒ `needs_input`, nunca zero e nunca adivinhado** — e o needs_input
  é uma AULA: vocabulário aplicável, **candidatos derivados do `task` marcados como
  SUGESTÃO A CONFIRMAR** (nunca selecção), exemplo copiável (validado por teste: seguido à
  letra, produz selecção) e a saída explícita `mode="baseline"`. Custo: **894 tokens**.
- **`mode: "baseline"`** devolve a baseline do nível **por pedido explícito** — nunca como
  fallback. **`mode: "discover"`** preserva o motor inferencial completo, marcado
  `exploratory` na resposta (instrumento do oráculo histórico e do estudo de paráfrase).
- **`prepare`**: `selection_mode` (declarativo por defeito) + `technologies` declaradas
  (antes eram ignoradas!); sem declarações devolve `needs_input` com a receita. O gateway
  semântico e o classificador de intenção vivem no bloco lexical — no caminho declarativo
  **não correm**.
- **Gate de decomposição** deixa de disparar sobre famílias DECLARADAS (bloquear quem foi
  preciso contradiz o contrato); continua inteiro em `discover`. O guarda do tamanho é o
  tecto de requisitos por `detail` (0.19.4).
- **`search_sbd_toe_manual`** marcado **NÃO-NORMATIVO** no schema: leitura e orientação,
  nunca caminho para um conjunto de requisitos.
- **`sbd://toe/version`** ganha `serving_contract` (v1.18-beta, `declarative-first`, o que
  mudou, o vocabulário, o modo discover e a nota de migração) — a semântica não muda em
  silêncio.

### Removido do caminho declarativo (perderam OBJECTO; vivos em `discover`)

`basis` fica com valor único **`declared`** (campo mantido por estabilidade de contrato),
`lexical_dominance_warning`, `empty_selection_warning` (a ausência de sinal passou a
`needs_input` — erro de input, não resultado) e a **regra R2** (existia para remendar o
casamento de palavras; sem ele não há precedência a resolver). A regra nomeada **SES-008**
sobrevive com o gatilho do lado certo da fronteira: **tecnologia DECLARADA `jwt`** em vez de
regex sobre a prosa.

### Resposta ao ponto 8 do despacho (verificar ANTES de mexer) — dois achados

1. `changed_files` → **tabela publicada de padrões de path** (`src/**`,
   `.github/workflows/**`, …): legítimo, mantido. `technologies` → **lookup exacto** em
   tabela: legítimo, mantido.
2. **ACHADO (a):** o campo livre `stack` fazia `stackLower.includes(token)` — «texto contém
   X → activa Y» sobre prosa. No declarativo passa a contar **só por token exacto** do
   vocabulário (normalizar o declarado é legítimo); o resto é contexto registado.
3. **ACHADO (b):** o `activate()` do prepare fazia **regex sobre NOMES de ficheiro**
   (`route|controller|handler|endpoint → api`, `auth|session|jwt|login → auth`) — isso é
   inferência, não tabela. Fica em `discover`; no declarativo os `changed_files` activam só
   pela tabela de paths.

### Medição (o produto desta vaga)

**Estabilidade à redacção** — mesma feature, 5 redacções (equivalentes construídos: o
conjunto original da ronda 4 não ficou registado):

| modo | conjuntos distintos | N seleccionados | tokens |
|---|---|---|---|
| `discover` | **5 em 5** | 0 – 58 | 2 502 – 7 114 |
| declarativo (mesma declaração) | **1 em 5** | 44 (constante) | 5 921 – 5 926 |

**Caso do agente** (3 redacções): `discover` **3 conjuntos** (0–47) vs declarativo **1
conjunto** (29). `needs_input`: 894 tk, 4–5 candidatos a confirmar, exemplo executável.

**Oráculo, dois braços lado a lado** (registo
`docs/acceptance-runs/2026-09-05-declarativo-axis-h-selection-v0.20.0-beta.21.{md,json}`):

- **`discover` (10 casos históricos, continuidade da série): 10 PASS / 0 / 0** — sem
  divergência, sem paragem.
- **declarativo (as mesmas 10 situações expressas por declarações): 6 PASS / 4 PART /
  0 FAIL** — as declarações saem do próprio oráculo (concerns anotados + activadores do
  caso + tecnologias que o enunciado nomeia, mapeadas para o vocabulário fechado);
  **expectativas do oráculo INTOCADAS**. Os 4 PART (GC-01 90 %, GC-02 95 %, GC-03 55 %,
  GC-05 79 % de cobertura) são o resultado honesto: as expectativas históricas foram
  construídas contra o motor inferencial, e exprimir a mesma situação por declarações
  exige declarar mais do que o caso anotou — **não foi feito nenhum ajuste ao oráculo**.

**Orçamentos** (fixtures da dieta; a série continua medida em `discover`, byte-idêntica à
beta.20): f1 18 773 / **6 099** / **5 452** / **3 651**; f2 25 193 / **9 092**/9 200 /
**8 365**/8 450 / **4 796**/4 840 — todos dentro dos tectos, sem alteração. O mesmo par de
fixtures no caminho declarativo (declarações equivalentes): f1 19 138/6 495/5 848/3 838
(49 req.), f2 24 764/8 077/7 351/4 657 (66 req.).

### Verificação

Suite **750/750** (48 ficheiros; +`selection.declarative.test.ts` com 11 casos que guardam
o contrato). `npm run check` ✅. `eval:acceptance` (registo
`2026-09-05-declarativo-v0.20.0-beta.21-acceptance.{md,json}`): **143 cenários, 120
executados — 103 PASS · 17 PART · 0 FAIL · 23 SKIP; gate E PASS (16/1/0)**; **25/25 tools**;
Eixo G 3/3. Cenários que perderam objecto tratados com honestidade: **12 marcados
DISCOVER-ONLY** (TC-A-01/02, TC-F-11..15, TC-F-19, TC-F-29, TC-F-31, TC-F-32, TC-F-33 —
continuam a guardar o motor inferencial) e **2 novos** para o contrato declarativo
(**TC-F-35** needs_input→declaração→estabilidade→baseline; **TC-F-36** vocabulário fechado,
derivado e executável).

## 0.20.0-beta.20 — 2026-09-04

**Vaga COMBINADA** (decisão do lead, 04-09): absorbs stable **0.19.3** (`12c5188c`) and
**0.19.4** (`19709b82`) in that order — the two picks were applied sequentially and squashed
into this single release commit. Precondition verified before any pick (`latest = 0.19.4`,
gitHead `19709b82`; publish run 33905492613 ✅). Bundle pin UNCHANGED (release KG `v1.11.0`,
sha `b7444094…03df`).

### Absorbed from 0.19.3 — «next executável verbatim»

Suite invariant (`next-invariant.test.ts`, verbatim from stable) validating every `next`
against the server's REAL `tools/list` schemas; plus the truths: `prepare→resolve` in its
real form, slots by index (note intact on this line), URI-next naming
`read_sbd_toe_resource`, `chapter`/`chapterId` and `risk_level`/`riskLevel` fixed, false
`≤3` ceiling removed, `phase` token, matrix `maxItems` **50 imposed** with the ~190 tk/id
cost warned, `record_type` validated against the enum (the `ctrl_acore_alignment` that came
from a next OF THIS LINE now answers declared, with `valid_record_types` — confirmed dead),
`setup` taught as a PROMPT with the declared alternative, structured activators as the
primary path, CodeQL patterns corrected.

### The invariant run over THIS LINE's own surfaces (dispatch item 1) — and what it caught

`src/serving/next-invariant.beta.test.ts` (new, beta-only) extends the principle to the
executable references the diet emits and the SPARQL tool: it harvests every reference from
`prepare` (4 detail levels + `include_relations` + `debug`), `trace_sbd_toe_graph` (3 lenses
+ empty anchor), `select` and `trace_sbd_toe_requirement_sources`, and validates tool
existence, object-form `with` keys/enums, structured call lists (`relations_ref.lenses[]`
against the trace schema), and the URI rule. **32 references harvested live; 2 real defects
caught, both beta-only text, both fixed in this wave:**

- `provenance_legend.note` (standard/minimal) — served
  `sbd://toe/codegen-instructions/{mode}` **without naming the tool that executes it**; now
  `read_sbd_toe_resource(sbd://…)`.
- `provenance_legend.note` (ultrathin) — same defect in the ultrathin legend; same fix.
- Not a defect (declared): `codegen_instructions_ref.resource` carries the bare URI, but its
  sibling `note` names `read_sbd_toe_resource` — the normative rule is object-level and it
  passes. No `tool` field anywhere carried «…», «?» or a URI (the round-6 class is dead on
  this line); `relations_ref.lenses[]` validate against the real `trace_sbd_toe_graph` enum.

The URI rule is now guarded permanently (second `it()` in the beta invariant): every object
serving a `sbd://` URI must name `read_sbd_toe_resource` in the same object.

### Absorbed from 0.19.4 — «a promessa do minimal»

Per-detail requirement ceilings (minimal **78**, standard **81**, ultrathin **86**; `full`
without ceiling = the oracle's level, Axis H protected by construction), structured
`requirement_ceiling{}` with taught batches («repete SÓ com task + risk_level + concerns do
lote — activadores largos FORA; concerns SOMAM activação, não restringem»), projected cost
in select's `next`, shared `payload-ceilings.ts` + coherence test. Ceiling sentence added to
this line's `detail` description (the beta's fuller text kept, the 0.19.4 truth merged in).

**The 88-req case live on this line:** `minimal` with 88 selected > 78 → `needs_decomposition`
declared, `requirement_ceiling {selected 88, limit 78, projected 9,098 tk > promise 8,450 tk,
3 batches}` in an **886-token** response (instead of ~9.1k); **round-trip of the taught
recipe: 3/3 batches ready within the ceiling** ([auth] 44 reqs, [secrets] 16, [validation]
31); `full` unchanged at 88 reqs, no ceiling.

### Verification (records `docs/acceptance-runs/2026-09-04-v0194-*-v0.20.0-beta.20-*`; sentinel + explicit exits + package_version asserted)

`eval:acceptance`: **141 scenarios, 118 executed — 102 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-33/34 PASS; Axis G 3/3; **25/25 tools**; golden cases **10/10**
(oracle runs at `full`, ceiling-free by construction). Suite **739/739** (46 stable files +
the beta invariant) · `npm run check` ✅. Budgets (fixtures unchanged, 41/69 reqs ≤ 78):
f1 18,773 / **6,099** / **5,452** / **3,651**; f2 25,193 / **9,092**/9,200 / **8,365**/8,450 /
**4,796**/4,840 — all inside the gates, with headroom recovered from the 0.19.3 compact
slots note. Golden snapshots regenerated: 6 lines, all `note` (the two legend texts).

## 0.20.0-beta.19 — 2026-09-04

Absorbs the stable **0.19.2** (squash `99ad5a91` = tag v0.19.2 = npm `latest`;
precondition completed per the beta.17/18 pattern — publish run 33896531612 watched to
success and npm re-verified before any pick). Bundle pin UNCHANGED (release KG
`v1.11.0`, sha `b7444094…03df`).

### Absorption map (→ this line)

1. **«O next nunca sugere o que o destino rejeita»** — the empty-selection `next[0]`
   suggests the **top-3 concerns BY WEIGHT** (prepare rejects >3 families) while the
   warning keeps the full ordered candidate list; the matrix hint declares the **≤50
   cap** when the page exceeds it; remaining sweep conforms (consult ≤5/maxItems,
   teaching ≤3). Live on this line (V2 case): `next[0]` = re-run select with
   `concerns=[auth, integration, validation]`; warning list stays complete (17,
   ordered). TC-F-32 round-trip PASS (suggestion accepted → select re-run 58 selected →
   prepare `ready_for_codegen`; page of 53 with the declared ≤50 cap).
2. **START HERE changes channel** — the select tool description and the setup prompt
   description now OPEN with the start signal (visible in Desktop-like clients);
   instructions keep the ⛳.
3. **Beta-only next sweep (dispatch item 1) — clean:** `trace_sbd_toe_graph` returns
   **no `next[]`** and no quantified-parameter suggestions (envelope: lens/anchor/rows/
   total/page/pageSize/cursor/provenance); `prepare`'s `relations_ref` references
   `{lens, anchor}` without quantifying anything the destination rejects; no beta-only
   affordance needed calibration — declared, nothing changed.
4. TC-F-31 adjusted (≤3 in next) re-run PASS on this line.

### Verification (records `docs/acceptance-runs/2026-09-04-v0192-*-v0.20.0-beta.19-*`; sentinel + package_version gate)

`eval:acceptance`: **139 scenarios, 116 executed — 100 PASS · 16 PART · 0 FAIL · 23
SKIP; gate E PASS (16/1/0)**; TC-F-31/32 PASS; Axis G 3/3; **25/25 tools**; golden cases
**10/10**. Suite **732/732** · `npm run check` ✅. Budgets untouched inside the gates:
f1 18,771 / 6,135 / 5,488 / 3,688; f2 25,192 / **9,128**/9,200 / **8,401**/8,450 /
**4,833**/4,840 (ids 104/152).

## 0.20.0-beta.18 — 2026-09-04

Absorbs the stable **0.19.1** (squash `a80741d2` = tag v0.19.1 = npm `latest`;
precondition initially pending — the publish run 33890216694 was watched to success and
npm re-verified after propagation, per the beta.17 pattern, before any pick). Bundle pin
UNCHANGED (release KG `v1.11.0`, sha `b7444094…03df`).

### Absorption map (→ this line)

1. **`empty_selection_warning` (V2)** — 0 selected with narrowed ≠ 0 is an ALARM:
   candidates DERIVED via the reverse `concernsMap` from the narrowed set; the
   share-warning yields to it; `next[0]` = «re-run with concerns» and **never sends an
   empty list to the matrix**.
2. **Precedence (V4)** — R2 yields **ONLY to the user's `explicit_concern`**;
   `exposure`/`data_sensitivity` keep feeding R2 (the stable's first version treated
   exposure as explicit and the replay-SES revived — their gate sentinel caught it).
   Invariant `selected ∧ narrowed = ∅`; replay-SES guard re-run on this line.
3. **Teaching** — «task descobre; concerns estabilizam» in guide/next; ⛳ START HERE in
   the instructions entry point.
4. **Gate** — the eval artefact's `package_version` is now asserted (lesson GC-02: a
   stale eval must fail loudly), together with the sentinel hard-gate.

### V2 / V4 / replay-guard reproduced live on this line

- **V4** (`task «Mudança de email do utilizador»` + `concerns: ["auth"]`): **SES ×8 in
  selected, 0 in narrowed — no activated∧narrowed contradiction** (declared beats
  lexical narrowing).
- **Replay-guard** (lexical auth wording, no explicit concerns): **SES ×8 narrowed,
  0 selected** — the DualGauge replay case stays dead.
- **V2** (wording selecting 0): `empty_selection_warning` with derived
  `candidate_concerns [auth, logging, validation, api, …]`, share-warning silenced in its
  favour, `next[0]` = re-run select, **no matrix in `next`**. TC-F-31 PASS (V2 alarm
  with 17 candidates; V4 SES ×8; replay dead; V1/V3 both warned).
- **Beta-only surfaces / agentic heuristics** (dispatch check): the `agents` task-term
  heuristics remain non-`explicit_concern` — on an agentic task AGN ×4 select, SES ×8
  narrows (no session signal), no contradiction, no empty alarm: **coherent with the new
  precedence; no divergence, no finding.**

### Verification (records `docs/acceptance-runs/2026-09-04-v0191-*-v0.20.0-beta.18-*`; sentinel + package_version gate)

`eval:acceptance`: **138 scenarios, 115 executed — 99 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-29/30/31 PASS; Axis G 3/3; **25/25 tools**; golden cases
**10/10** (oracle expectations intact). Suite **732/732** (+3 unit from the stable) ·
`npm run check` ✅. Budgets untouched inside the gates: f1 18,771 / 6,135 / 5,488 /
3,688; f2 25,192 / **9,128**/9,200 / **8,401**/8,450 / **4,833**/4,840 (ids 104/152).

## 0.20.0-beta.17 — 2026-09-04

Absorbs the stable **0.19.0** (squash `ab4340d8` = tag v0.19.0 = npm `latest`;
**precondition initially FAILED and was completed**: the v0.19.0 publish run was
in-flight — watched run 33862286138 to success and re-verified `latest = 0.19.0`,
gitHead `ab4340d8`, before absorbing; the half-applied pick was reset in between).
Bundle pin UNCHANGED (release KG `v1.11.0`, sha `b7444094…03df`).

### Absorption map (→ this line)

1. **`basis: declared | lexical`** on every entry/exclusion of select+prepare
   (task_term/alias/compound/intent = lexical; explicit concern/named rule/context
   signal/data = declared); lexical narrowed_out reasons say «SENSÍVEL À REDACÇÃO (não
   é regra de domínio)»; `excluded_by_level` = declared.
2. **`lexical_dominance_warning`** {share, declared threshold 0.5, candidate_concerns}
   + `next` leading with «re-run with explicit concerns»; a stabilised run silences it.
3. **Form-diet in prepare** (only `selection.lexical_share` at dieted levels) — this
   line's ceilings verified: ultrathin f2 stays **4,833**/4,840 (no stop).
4. **`read_sbd_toe_resource` slots by INDEX** with the real derived catalogue
   (the «Slots válidos: .» death) + signposted entry point (TC-F-30 PASS).
5. **Beta-only surfaces**: the task_term matching lives in the shared engine — the beta
   `agents` heuristics (`ai agent`/`kill-switch`/…) flow through it and carry the same
   basis pattern; observed live: AGN entries and the R1 named rule classify as
   `declared` (engine classification, identical to the stable); no beta-only matcher
   exists outside the engine — nothing extra to change.

### Two-wordings case reproduced live on this line

Lean «Upload de ficheiros» → 23 selected, `lexical_share: 1.0`, **warning** with
`candidate_concerns [files, validation, ACO-IVF]`, `next[0]` = re-run select; rich
wording → 50 selected (share 0.78); **stabilised** (explicit `concerns
[files,auth,logging]`) → 51 selected, share **0.29**, **warning silenced**. Narrowed
reason carries «exclusão SENSÍVEL À REDACÇÃO da tarefa (não é regra de domínio)…»
verbatim. TC-F-29 (full paraphrase case, rica 57 vs magra 8) PASS on this line.

### Verification (records `docs/acceptance-runs/2026-09-04-v0190-*-v0.20.0-beta.17-*`; sentinel hard-gate adopted — asserts with explicit exits before any docs/tag)

`eval:acceptance`: **137 scenarios, 114 executed — 98 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-29/30 PASS; Axis G 3/3; **25/25 tools**; golden cases
**10/10** (oracle intact — basis is additive). Suite **729/729** · `npm run check` ✅.
Budgets inside the unchanged gates: f1 18,771 / 6,135 / 5,488 / 3,688; f2 25,192 /
**9,128**/9,200 / **8,401**/8,450 / **4,833**/4,840 (ids 104/152; snapshots diff =
the basis/lexical_share additions, from the cherry-pick).

## 0.20.0-beta.16 — 2026-09-03

Absorbs the stable **0.18.1** (squash `dc5500af` = tag v0.18.1 = npm `latest`, precondition
verified before starting) — the formal batch **v1.11.0** closes on BOTH lines (lead «avança
com o lote», 03-09; KG v1.11.0 cut and verified).

### Served bundle — formal KG release `v1.11.0` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.11.0`, asset sha256
`b7444094f3b4e60e26fd0fd586793445e2b734c6376fb2b327fbd888828d03df` (fetched and
digest-verified by `sync-bundle --from-release`); `mcp-stable` = `688863a` (= tag commit,
verified by `ls-remote`); contract **v1.17**, Manual v1.8.0, ontology v2.4.
**Byte-identical to the dev-build this line already pinned**
(`kg-v1-manual-v1.8.0-aligned-2026-09-03`): the `data/` delta is the `run_manifest`
release stamp only. Pin identical to master. Packaging sanity re-checked: exactly the 2
semantic surfaces in the tarball (`npm pack --dry-run`).

### Stamp transition (rule 0.16.0: releases stamp the tag)

`provenance.kg`: `dev:e5c3581b46aa` → **`"v1.11.0"`** — verified live on this line;
snapshots regenerated by the cherry-pick (diff = stamp). Payloads: f1 18,767 / 6,130 /
5,484 / 3,688; f2 25,186 / **9,123**/9,200 / **8,396**/8,450 / **4,833**/4,840 — no
ceiling touched, no stop.

### Verification (records `docs/acceptance-runs/2026-09-03-v0181-*-v0.20.0-beta.16-*`)

`eval:acceptance`: **135 scenarios, 112 executed — 96 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; **TC-F-28 re-run against the formal pin: PASS** (FIL-002 direct
×3 + DEP-001 compensated; meta 17/254/19); Axis G 3/3; **25/25 tools**; golden cases
**10/10**. Suite **729/729** · `npm run check` ✅ (pin verifier green).

## 0.20.0-beta.15 — 2026-09-03

Absorbs the stable **0.18.0** (squash `b1dbc7e6` = tag v0.18.0 = npm `latest`, verified;
walkthrough station 3, lead cycle 03-09).

### Absorption map (→ this line)

1. **Re-pin** `source: dev-build` **`kg-v1-manual-v1.8.0-aligned-2026-09-03`** (KG master
   `c30c6c2`), snapshot sha256
   `e5c3581b46aac57c90f56a1eac33bce6346ac15838b9809d4d96062eb5d19734` digest-verified
   (`sync-bundle` idempotent); contract **v1.17 §1.24**; stamp **`dev:e5c3581b46aa`**;
   pin identical to master.
2. **Packaging**: `bundle-files.json` + this line's `package.json` `files[]` gain the 2
   served semantic surfaces (`requirement_source_coverage.jsonl`,
   `ctrl_acore_alignment.jsonl`) as **NAMED exceptions** in the banned-paths guard
   (`ALLOWED_DESPITE_PREFIX`; the `semantic/*` wildcard stays banned). The beta
   `package.json` conflict resolution added the two `files[]` entries by hand;
   **`npm pack --dry-run` verified BEFORE the push** (lesson of #71): exactly the 2
   semantic files in the tarball.
3. **New tool `trace_sbd_toe_requirement_sources`** — rows VERBATIM from the published
   surface; direct anchors with provenance vs compensated chains («cobertura, NÃO
   autoria» in the provenance note); 19 no-source requirements + unknown ids DECLARED;
   `include_chains=false` diet; paginated (G1). Live on this line (one call, ≈1,536 tk):
   **FIL-002 → 3 direct anchors (+1 chain); DEP-001 → 0 direct, 1 compensated chain;
   FAKE-123 declared in `unknown_requirement_ids`; meta 273 / 254 compensated /
   17 direct / 19 without any source**. Teaching route absorbed (TC-F-28 PASS).
4. **Beta-only surfaces — opportunity DECLARED, not implemented:** the two new semantic
   layers are row-oriented link surfaces (requirement→source anchor;
   control→AppSec-Core alignment) that the RDF projection could expose as new SPARQL
   lenses (e.g. `source_coverage`, `acore_alignment`). Out of this wave's scope by
   dispatch rule — candidate for its own wave; the current lenses and their five v1
   sources are untouched (Axis G 3/3 re-verified).

### Verification (records `docs/acceptance-runs/2026-09-03-v0180-*-v0.20.0-beta.15-*`)

`eval:acceptance`: **135 scenarios, 112 executed — 96 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-28 PASS on this line; Axis G 3/3; **25/25 tools** (the new
tool counts and is exercised); golden cases **10/10**. Suite **729/729** · `npm run
check` ✅. Budgets inside the unchanged gates: f1 18,769 / 6,133 / 5,486 / 3,691; f2
25,189 / **9,125**/9,200 / **8,398**/8,450 / **4,835**/4,840 (ids 104/152; snapshots
diff = the dev stamp, from the cherry-pick).

## 0.20.0-beta.14 — 2026-09-02

Absorbs the stable **0.17.0** (squash `61183f06` = tag v0.17.0 = npm `latest`, verified;
evaluator round 2, lead «avança» 02-09 — findings 2+3; finding 1 stays out, its own design
pending ratification). Bundle pin UNCHANGED (release KG `v1.10.0`, sha `d8df472b…204e`).

### Absorption map (→ this line)

1. **Never-silent `resolve_entities` filters** — filter keys validated against the REAL
   record shape (union of the records' own keys, 26 record_types; dot-notation = first
   segment; nothing hardcoded); unknown keys → declared WARNING (`unknown_filter_fields`
   + `valid_fields`), never a hard error, never a silent 0. Reproduced live on this line:
   `{"id":{"in":["ACC-001","ACC-003"]}}` → `unknown_filter_fields: ["id"]` + 12
   `valid_fields` (incl. `requirement_id`); the corrected filter returns the 2 records
   (TC-F-26 PASS — «o 0-silencioso do lead morreu»).
2. **Requirement→proof chain** — `get_sbd_toe_verification_matrix` accepts
   `requirement_ids[]` («how do I prove THESE»), requests without an EvidencePattern are
   DECLARED in `unknown_requirement_ids`; the `select` `next[]` now leads with «prove the
   selected requirements» (verified live: select next = matrix → consult → prepare);
   guide carries the route (TC-F-27 PASS: 4-of-4 proved, fake id declared).
3. **Teaching on this line's surfaces** — the select→matrix affordance ships in the
   absorbed `affordances.ts`/`select-requirements.ts`; the beta-only teaching surfaces
   (codegen-instructions line_note, Axis G scenarios) need no change.
4. **Beta-only surfaces audited for the line-wide principle**: `trace_sbd_toe_graph`
   takes `lens`/`anchor`/paging only and `select_sbd_toe_requirements` takes declared
   signals — **no beta-only surface accepts field-filter objects**, so the key-validation
   pattern has nowhere else to apply; invalid enum/missing inputs already answer with
   declared -32602 errors (TC-G-03).

### Verification (records `docs/acceptance-runs/2026-09-02-v0170-*-v0.20.0-beta.14-*`)

`eval:acceptance`: **134 scenarios, 111 executed — 95 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-26/27 PASS on this line; Axis G 3/3; **24/24 tools**; golden
cases **10/10**. Suite **729/729** · `npm run check` ✅. Budgets untouched (prepare
unchanged): f1 18,767 / 6,130 / 5,484 / 3,688; f2 25,186 / 9,123/9,200 / 8,396/8,450 /
4,833/4,840; ids 104/152.

## 0.20.0-beta.13 — 2026-09-02

Absorbs the stable **0.16.1** (squash `04430cbd` = tag v0.16.1 = npm `latest`, verified) —
the formal batch closes on BOTH lines (lead «avança com o lote», 02-09; KG v1.10.0 cut and
verified by the Orchestrator).

### Served bundle — formal KG release `v1.10.0` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.10.0`, asset sha256
`d8df472bebaa1ed0b86d5b9b3b397a6a7d165183ba5e7bd48ee9e39bc896204e` (fetched and
digest-verified by `sync-bundle --from-release`); `mcp-stable` = `a3e44459` (= tag commit,
verified by `ls-remote`); contract **v1.16**, Manual v1.8.0, ontology v2.3. **Byte-identical
to the dev-build this line already pinned** (`kg-v1-manual-v1.8.0-aligned-2026-09-02`):
the `data/` delta is the `run_manifest` release stamp only. Pin identical to master.

### Stamp transition (rule 0.16.0: releases stamp the tag)

`provenance.kg`: `dev:c832fd978169` → **`"v1.10.0"`** — verified live on this line
(consult/select); `sbd://toe/version` keeps the full identity. Golden snapshots
regenerated by the cherry-pick (diff = stamp only). Payloads: f1 18,767 / 6,130 / 5,484 /
3,688; f2 25,186 / **9,123**/9,200 / **8,396**/8,450 / **4,833**/4,840 — the shorter
stamp gives back 1–3 tokens vs beta.12; **no ceiling touched, no stop**.

### Verification (records `docs/acceptance-runs/2026-09-02-v0161-*-v0.20.0-beta.13-*`)

`eval:acceptance`: **132 scenarios, 109 executed — 93 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; Axis G 3/3; **24/24 tools**; golden cases **10/10**. Suite
**729/729** · `npm run check` ✅ (pin verifier green).

## 0.20.0-beta.12 — 2026-09-02

Absorbs the stable **0.16.0** (squash `3e32af19` = tag v0.16.0 = npm `latest`, verified;
Codex «data debt» cycle armed by the lead, verified by the Orchestrator).

### Absorption map (→ this line)

1. **Re-pin** `source: dev-build` **`kg-v1-manual-v1.8.0-aligned-2026-09-02`** (KG master
   `6f73417`), sha256 `c832fd9781695a42f0046ec9b0a56b3982d260c274c52654afe4fe6d0636a107`
   digest-verified by `sync-bundle` (idempotent over the cherry-picked data); contract
   **v1.16 §1.23** (additive); 273/29 + 305 links unchanged; pin identical to master.
2. **Joins served**: `get_guide_by_role` artifacts per assignment (reference case 25/25);
   `get_threat_landscape` `associated_control_names` (95/95 on auth95) +
   `related_antipatterns` with data; `plan_repo_governance` `artefact_totals`
   `{distinct_count: 45, chapter_relation_count: 469, count_semantics}` read from the
   bundle meta — never recounted in code.
3. **Stamp reform**: dev-builds stamp `provenance.kg = dev:<sha12>` — verified live on
   this line: `"dev:c832fd978169"` on consult/select; `sbd://toe/version` keeps the FULL
   identity (tag, Manual v1.8.0 @ `f78dfe73`, contract v1.16) — TC-F-16/17 PASS.
4. **Beta-only surfaces declared**: the RDF projection's sources are the five v1 files
   (relations, requirement_control_links, antipattern links, signal_evidence) —
   **the new v1.16 join fields (`associated_control_names`, threat-mitigation names) are
   NOT projected**; the SPARQL lenses are unchanged (270/270/270, TC-G-01 re-verified).
   The new fields are served by the shared tools; projecting them is a future lens
   decision, not part of this absorption. `trace_sbd_toe_graph` keeps its own provenance
   note (no per-response kg stamp there — pre-existing shape, reported).

### Verification (records `docs/acceptance-runs/2026-09-02-v0160-*-v0.20.0-beta.12-*`)

`eval:acceptance`: **132 scenarios, 109 executed — 93 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-25 + re-baselined TC-F-16/17 PASS on this line; Axis G 3/3;
**24/24 tools**; golden cases **10/10**. Suite **729/729** · `npm run check` ✅.

### Payloads before → after on this line (the short stamp keeps every ceiling intact)

f1: 18,766→**18,769** · 6,130→**6,133** · 5,484→**5,486** · 3,688→**3,691**;
f2: 25,186→**25,189** · 9,122→**9,125**/9,200 · 8,396→**8,398**/8,450 ·
4,833→**4,835**/4,840 (ids 104/152; +2–3 tokens per payload — the `dev:<sha12>` stamp;
the long tag would have crossed rest-f1/ultrathin-f2, the short form does not — no stop,
no new ceiling; golden snapshots regenerated by the cherry-pick, diff = stamp only).

## 0.20.0-beta.11 — 2026-09-02

Absorbs the stable **0.15.1** (squash `a3536fde` = tag v0.15.1 = npm `latest`, verified;
lead «vale a pena então estas alterações», 02-09) — the Desktop-audit reverification
closes on BOTH lines. Bundle pin UNCHANGED (release KG `v1.9.0`).

### Absorption map (items 1–7 → this line)

1. **`tool_prefix` placeholder** — without the parameter, `generate_sbd_toe_skill` emits
   `<MCP_TOOL_PREFIX>` in the `tools:` frontmatter plus a VISIBLE substitution instruction
   (decision c: never a silent install); with the parameter, 0.15.0 behaviour (TC-F-23 ✓).
2. **`next` without the invalid id** — a `found:false` brief suggests the generic
   placeholder, never the id that just failed (TC-F-23 ✓).
3. **Truthful `mode` description on consult** — default = PROJECTIONS (bodies via
   `resolve_entities`; `index` = ids per category), coherent with `projection_note`.
4. **Unknown `orgScope` → actionable `-32602`** with the derived section sample in the
   message (+ `data.valid_section_titles`) (TC-F-21 re-run ✓).
5. **assess complete** — `kpi_values: {}` rejected with sample `metric_ids`;
   `gaps_offset`/`gaps_limit` + `gaps_coverage` (walk **92/92** on this line);
   posture `below` vs `not_assessed`, `at` declared when the assessed part complies
   (TC-F-24 ✓, TC-F-05 re-run ✓).
6. **plan `offset` description corrected** (default = first page of 5).
7. **`concerns` `maxItems` = 5 by measurement** (1/3/5/8 → 2.0/3.6/4.3/6.6k tk — payload
   rules, not count); the teaching keeps «≤3; compostas → select»; the server never cut
   silently (verified on the stable, schema absorbed here).

Beta-only surfaces audited for the old patterns (mode/orgScope/next): the selection
engine, `select`, `trace_sbd_toe_graph` and the RDF projection carry none of them —
nothing to change beyond the absorption.

### Verification (records `docs/acceptance-runs/2026-09-02-v0151-*-v0.20.0-beta.11-*`)

`eval:acceptance`: **131 scenarios, 108 executed — 92 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; TC-F-23/24 + re-baselined TC-F-05/21 PASS on this line; Axis G
3/3; **24/24 tools**; golden cases **10/10**. Suite **729/729** (+2 assess tests from the
stable) · `npm run check` ✅. Budgets inside the unchanged gates: f1 18,766 / 6,130 /
5,484 / 3,688; f2 25,186 / **9,122**/9,200 / **8,396**/8,450 / **4,833**/4,840 (ids
104/152; +17 tokens on the dieted totals from the 0.15.1 note texts — same drift as the
stable measured; no ceiling touched).

## 0.20.0-beta.10 — 2026-09-02

Absorbs the stable **0.15.0** (squash `7c4d6a79` = tag v0.15.0 = npm `latest`, verified;
Desktop-audit cycle, lead «avança» 01-09). Bundle pin UNCHANGED (release KG `v1.9.0`).
The 0.14.0 was already absorbed in beta.9 — this wave takes ONLY 0.15.0.

### Absorption map (items 1–10 of the stable cycle → this line)

- **index-compact DERIVED** at read-time; the March static file
  (`data/publish/sbd-toe-index-compact.json`) is deleted here too (file + the `files[]`
  packaging entry kept by this line's package.json — removed by hand, the conflict kept
  ours); TC-F-22: 15 chapters, `demand_by_level`, 0 `minLevel`.
- **Universal pagination**: threat default 25/233 + `size_estimate` (full L2 ≈7.1k
  tokens/page), plan default 5 chapters, `read_sbd_toe_resource` slot picker +
  `char_offset`/`char_limit` with coverage, consult `size_estimate` (TC-D-10, TC-F-18,
  TC-F-21 char-paging PASS here).
- **`excluded_by_level[]` band** on select (L1: 15 categories / 60 reqs declared) +
  additive counts on prepare completeness; **ultrathin diets the two counts** — measured
  4,833 ≤ 4,840, the stable's near-miss solved by diet, no new ceiling (TC-F-19).
- **`tool_prefix`** on generate_sbd_toe_skill; **canon-first `implement→develop`** alias +
  `phase_warning` with `knownPhases` (silent zero-filter dies; TC-F-20); **harmonized
  declared errors** (brief unknown → `valid_chapter_ids`, numeric alias; orgScope warning;
  unknown slot → slots list; TC-F-21); consult projection declared + `maxItems 3` + threat
  `concerns` enum gains `agents`; skill resource L2 declared; **`risk_level↔riskLevel`
  aliases** both ways (TC-F-22).
- **Line note INVERTED for this line (dispatch rule):** the absorbed
  `codegen-instructions` `line_note` said «trace pertence à linha 0.20; nesta linha
  estável use include_relations» — false here. It now tells the 0.20 truth: the
  `trace_sbd_toe_graph` tool EXISTS on this line — execute the `relations_ref` directly;
  `include_relations=true` stays as the inline shortcut.
- Beta-only surfaces audited (selection engine, select tool, trace/SPARQL, RDF
  projection): **none serve `minLevel` or their own per-level chapter lists** — nothing
  else to kill.

### Verification (records `docs/acceptance-runs/2026-09-02-v0150-*-v0.20.0-beta.10-*`)

`eval:acceptance`: **129 scenarios, 106 executed — 90 PASS · 16 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0)**; re-baselined TC-F-18..22 + TC-D-10 all PASS on this line; Axis G
3/3; **24/24 tools**; golden cases **10/10**. Suite **727/727** · `npm run check` ✅.
Budgets inside the harmonised gates: f1 18,749 / 6,113 / 5,467 / 3,688; f2 25,169 /
**9,105**/9,200 / **8,379**/8,450 / **4,833**/4,840 (ids 104/152; the six golden
snapshots gained the two additive excluded-by-level counts, +2 lines each, from the
cherry-pick — verified by the suite).

## 0.20.0-beta.9 — 2026-09-01

Absorbs the stable **0.14.0** (squash `1f199ccb` = tag v0.14.0 = npm `latest`, verified)
and closes **Axis G**. Bundle pin UNCHANGED (release KG `v1.9.0`, sha `11153c85…`).

### Absorbed — graduated applicability (0.14.0; Author decision 2026-09-01, verbatim)

«capítulo nunca se exclui por nível; a exigência escala L1→L3 conforme a matriz do cap. 01
e a proporcionalidade das user stories. A noção binária desaparece do serving.» The binary
lists die (`RISK_LEVEL_CHAPTERS`, `ACTIVE_CHAPTERS_BY_RISK`, `minLevel` theory, the
"13 apenas L3" hack); `src/serving/applicability.ts` derives demand from authored
assignment proportionality per chapter × level, anchored to the chapter-01 canonical
matrix with the declared ch-00 fallback. `map_sbd_toe_applicability` serves
`chapters[15]` (presence unconditional) + semantics + `canonical_anchor`;
`list_sbd_toe_chapters` annotates, never filters. Shared files verified byte-identical
to master; **no beta-only surface read the binary list** (audited: selection engine,
prepare, trace/SPARQL — none did, nothing else to kill). Re-baselined scenarios
TC-A-06/07/12 + TC-E-10 re-run on this line: all PASS.

### Added — Axis G: `trace_sbd_toe_graph` acceptance scenarios (runner + governance doc, same change)

- **TC-G-01** — valid trace: determinism (two identical calls byte-equal), G1 pagination
  (`total` + `cursor` = next-row offset, `null` at the declared end; full walk = total on
  all three lenses, 270/270/270), no IRI leaks. **TC-G-02** — declared empty: anchor
  outside the v1 projection (`REQ-AGN-001`) → `rows: []`, `total: 0`, anchor echoed,
  `provenance.note` declares the scope — never silent. **TC-G-03** — invalid/missing
  `lens` → declared JSON-RPC `-32602` naming the field, never an empty success.
- `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md` Axis-G placeholder filled
  in the same change (maintenance rule).
- **Exit criterion met: 24/24 exposed tools exercised** — the beta.8 gap (24/23,
  `trace_sbd_toe_graph` uncovered) closes.

### Verification (record `docs/acceptance-runs/2026-09-01-v0140-*-v0.20.0-beta.9-*`)

`eval:acceptance`: **124 scenarios, 101 executed — 84 PASS · 17 PART · 0 FAIL · 23 SKIP;
gate E PASS (16/1/0, TC-E-10 full PASS)**; Axis G 3/3; golden cases **10/10** (selection
untouched by 0.14.0). Suite **727/727** · `npm run check` ✅. Budgets inside the
harmonised gates: f1 18,749 / 6,113 / 5,467 / 3,688; f2 25,169 / **9,105**/9,200 /
**8,379**/8,450 / 4,833/4,840 (the graduated-applicability metadata adds ~+4 tokens per
payload; ids 104/152 unchanged; snapshots untouched — `prepare` does not serve the
applicability surface).

## 0.20.0-beta.8 — 2026-09-01

Absorbs the stable serving batch **0.13.0** (squash `8a3a9a90` = tag v0.13.0 = npm
`latest`; cherry-pick `079bb35`, pattern of #61→dfd4250 — beta keeps its own diet and
heuristics; the only conflict was the resources/list body, resolved to the new shared
`RESOURCE_CATALOG` after verifying the URI sets are identical). Bundle pin UNCHANGED
(release KG v1.9.0, sha `11153c85…`). Release commit `4681fd20`, tag `v0.20.0-beta.8`,
npm dist-tag `beta`. *(This entry landed in the closing chore — the release-day edit
script aborted on the changelog frontmatter before writing it; declared, not hidden.)*

- `read_sbd_toe_resource(uri)` — resources/read mirror, shared `materializeResource`,
  URIs derived from the single catalog, never-silent unknown-URI error (TC-F-16).
- `provenance.kg` stamp on every response. Measured on THIS line: std f2 9.105 ≤ 9.200,
  min f2 8.379 ≤ 8.450, ultrathin 4.833 ≤ 4.840 — no beta ceiling touched; snapshots
  regenerated (+1 line each).
- inspect: "Pin servido (consumed-bundle.json)" + declared checkout fallbacks;
  v2-draft fossil untouched (TC-F-17).
- prose-number sweep re-run on the beta base: ZERO beta-own occurrences;
  `release_ref`/sync-bundle owner already SbD-ToE here; teaching Step 0 absorbed.
- Verification: **727/727**; eval `2026-09-01-beta8`: 121 scenarios, 80/18/0 FAIL/23 —
  gate E PASS; golden **10/10**; tools 24 exposed / 23 exercised (known Axis-G tail:
  `trace_sbd_toe_graph` without a scenario — reported, out of scope).

## 0.20.0-beta.7 — 2026-08-31

**Prerelease (beta line), formal batch.** Published to the npm `beta` dist-tag under the
programme lead's «3 sims» authorisation (handover manual-wave v1.8.0, «Decisões finais»;
Codex mirror `2026-08-31-codex-release-v1.9.0-lote`). Not citable.

### Served bundle — formal KG release `v1.9.0` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.9.0` (`SbD-ToE/sbd-toe-knowledge-graph@v1.9.0`;
`mcp-stable` → `93fe9fb1955317a782d1774e29fc7961ecdf0f03`, verified by `ls-remote`), asset
sha256 `11153c85d8cb16e022f2be2d999ba131d437275becbbe6dd6b5556915b71f069` (fetched and
digest-verified by `sync-bundle --from-release`), contract **v1.15**, Manual v1.8.0 wave:
**273 requirements / 29 categories** (FIL 8, PRI 5, INT +4), 305 links, EP 273/273.
Zero-delta formalisation of the dev-build this line already pinned
(`kg-v1-manual-v1.8.0-aligned-2026-08-31`): the `data/` diff is the `run_manifest.release`
stamp only (`channel: stable, version: v1.9.0`). The KG deliberately skips a `v1.8.0` tag.

### Payload gates RATIFIED and HARMONISED across lines (programme lead, «3 sims», 2026-08-31)

Fixture 2 `standard` ≤ **9,200** and `minimal` ≤ **8,450** are now the hard gates in
`BUDGETS` on BOTH lines (measured 9,102 / 8,375, identical); the PROPOSED entries left
this line's `KNOWN_TOTAL_DEVIATIONS` (now empty; mechanism kept). The old
"harmonise ceilings" thread closes here.

### Content (the v1.8.0 wave, absorbed from master `17f158e7` in `dfd4250c`, now released on this line)

Absorbed from #61 (conflict rules: beta keeps its own diet/budget gates/snapshots/agents
heuristics; `src/index.ts` untouched by #61): `files`→FIL / `privacy`→PRI signals (EN+PT,
Manual-anchored; `data_sensitivity: personal|regulated` → PRI), **R-image** homonym
disambiguation (docker/registry/container → CNT vs file/upload/photo → FIL; TC-F-14),
**`SES-008-por-tecnologia`** (JWT/user-token selects SES-008 at any level, named in the
trace; declared levelGuard exemption in the Axis-H runner; TC-F-15), the "uploading" gerund
fix, golden-case re-baseline (273/29) and scenarios TC-F-14/15.

### Verified on this line (2026-08-31)

- **Golden re-run: 10 PASS / 0 / 0** (coverage 100%, strict precision 100%; oracle
  untouched) — the four registered gaps flip to **covered**: GC-01 → FIL (29/29),
  GC-06 → PRI (16/16), GC-08 → SES-008 by named rule (35/35), GC-10 → INT-009..012
  (10/10); "transição lacuna → coberto" lines in
  `docs/acceptance-runs/2026-08-31-v180-axis-h-selection-v0.20.0-beta.6.{md,json}`.
- Live: FIL upload case → FIL ×8 at all 4 `detail` levels; PRI case
  (`data_sensitivity: personal` + «dados pessoais») → PRI ×5 at all 4 levels; R-image:
  docker → CNT ×11 / FIL 0, photo → FIL ×8 / CNT 0.
- `eval:acceptance` (`2026-08-31-v180-v0.20.0-beta.6-acceptance`): **119 scenarios, 96
  executed — 78 PASS · 18 PART · 0 FAIL · 23 SKIP; gate E PASS, no regression**;
  TC-F-14/15 PASS; Axis H 10/10; 22/23 tools (`trace_sbd_toe_graph` scenario = Axis G,
  still open).
- `trace_sbd_toe_graph` deterministic; RDF-projection source `requirement_control_links`
  282 → **305**, test re-baselined (141 rule + 148 recalc + 16 curated).
- **Payload budgets — fixture 2 is a file-upload endpoint and FIL correctly applies**
  (citations 143 → **152**; f1 unchanged 104): measured f2 standard **9,102** / minimal
  **8,375** — identical to the stable line — **above the ratified 8,800/8,100**. Handled as
  PROPOSED ceilings in `KNOWN_TOTAL_DEVIATIONS` (9,200 / 8,450, = the stable's
  re-baselined gates; the ratified gates stay on record) — **ratification by the programme
  lead requested**. Sections re-baselined (= stable): rest-full 1,600 (1,560),
  activated_scope 5,500/5,500/2,500 (5,396/5,396/2,423). Ultrathin 4,829/4,840 within.
  Golden snapshots: taken from master's regeneration and verified byte-identical to this
  line's output (`vitest -u` produced zero changes) — diff = FIL additions + bundle
  provenance (`manual_commit_sha` → `f78dfe73`).
- Suite **727/727** · `npm run check` ✅.

### Re-run on the formal pin (this release)

Golden cases **10 PASS / 0 / 0** and full `eval:acceptance` **119 scenarios — 78 PASS ·
18 PART · 0 FAIL · 23 SKIP, gate E PASS** re-run on the `v1.9.0` release pin (records
`docs/acceptance-runs/2026-08-31-v190-*-v0.20.0-beta.7-*`); suite **727/727**;
measured f2 9,102/8,375 inside the ratified gates.

## 0.20.0-beta.6 — 2026-08-31 (published 2026-08-31: annotated tag `v0.20.0-beta.6` on `322c38f4`, npm `beta`, after the Orchestrator side-by-side with stable 0.11.0 → `v0.11.0` on `102b8166`)

**Prerelease (beta line).** Absorbs the complete **MP1 cycle** from `master` —
`ef52089` (#58, P2: selection engine + `select_sbd_toe_requirements` + new scope gate +
declared activators + `consult` `mode:"index"`), `7368dcb` (#59, P3: named rules
`R1:principal-nao-humano` / `R2:narrowing-de-sinais-SES` + missing signals +
one-signal-one-surface gate), `102b816` (#60, R3: the teaching layer — guide, skills,
`next[]`, TC-F-13) — plus the Axis-H runner base of #56 (`axis-h.mjs`,
`run-axis-h-selection.mjs`, `eval:axis-h`), which the three squashes assume. Served bundle
unchanged: formal KG `v1.7.0` (sha256 `29156b86…fb9a`, contract v1.14). **No tag, no npm.**

### Conflict rules applied (this line is the diet's origin)

- Diet parts (budget gates incl. the ratified 8,800/8,100, golden snapshots, the
  `requirementCategoryOf` elision, `detail`/`include_relations` schema text): **beta version
  kept**; only the new engine/tool/gate/teaching absorbed. The stable's port note
  («relations_ref names the beta-line trace tool») does not apply here — `trace_sbd_toe_graph`
  ships on this line.
- `agents`: the engine now governs (R1 named in `selection_trace`); `concerns:["agents"]`
  and the beta task heuristics remain the signal source — no duplication (single
  `VALID_CONCERNS`/`TASK_TERM` entries, verified).
- `src/index.ts` resolved by hand: SPARQL/`trace_sbd_toe_graph` untouched; beta descriptions
  kept; `select_sbd_toe_requirements` + `consult` `mode:"index"` registered.

### Verified on this line (2026-08-31)

- **Axis H 10/10 PASS** (`docs/acceptance-runs/2026-08-31-axis-h-selection-v0.20.0-beta.6.{md,json}`)
  — coverage 100%, strict precision 100%, oracle untouched; = stable P3/R3.
- **`npm run eval:acceptance`** (`…/2026-08-31-v0.20.0-beta.6-acceptance.{md,json}`): **117
  scenarios, 94 executed — 76 PASS · 18 PART · 0 FAIL · 23 SKIP; gate E PASS (15/2/0), no
  regression**; TC-F-11/12 PASS, **TC-F-13 (taught path) PASS** — SES narrowed with a
  teachable R2 reason, recovered with the session signal, `next[]` → prepare+consult.
  **22/23 tools** — `trace_sbd_toe_graph` still without a scenario (Axis G follow-up).
- Live: `select` on an agentic task → AGN ×4 + the full R1 principal set (ACC-002, AUT-006,
  ENC-006, DEP-011/013/014) with R1 in `selection_trace`; `prepare` kill-switch task at all
  4 `detail` levels → AGN ×4 + OPS-015 with `completeness_report.selection` (eligible 120 →
  selected 34, narrowed_out 86 declared); `concerns:["agents"]` unchanged.
  `trace_sbd_toe_graph` deterministic, 270/270/270 byte-equal to beta.2.
- **Payload budgets (MP1 re-measurement; beta = stable measurements exactly):** f1 full
  18,745 · standard **6,109**/6,500 · minimal **5,463**/5,800 · ultrathin **3,684**/3,870;
  f2 full 24,544 · standard **8,446**/8,800 · minimal **7,720**/8,100 · ultrathin
  **4,581**/4,840; citable ids **104/143** (R2 narrows SES ×8 out of both fixtures — golden
  snapshots regenerated: −8 SES requirement entries per fixture + the `selection` summary
  block; nothing else). **The only budget re-baseline is the `rest` section** (the MP1
  selection summary lives there): standard 850 → **980**, minimal 853 → **985**, ultrathin
  935 → **1,055** — the stable's exact section values (line parity). **Totals untouched; no
  new ratification needed** — measured totals now sit inside the ratified gates (8,800/8,100)
  and even the original ones (8,500/8,000); restoring the original gates is the lead's call,
  flagged, not taken.
- Suite **727/727** · `npm run check` ✅ · version 0.20.0-beta.6.

## 0.20.0-beta.5 — 2026-08-31

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.4`) is unchanged. Not citable (see `FREEZE-REGISTRY.md`, beta line).

### Served bundle — formal KG release `v1.7.0` (`mcp-stable`), `source: release` (absorbs master `2937236d`, PR #54)

`consumed-bundle.json` identical to master 0.10.4: `release_tag: v1.7.0`
(`SbD-ToE/sbd-toe-knowledge-graph@v1.7.0`, commit `894af32a` = `mcp-stable`), asset sha256
`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a` (fetched and
digest-verified by `sync-bundle --from-release`), contract **v1.14** (§1.21), ontology
`sbdtoe-ontology-v2.2`, Manual v1.7.1; curated links **282** (12+4). Closes the dev-build
lineage of this version (v2.2 snapshot below). Absorbed from #54: the G-b
defining-chapters threat routing (defining chapters of activated controls count as
in-scope; ch.02 suppression narrowed; `mitigated_by` for ch.02 threats),
`Control.defining_chapter_ids`, `Threat.associated_control_ids` (233/233, declared
derivation) + `associated_controls_text` on the served surface, and the acceptance
re-baseline (TC-E-01/02 → PASS under the documented criterion; TC-F-08 → 282 links).
L2 scopes after routing: auth 77 → **95**, encryption 107, validation 72; logging/iac
unchanged; no-concern 233.

### Verified on this line (2026-08-31, live server over stdio)

- **`npm run eval:acceptance`** (record `docs/acceptance-runs/2026-08-31-v0.20.0-beta.5-acceptance.{md,json}`):
  **104 scenarios, 81 executed — 63 PASS · 18 PART · 0 FAIL · 23 SKIP; gate (Axis E) PASS
  with TC-E-01/02 promoted to PASS** under the #54 criterion (`mitigated_by` +
  `associated_control_ids` resolve) — same rollup as master's 0.10.4 run. 21/22 tools
  (`trace_sbd_toe_graph` still without a scenario — Axis G follow-up open).
- **G-b routing verified live:** `get_threat_landscape` L2 scopes auth **95** (was 77 on the
  v2.2 pin, 159 before C1), logging 15, no-concern **233** — matching master.
- `trace_sbd_toe_graph` deterministic; **270/270/270 rows, byte-equal to beta.2** (the RDF
  projection's `requirement_control_links` source 281 → **282**, test re-baselined).
- `prepare_sbd_toe_codegen_context` with `concerns:["agents"]` and the kill-switch task at
  all four `detail` levels: AGN ×4 (+ OPS-015 heuristic case); **direct controls include C1
  identity** (`CTRL-identity-…`) for the AUT scope. Payloads 12,115/5,142/4,603/3,013 and
  11,921/6,379/5,307/2,903 tokens.
- **Payload budgets within the ratified gates:** f1 full 19,092 · standard 6,409/6,500 ·
  minimal 5,763/5,800 · ultrathin 3,775/3,870; f2 full 24,890 · standard **8,746/8,800** ·
  minimal **8,019/8,100** · ultrathin 4,671/4,840; citable ids 112/151.
- Suite **712/712** (`req-agn-serving` legacy-citation test given a 20s timeout on this line
  only — the three semantic retrievals measure ~5.1s under the larger 42-file v2 suite;
  result-correct in isolation). `npm run check` ✅ · `sync-bundle --from-release v1.7.0`
  idempotent over the cherry-picked data.

### Payload gates re-fixed at the ratified ceilings (programme lead, 2026-08-31)

Fixture 2 `standard` ≤ **8,800** and `minimal` ≤ **8,100** are now the hard gates in
`BUDGETS` (measured on v1.7.0: 8,746 / 8,019 — identical to the v2.2 dev-build);
`KNOWN_TOTAL_DEVIATIONS` emptied (the mechanism stays for future drift). Historical
gates (8,500 EPIC / 8,000 s3b / 8,700 ratified 2026-08-29) remain on record in EPIC.md.
Note: the EPIC re-baseline note claimed by commit `97d28be` was missing from EPIC.md
(script fault); restored and consolidated in this commit.

### Pin lineage step — dev-build KG v2.2 snapshot (absorbs master `fa62f29b`, PR #53; pre-G-b verification; superseded by the formal `v1.7.0` above)

**No release, no tag, no npm, no `mcp-stable`.** `consumed-bundle.json` identical to master:
dev-build `kg-v1-manual-v1.7.1-aligned-2026-08-30-v2.2`, sha256
`08d87f2e08d22edcdbf44d603ec7b267eb676c119ae84f3c569b5aff31dbc628` (verified against the
sidecar by `sync-bundle`; idempotent over the cherry-picked data, `+0 ~0 -0 =49`), contract
**v1.13** (ontology v2.2, curated link layer v3), Manual v1.7.1 (unchanged), `pinned_at`
2026-08-30. Supersedes the formal `v1.6.1` pin of 0.20.0-beta.4. Scenario re-baseline from
master taken as-is (TC-F-08 → 281 links, curated 12+3 on surface, `catalogue_rule*`
tolerated; new TC-F-09 `data_protection` served, TC-F-10 all AUT → C1 identity, never
CAP/DEV; runner `ctx.links`).

Verified on this line (2026-08-30):

- `npm run eval:acceptance` (record `docs/acceptance-runs/2026-08-30-devbuild-v2.2-v0.20.0-beta.4-acceptance.{md,json}`):
  **104 scenarios, 81 executed — 61 PASS · 20 PART · 0 FAIL · 23 SKIP; gate (Axis E) PASS**;
  TC-F-08/09/10 PASS; same rollup as master's run on 0.10.3. 21/22 tools —
  `trace_sbd_toe_graph` still without a scenario (Axis G follow-up open).
- `trace_sbd_toe_graph` deterministic; **270/270/270 rows per lens, byte-equal to beta.2**
  (the projection covers the v1 relations; its `requirement_control_links` source
  265 → **281**, test re-baselined).
- `prepare_sbd_toe_codegen_context` with `concerns:["agents"]` and with the task «AI agent
  worker with a kill-switch»: AGN ×4 (+ OPS-015 on the heuristic case) at all four `detail`
  levels; **direct controls now carry C1 identity**
  (`CTRL-identity-identidade-autenticacao-e-sessoes…`) for the AUT scope instead of the
  governance control — matching the curated layer v3 re-targets (TC-F-10).
- **Observed deviation (same as stable, informational for G-b):**
  `get_threat_landscape(L2, auth)` scope **159 → 77** (C1 publishes different `chapter_ids`
  than the retired IDN control); logging 15, no-concern **233** unchanged.
- **Payload re-baseline (documented; ceilings PENDING operator ratification):** the link
  layer v3 changes the fixtures' direct controls. f1: full 19,092 · standard 6,409/6,500 ·
  minimal 5,763/5,800 (section `activated_scope` re-measured 3,243 → budget 3,290) ·
  ultrathin 3,775/3,870 — totals within gates. f2: full 24,890 · standard **8,746**
  (provisional ceiling 8,800; EPIC gate 8,500 and the ratified 8,700 kept on record) ·
  minimal **8,019** (provisional ceiling 8,100; s3b hard 8,000 kept) · ultrathin 4,671/4,840.
  Citable ids unchanged (112 / 151). Golden snapshots regenerated (control re-targets only;
  `manual_commit_sha` unchanged). `npm run check` ✅ · **708/708** ✅.

## 0.20.0-beta.4 — 2026-08-30

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.3`) is unchanged. Experimental; **not citable** — excluded from the scientific record
per `PROGRAMME-PRESERVATION-PROTOCOL.md` (see `FREEZE-REGISTRY.md`, beta line).

### Served bundle — formal KG release `v1.6.1` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.6.1`, `release_ref: SbD-ToE/sbd-toe-knowledge-graph@v1.6.1`,
asset `sbd-toe-knowledge-graph-bundle-v1.6.1.zip` sha256
`df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b` (fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`), contract
**v1.12** (§1.19 curated layer v2), Manual **v1.7.1** @ `8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac`,
ontology `ontology-v1.1-fair-baseline`, `pinned_at` 2026-08-30. **Same pin and same served
content as stable `0.10.3`** (master `06f8bba`, PR #51); supersedes `v1.6.0` (beta.3).
Served-knowledge delta `v1.6.0` → `v1.6.1` as recorded in the `0.10.3` entry below (curated
requirement→control layer v2: `requirement_control_links` 263 → 265, 0 requirements without a
link; Manual v1.7.1 `EX-REQ-NNN`).

### Verified on this line (live server over stdio, `dist/index.js`; 2026-08-30)

- **`npm run eval:acceptance`** (first run on the beta line; record
  `docs/acceptance-runs/2026-08-30-v0.20.0-beta.4-acceptance.{md,json}`): **102 scenarios, 79
  executed — 59 PASS · 20 PART · 0 FAIL · 23 SKIP; promotion gate (Axis E) PASS**; Axis F
  7/7 incl. TC-F-08 (265 links, gaps 0/0/0, AUT-007/008 → identity, AUT-010 → monitoring).
  The scenario set is master's 0.10.3 one (#51: TC-E-01/02 criterion revised to structural
  `mitigated_by`, `associated_controls` textual → PART; `--stamp`). **21/22 exposed tools
  exercised — `trace_sbd_toe_graph` (this line only) is not covered by the stable scenario
  set** (follow-up: an Axis-G scenario for the SPARQL lens).
- `trace_sbd_toe_graph`: deterministic (3 lenses × 2 calls byte-equal); **270/270/270 rows —
  unchanged since beta.2** (`relations.v1` 529 untouched; the RDF projection's
  `requirement_control_links` source 263 → **265**, test re-baselined with history).
- `prepare_sbd_toe_codegen_context` with `concerns: ["agents"]` at `full`/`standard`/
  `minimal`/`ultrathin`: REQ-AGN-001…004 in the activated set at every level (11,760 / 4,998 /
  4,467 / 2,899 tokens; `category` elided at dieted levels, `description` at standard/minimal);
  task heuristic «AI agent … kill-switch … audit logging» also activates OPS-015.
- **Payload budgets** (vitest, `JSON.length/4`; tolerance ≤8,700 on fixture 2 `standard`
  ratified by the programme lead on 2026-08-29): fixture 1 full **18,992** · standard
  **6,280**/6,500 · minimal **5,641**/5,800 · ultrathin **3,746**/3,870 — the curated layer v2
  re-targets one link into this fixture (direct controls 9 → 10, `citation_map` 111 → **112**,
  re-baselined); fixture 2 full 24,790 · standard **8,617**/8,700 (gate 8,500 kept; −28 vs
  v1.6.0) · minimal **7,898**/8,000 · ultrathin **4,642**/4,840 · 151 ids. All within limits.
- Golden snapshots regenerated (data-driven: 131× `manual_commit_sha` `d5c2586a` → `8e03454c`,
  the re-targeted control in fixture 1, evidence totals). `npm run check` ✅ · **708/708** ✅
  (master's v1.6.1 tests `requirement-id.test.ts` / `req-agn-serving.test.ts` absorbed from #51).

### Absorbed from master `8ade07f1018d986816b8dadb8c5bc29be6c9fdf3` (PR #49)

Cherry-picked into the v2 line; `src/index.ts` merged cleanly (only the
`query_sbd_toe_entities` schema descriptions changed — `trace_sbd_toe_graph`, `detail`,
`include_relations` and `concerns: ["agents"]` untouched; the dieted `category` elision keeps
this line's `requirementCategoryOf` rule).

### Added — acceptance regression runner

- **`npm run eval:acceptance`** (`scripts/run-acceptance-scenarios.mjs` + `scripts/acceptance/`):
  executes the **94 acceptance scenarios** of
  `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md` (axes A–E) against the real
  stdio server on the pinned bundle, one verdict per scenario (PASS / PART / FAIL / SKIP with
  owner `mcp`·`graph`·`roadmap`), Axis E as the promotion gate (exit 1 on FAIL), and a
  **coverage** section (scenarios executed, tools exercised vs exposed, ACs covered, roles ×
  phases). **Axis F** (7 scenarios) covers the six 0.10.0 tools that post-date the June
  elicitation plus the G1 pagination gate. Run records live in `docs/acceptance-runs/`.
- First run on `0.10.2` / KG `v1.6.0`: 101 scenarios, 78 executed (23 SKIP: 21 commercial
  ACs + 2 needing a client LLM), **58 PASS · 18 PART · 2 FAIL**; **21/21 tools exercised**.
  The two FAILs (TC-E-01/02) are data-rooted: `associated_controls` on threats is empty for
  ch.12 and textual elsewhere in the bundle (routed to Codex); `mitigated_by` is populated
  structurally on every threat.

### Fixed — `query_sbd_toe_entities` filters (found by TC-A-13)

- `entityType` and `riskLevel` filters returned **0 for every query**: they matched the
  Algolia-era record fields `entity_type` / `risk_levels`, which no chunk of the current
  substrate carries. They now match what the substrate publishes — entity types via the
  chunk's entity mentions (`Requirement | UserStory | Metric | Threat`, aliases accepted) and
  the risk facet `filter_tags.risk_level` — over the full ranked retrieval, and the response
  declares `filters {applied, retrieval_pool, matched, pool_with_risk_facet, note}` (chunks
  without a risk facet are not returned — declared, never silent). `chapterId` accepts the
  bundle id or its numeric prefix. Tool schema documents the vocabulary.

### Removed — Algolia-era snapshot-cache paths (dead at runtime)

- `structured-tools.ts` (`list_chapters`, `query_entities`, `chapter_brief`,
  `map_applicability`) and `plan-repo-governance.ts` carried a `SnapshotCache` branch that
  the server never reached (runtime calls pass no cache). Removed, together with the ~25
  unit tests that only exercised those branches with `chapter_bundle` /
  `practice_assignment` / `risk_levels` fixtures; replaced by tests over the runtime bundle.
  Suite: 532 tests.


## 0.20.0-beta.3 — 2026-08-29

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.2`, gitHead `31aa22af`) is unchanged. Experimental; **not citable** — excluded from the
scientific record per `PROGRAMME-PRESERVATION-PROTOCOL.md` (see `FREEZE-REGISTRY.md`, beta line).

### Served bundle — formal KG release `v1.6.0` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.6.0`, `release_ref: SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`,
asset `sbd-toe-knowledge-graph-bundle-v1.6.0.zip` sha256
`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b` (verified by
`sync-bundle --from-release` against the release's `.sha256` asset), contract **v1.11**,
Manual **v1.7.0** @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` (`SbD-ToE/sbd-toe-manual`),
ontology `ontology-v1.1-fair-baseline` @ `84fe8bf6`, `pinned_at` 2026-08-29. **Identical pin
and identical served content to stable `0.10.2`** (master `31aa22af`, PR #47).

Pin lineage inside this version, all on 2026-08-29 (each step absorbed from `master` and
verified on this line — steps documented below in reverse order): dev-build
`kg-v1-manual-v1.6.7-aligned-2026-08-29` (PR #45 → `6353557`) → dev-build
`kg-v1-manual-v1.7.0-aligned-2026-08-29` (PR #46 → `eac79e6`) → **formal `v1.6.0`** (PR #47).
Diff of `data/` between the v1.7.0 dev-build and the formal release: **one file**,
`data/reports/run_manifest.json` — the `release` block only (`channel: dev-build → stable`,
`version: kg-v1-manual-v1.7.0-aligned-2026-08-29 → v1.6.0`); every served file byte-identical.

What this line adds over stable `0.10.2` (unchanged from beta.1/beta.2, re-verified on this
pin): `trace_sbd_toe_graph` (SPARQL/Oxigraph, deterministic, 270/270/270 rows per lens — equal
to beta.2), the `detail` parameter of `prepare_sbd_toe_codegen_context`
(`full`/`standard`/`minimal`/`ultrathin`), and — from this version —
`concerns: ["agents"]` accepted by `prepare` (REQ-AGN-001…004 + OPS-015 verified in the
activated set at all four detail levels) and the v1.10 category-segment rule in the dieted
encoding.

### Step 2 — re-pin to dev-build `kg-v1-manual-v1.7.0-aligned-2026-08-29` (absorbs master `947f38e6`, PR #46)

Superseded the `v1.6.7` pin (step 1, below) the same day; content identical to the formal
`v1.6.0` above.

- **Served bundle:** `consumed-bundle.json` → `kg-v1-manual-v1.7.0-aligned-2026-08-29`, sha256
  `2c27f4ebccb9a693ccb3ae50fb0bb64fd602aff3acc9b53d36f898a64c0064fa` (verified against the
  sidecar by `sync-bundle`; idempotent over the cherry-picked data, `+0 ~0 -0 =49`), contract
  **v1.11**, Manual **v1.7.0** @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` (repo
  `SbD-ToE/sbd-toe-manual`), ontology unchanged. Identical to master's pin.
- **Served knowledge:** requirements 255 → **256** (OPS-015, ch. 12), categories 27; curated
  requirement→control layer: `requirement_control_links` 242 → **263** — the 20 formerly
  unlinked requirements (incl. REQ-AGN-001…004 → `CTRL-governance-classificacao-e-governacao-por-risco-97aceecf29`)
  and OPS-015 now carry a direct control; `coverage_gaps.requirements_without_control_link`
  = **0** at L1/L2/L3 (mechanism kept, data-driven). Legacy `REQ-<CAT>-NNN` citations: **0**
  (`declared_gap` mechanism kept). Manual v1.7.0 `macro-processos` chunks served in `guide`.
- **Citation classifier (from master):** `src/serving/requirement-id.ts` `describeRequirementCitation`
  — illustrative `REQ-NNN` and non-requirement `<CAT>-NNN` tokens (`CWE-`, `SHA-`, …) answer
  with an **informative** `citation_note` (`status: "informative"`, `query_sbd_toe_entities` /
  `resolve_entities.meta`), never a gap, never resolved by approximation; `declared_gap` is
  reserved for the legacy shape. `EX-AUT-003` / `REQ-AUTH-001` still rejected (fullmatch).
- **v2 line, data-driven re-baselines (this line only):**
  - `src/serving/rdf/projection.test.ts`: `requirement_control_links` 242 → 263 (comment
    records the history). `trace_sbd_toe_graph` unchanged: 270/270/270 rows per lens,
    byte-equal to beta.2 (`relations.v1` 529 untouched).
  - Golden snapshots regenerated: 131× `manual_commit_sha` (`171db83d` → `d5c2586a`);
    fixture 2 gains OPS-015 (`logging` → OPS) in the activated set (68 → 69 requirements,
    +1 `citation_map` id, +1 grounding entry, `evidence_patterns_total` +1).
  - `prepare-codegen-context.budget.test.ts`: fixture 2 `citationIds` 150 → **151**;
    **payload deviation reported, gate not raised:** fixture 2 `standard` measures **8,645 >
    8,500** (EPIC hard gate; +223 tokens vs the v1.6.7 pin — OPS-015 with its published
    description; data growth, not an encoding regression). Recorded as a tolerated deviation
    (`KNOWN_TOTAL_DEVIATIONS`, ceiling **8,700 — ratified by the programme lead on
    2026-08-29**); the EPIC gate (8,500) itself is not raised; EPIC.md carries the
    re-baseline note. All other budgets within limits: f1 standard 6,227 / minimal 5,588 /
    ultrathin 3,696 (unchanged); f2 minimal **7,926**/8,000, ultrathin **4,642**/4,840; full
    18,903 / 24,792.
- **Toolchain hygiene (from master, separate commit on this line):** devDependencies `vitest` /
  `@vitest/coverage-v8` / `@vitest/ui` 1.6.x → **4.1.9**; resulting tree `vite` **8.2.2**
  (rolldown 1.2.6), `postcss` **8.5.26**; `esbuild` and `brace-expansion` leave the tree.
  Verified on the v2 line with `oxigraph` 0.5.9 (WASM): `npm run check` ✅, build ✅,
  **723/723** ✅ (incl. payload budgets and golden snapshots), `smoke:mcp` ✅, `npm audit`
  0 vulnerabilities. Package contents unchanged (devDependencies only).
- **Verified live (stdio):** resolve REQ-AGN-001…004 + **OPS-015** 5/5; consult L1 120/26,
  L2 **231/27**, L3 **256/27**, gaps 0/0/0; `concerns:["agents"]` → REQ-AGN-001…004 with 1
  direct control via `requirement_control_links` + 5 derived; `prepare_sbd_toe_codegen_context`
  at full/standard/minimal/ultrathin with REQ-AGN-001…004 **and OPS-015** in the activated set
  (task heuristic `ai agent` + `audit logging`); `npm run check` ✅, **723/723** ✅.

### Step 1 — absorb master `bc8c91890e454f171e267cea892d9d9b99f6585a` (PR #45): dev-build `v1.6.7`, id grammar v1.10, declared gaps

Absorbed into the v2 line by cherry-pick (`6353557`). Superseded the same day by step 2.

#### Served bundle at step 1 (same as master at #45)

`consumed-bundle.json`: formal `v1.5.0` → **dev-build `kg-v1-manual-v1.6.7-aligned-2026-08-29`**
(sha256 `a66c324575cede5ffb9e7c5ddae06bb8d090b3a1ec7150d53f80074f55185276`, verified by
`sync-bundle` against the `.sha256` sidecar; `pinned_at` 2026-08-29; contract **v1.10**; Manual
v1.6.7 @ `171db83d`). `sync-bundle` from the snapshot is idempotent over the cherry-picked
data (`+0 ~0 -0 =49`). Bundle deltas measured on this line: requirements 251 → **255**
(AGN ×4), EvidencePatterns 251 → **255**, `overlay_mappings` 5508 → **6360** (+852),
`cross_layer_referrals` 6366 → **7218** (+852), `external_frameworks` 4 → **6** (AI Act,
ENISA-CSA). The dispatcher's «+64 overlay edges / +32 EP» does not match these counts —
reported as a difference, not reconciled.

#### Absorbed from master (see `0.10.2` entry for the full description)

- REQ-AGN-001…004 served; `concerns: ["agents"]` on `consult_security_requirements`;
  `coverage_gaps.requirements_without_control_link` (20 at L3 / 18 at L2 / 4 at L1);
  `declared_gap` for legacy `REQ-<CAT>-NNN` citations on `query_sbd_toe_entities` /
  `resolve_entities`; `src/serving/requirement-id.ts` grammar v1.10 §1.18 (fullmatch) with
  its tests (`requirement-id.test.ts`, `req-agn-serving.test.ts`, +32 tests → 720/720).
- `src/index.ts` merged by hand: `concerns` enum gains `agents`; the v2 registrations
  (`trace_sbd_toe_graph`, `detail`, `include_relations`, codegen-instructions resource) are
  preserved. Version bump `0.10.2` **not** taken — this line is `0.20.0-beta.3`.

#### Changed — v2 line alignment with the v1.10 grammar (this line only; differences vs stable)

- `prepare_sbd_toe_codegen_context` dieted levels elided `category` when it equalled the
  requirement_id **prefix before the first `-`** — a grammar assumption the stable audit could
  not see (the site exists only on this line). Now derived through the single source
  `requirementCategoryOf` (segment before the number: `REQ-AGN-001` → `AGN`); the lossless
  guard (field kept inline on mismatch) is unchanged. `provenance_legend` / `detail_encoding`
  wording updated accordingly (+8…+17 tokens per dieted payload).
- `prepare_sbd_toe_codegen_context` **accepts `concerns: ["agents"]`** (→ category `AGN` via the
  loader's `concernsMap`; no AppSec Core slice family, no control invented) and the task
  heuristics `ai agent`, `agentic`, `kill-switch`/`kill switch`, `autonomy level` → `agents`.
  On the stable line `agents` is consult-only; here it is needed so the AGN catalogue can enter
  the activated set of a codegen context (verified live at `full`/`standard`/`minimal`/
  `ultrathin`: REQ-AGN-001…004 present at every level, `category` elided at dieted levels,
  published `description` at standard/minimal, none at ultrathin).
- Golden snapshots (`__snapshots__/codegen-detail/*`) regenerated: the diff is purely
  data-driven — 131× `manual_commit_sha` (`09b20f6f` → `171db83d`), 8× `name` + 4×
  `description` (markdown asterisks removed upstream in OPS-013 / REQ-AGN text), 6× legend
  `note` (above). No line added or removed.

#### Verified on this line (live server over stdio, `dist/index.js`)

| Check | Result |
|---|---|
| `resolve_entities` REQ-AGN-001…004 | ✅ 4/4, `category: AGN`, chapter 2; 001/002 L1–L3, 003/004 L2–L3 |
| `AUT-003` ✓ · `EX-AUT-003` ✗ (never AUT-003) · `REQ-AUTH-001` ✗ · `REQ-AUT-003` → `declared_gap` | ✅ |
| `consult` L1 / L2 / L3 | ✅ 120/26 · **230/27** · **255/27** categories; AGN ×2 / ×4 / ×4 |
| `coverage_gaps.requirements_without_control_link` | ✅ 4 / 18 / **20** (+ `REQUIREMENT_WITHOUT_CONTROL_LINK` rule-trace line) |
| `consult` `concerns:["agents"]` | ✅ exactly REQ-AGN-001…004, 0 controls, 4 declared |
| `query_sbd_toe_entities` REQ-AUT-003 / REQ-010 / EX-AUT-003 | ✅ `legacy_citation_unresolvable` / `citation_unresolvable` / no AUT-003 |
| `get_sbd_toe_verification_matrix` L3 | ✅ 255/255 EvidencePatterns |
| `trace_sbd_toe_graph` (3 lenses, pageSize 200) | ✅ deterministic (2 calls byte-equal per lens); totals **270 / 270 / 270 — identical to beta.2** (the RDF projection covers the v1 relations, untouched by this bundle; `anchor: REQ-AGN-001` → 0 rows, consistent with the declared gap; `anchor: ASC-01` → 19) |
| Payload budgets (vitest, method `JSON.length/4`) | ✅ f1 full 18,903 (= beta.2) · standard **6,227**/6,500 · minimal **5,588**/5,800 · ultrathin **3,696**/3,870; f2 full 24,730 (beta.2: 24,731) · standard **8,422**/8,500 · minimal **7,703**/8,000 · ultrathin **4,612**/4,840. Deltas vs beta.2: +17/+17/+8 and +11/+11/+6 tokens (legend wording) |
| `npm run check` · `npm test` · `npm run smoke:mcp` | ✅ · ✅ 42 files, **720/720** · ✅ |

Not a freeze event; `FREEZE-REGISTRY.md` unchanged. Same upstream pendings as the stable
line (formal KG release + `mcp-stable` → re-pin `source: release`; Manual legacy-citation
correction; `requirement_control_links` refresh).

## 0.20.0-beta.2 — 2026-07-05

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.x`) is unchanged. Experimental; **not citable** — excluded from the scientific
record per `PROGRAMME-PRESERVATION-PROTOCOL.md`.

### Added — v2 token diet of `prepare_sbd_toe_codegen_context` (epic `v2-token-diet`)

Measured baseline (2026-07-05, beta.1): typical codegen payload ≈18.9K tokens,
3-family ≈24.7K. External eval (D-a/D-b) attributed the 5.5× MCP cost multiplier to
*large payload × many turns*. This release cuts the payload, never the context.

- **`detail` input parameter** — `"full" | "standard" | "minimal" | "ultrathin"`,
  **default `"full"` is byte-identical to beta.1** (proven by binary comparison and
  golden snapshots; zero breaking change). The dieted levels re-encode, they never
  drop the activated set: no top-k, no ranking, complete requirement/control sets at
  every level, identical citable ID set (111/150 on the baseline fixtures) at every level.
  - `standard` — ≈6.2K/8.4K tokens (−67%/−66%): inverted `citations` grouped by source,
    `manual_grounding` grouped by (role, chapter, file, sha), top-level `provenance_legend`,
    evidence patterns capped at 10 (deterministic prefix, `total/returned/capped` +
    executable rest-reference), and — new context — the published verbatim `description`
    (the "how") on activated requirements and direct controls.
  - `minimal` — ≈5.6K/7.7K: same complete scope with descriptions; traceability
    serialization reduced to counts + executable references; evidence cap 5.
  - `ultrathin` — ≈3.7K/4.6K (−80%): complete sets as `{id, name, type}` without
    descriptions (`descriptions_ref` points at `minimal`); evidence 0 inline;
    grounding as `{total_entries, sha, groups_ref}`. Ablation arm for measuring the
    value of the description field.
- **Relations on-demand** — at dieted levels `g2_context.relations` (≈4.3K inline) becomes
  `relations_ref`: executable `trace_sbd_toe_graph` `{lens, anchor}` calls whose union is a
  proven superset of the elided edges (verified by real execution in tests; no IRI leakage;
  ids only). `include_relations: true` restores inline. Two orphan edges in the published
  bundle v1.5.0 (`ACM-SLG-005/006` in relations.jsonl without entities in mechanisms.json)
  are kept inline verbatim in `residual_relations` — never silent, data untouched.
- **`sbd://toe/codegen-instructions/{mode}` MCP resource** — static per-mode
  `llm_codegen_instructions` + `security_rationale_template` (byte-identical to the
  `full` inline content) referenced by `codegen_instructions_ref` at dieted levels;
  also carries the `detail_encoding` legend.
- **Context-reuse workflow** — grounded-codegen guide and plugin skill now instruct:
  one call per task (deterministic), loop against the received context, deepen via
  `detail:"minimal"` or targeted `consult_security_requirements` (measured ≈3K ≈16% of
  full); `repeat_call_hint` (54 tokens) added to dieted outputs.
- **Payload budget gates** — per-section vitest budgets on two fixed baseline fixtures;
  hard totals: standard ≤6,500/8,500 (epic), minimal ≤5,800/8,000 and ultrathin
  ≤3,870/4,840 (fixed by measurement, operator-ratified 2026-07-05).

### Unchanged

- `consumed-bundle.json` (formal release v1.5.0, sha256-pinned) — the diet is
  serialization only, never data. Deterministic activation core untouched.
- All other tools; offline/`npx` operation; stable `0.10.x` line.

## 0.20.0-beta.1 — 2026-06-29

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.x`) is unchanged. Experimental; **not citable** — excluded from the scientific
record per `PROGRAMME-PRESERVATION-PROTOCOL.md`.

### Added — SPARQL graph-query capability (v2 engine R&D)

- **`trace_sbd_toe_graph`** — a new tool exposing curated multi-hop traversals over the
  AppSec Core v1 relation graph, served by an embedded SPARQL engine (Oxigraph/WASM).
  Three lenses: `slice_implementation` (slice → control objectives → mechanisms/practices),
  `objective_realization` (objective → mechanisms/practices), `mechanism_provenance`
  (mechanism/practice → objectives → slices). Deterministic (`ORDER BY`) and
  coverage-preserving (total + cursor); output is entity ids — internal IRIs never leak.
- Internal serving layer: `src/serving/rdf/projection.ts` (bundle → RDF triples,
  provisional local IRI scheme) and `src/serving/rdf/graph-store.ts` (Oxigraph wrapper
  enforcing `ORDER BY` + coverage paging).
- Adds the `oxigraph` (WASM) dependency — no native binaries; `npx`/offline preserved.

### Unchanged

- **Additive only.** Every existing tool's contract and output is identical to the stable
  line; `consumed-bundle.json` (the served data) is unchanged. New engine, constant data.

> The IRI scheme is **provisional/local**; canonical IRIs are an upstream (ontology)
> decision required before any graduation of this line to stable.
## 0.11.0 — 2026-08-31 (prepared — tag v0.11.0 only after the beta line absorbs, per G-mp1a)

**Minor** — the MP1 selection operation lands in the serving layer (new tool), closing the
four Axis-H defects (ciclo MP1, P2; gate G-mp1a). Served bundle unchanged: formal KG
`v1.7.0` (sha256 `29156b86…fb9a`, contract v1.14, Manual v1.7.1).

### Axis H — before / after (oracle v1 untouched)

| | 0.10.4 (baseline) | **0.11.0** |
|---|---|---|
| Verdicts | 1 PASS · 3 PART · 6 FAIL | **10 PASS · 0 PART · 0 FAIL** |
| prepare coverage (avg) | 41 % | **100 %** (strict precision 100 % — 0 must-NOT selected) |
| Negative case (GC-09) | PASS | PASS (`needs_clarification`, 0 requirements) |

P2 landed the engine at 6 PASS · 4 PART · 0 FAIL; P3 (lead's post-P2 rule decisions,
same day) closed the remaining four via NAMED, declared rules — final record
`docs/acceptance-runs/2026-08-31-p3-axis-h-selection-v0.11.0.md`. The oracle was never
edited and nothing was tuned to it: every change is a declared serving rule.

### Added — P3: named selection rules (post-P2 lead decisions, 2026-08-31)

- **R1 `R1:principal-nao-humano`** (GC-07): the `agents` concern also selects, as a
  named rule declared in each item's `selection_trace`, the non-human-principal set
  {ACC-002, AUT-006, ENC-006} ∪ {DEP-011, DEP-013, DEP-014} — the agent is a principal
  (ARC-015: least privilege for agents).
- **R2 `R2:narrowing-de-sinais-SES`** (GC-02): SES-* resolves by signal narrowing —
  without user-session/login/token signals in the task the SES category leaves to
  `narrowed_out` with a declared reason; with them (GC-01, GC-08) it stays. The
  loader's `concernsMap` (`auth → [AUT, ACC, SES]`) is untouched this cycle (data lane
  annotated for future loader work). Fixture effect: −8 citations each (SES-001..008),
  snapshots regenerated, `citationIds` 112→104 / 151→143.
- **Missing signals**: `deployment` also activates the base DST category (GC-03
  DST-006 — deploy only via validated pipeline); `mtls` carries cryptographic-material
  management → `secrets` (GC-10 CFG-006); `message queue` integration carries
  critical-event logging → `logging` (GC-10 LOG-001).
- **Scope gate: one signal = one surface.** The decomposition gate now counts
  `decompositionFamilies` — the slice families of each signal's PRIMARY concern —
  instead of all activated families: supporting concerns of the same signal
  (mtls→secrets, mensageria→logging) activate categories but are not new surfaces.
  `sliceFamilies` (grounding) is untouched; genuinely multi-surface asks still
  decompose (existing negatives all green).

### Added — `select_sbd_toe_requirements` (MP1, consultive L3, OSS)

- Single selection engine `src/serving/selection.ts`: eligibility from the PUBLISHED
  `requirement_selection_model` (baseline cap. 02 `type: base` by level ∪ domain chapters
  activated by context — changed_files via the review-scope path map, technologies/stack,
  concern-derived chapters ⊕ overlay `extend`; `replace` awaits ADR 0014), then
  deterministic narrowing into two DECLARED bands: `selected[]` (per-item
  `selection_trace`: source/trigger/score) and `narrowed_out[]` (grouped by category,
  with reason) — never silent. Paginated (G1). `prepare_sbd_toe_codegen_context` now
  consumes the engine (its `completeness_report.selection` declares
  eligible/selected/narrowed-out with an executable ref).
- Acceptance scenarios in the same change (factory rule): TC-F-11/12.

### Changed — scope gate (D1) + activators (D3) + lexicon role (D4)

- The "max 50 activated requirements" cap is GONE (a legitimate L2 task activates >50 by
  design). The gate now guards task scope — vague/multi-family asks still return
  `needs_clarification`/`needs_decomposition`, and a task with NO real signal (only the
  informational risk_level) is `needs_clarification` — and payload (diet + budgets).
- `exposure` and `data_sensitivity` stop being decorative: declared activators
  (internal/authenticated → auth+logging; public → +api/validation/architecture;
  personal/regulated → encryption+validation+logging; secrets → secrets), each with its
  own `activation_trace` source. `agents` heuristics (mandate/kill-switch/tool-call/
  autonomy) reach the stable line (beta parity); new audited PT/EN signals (mtls,
  mensageria/fila de mensagens, assinatura → integrity+encryption, imagem/image,
  spa/frontend, formulário de registo; terraform/ansible narrowed to iac).
- The concern lexicon is now ONE signal among seven — the reference-semantics composition
  is the engine (D4).

### Changed — teaching layer (R3, pre-release requirement, 2026-08-31)

- **`sbd://toe/agent-guide`** now teaches the selection operation: when to use
  `select_sbd_toe_requirements` vs `consult` vs `prepare` ("choosing between the three
  requirement surfaces"); the two-band semantics — `selected[]` is the recommendation,
  `narrowed_out[]` lists what was eligible and why it left, and *if you need something
  from there, call again with the missing signal*; `mode: "index"`; new rows in the
  question-type routing table and in "Interpreting tool output". No reference to the
  old max-50 scope-gate semantics anywhere in the teaching surface (scenario-guarded).
- **Skills/subagents** (`generate_sbd_toe_skill` + plugin SKILL.md): intent routing
  gains *"which requirements apply to this task?"* → `select`; the harnessed tool
  list ships the new tool; the non-harnessed path teaches the operation for connected
  clients. The historical s4 guard ("no variant mentions the codegen tool") was
  deliberately retired by R3 — the guard is now positive (variants teach selection).
- **`next[]` affordances**: `map_sbd_toe_applicability`, `consult_security_requirements`
  and `list_sbd_toe_chapters` now suggest `select_sbd_toe_requirements`; select already
  points back to `prepare` (codegen) and `consult` (detail).
- **TC-F-13** (capability ⇒ scenario): walks the taught path — reads the guide,
  selects for an API-keys task (SES narrowed with a teachable reason), re-calls with
  the session signal (SES ×8 recovered), asserts `next[]` suggests prepare+consult and
  that the old gate semantics is gone from the guide.
- Lexicon (Manual-anchored growth, per the cycle's anti-overfitting principle — never
  from an oracle case): PT aliases `sessão`/`sessões` → `session` (ch. 02 category SES).

### Changed — `consult_security_requirements`

- `mode: "index"` opt-in (G-mp1a decision 3, option c): per-category requirement index
  (ids + counts) with the same filters/totals; default mode byte-unchanged.
  Index-by-default stays flagged for a future major.

### Added — v2 token diet ported from the 0.20 beta line (byte-identical)

- `detail: full | standard | minimal | ultrathin` + `include_relations` on `prepare`,
  the `sbd://toe/codegen-instructions/{mode}` resource, golden snapshots, and the diet
  test suite (detail/minimal/ultrathin/caps-resource/reuse-hint/budget; the
  relations-ref suite stays beta-only — `relations_ref` names `trace_sbd_toe_graph`,
  which ships on the 0.20 line; on this line use `include_relations: true`, as the tool
  schema documents).
- **Stable payload ceilings fixed by measurement (P2)** — the MP1 selection summary adds
  ≈+50 tokens to `completeness_report`: totals `standard` fixture2 8.800 → **8.900**
  (measured 8.833), `minimal` 5.800 → **5.950** (5.850) and 8.100 → **8.200** (8.107);
  `rest` section budgets re-measured (980/985/1055). All other totals hold, including
  `standard` fixture1 ≤ 6.500. The beta re-ratifies its own ceilings when it absorbs P2.

### Verification

- `npm run check` green; **689/689** tests (engine + select + P3 rule suites; diet
  suite ported); full `eval:acceptance` (R3 record `2026-08-31-r3-*`): 117 scenarios,
  94 executed, **76 PASS · 18 PART · 0 FAIL · 23 SKIP — gate E PASS** (no regression);
  22/22 tools; Axis H re-run unchanged at **10 PASS / 0 / 0**.
- Stable payload ceilings hold with margin after R2 (measured P3): `standard` f2
  8.446 ≤ 8.900, `minimal` 5.463 ≤ 5.950 and 7.720 ≤ 8.200, `standard` f1 6.109 ≤ 6.500,
  ultrathin 3.684/4.581.

## 0.10.4 — 2026-08-30

**Patch** — formal KG release `v1.7.0` (D2 cycle close) + the G-b routing decision in the
serving layer. Additive on the tool surface (per-threat `associated_control_ids`,
`associated_controls_text`, `associated_control_ids_derivation`); no tool removed or reshaped.

Served bundle: **formal KG release `v1.7.0`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.7.0`, commit `894af32a85d6a50f648f10d8a643848e806e533e`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.7.0.zip`, sha256
**`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`**, fetched and
digest-verified against the release `.sha256`; `run_manifest.release = {stable, v1.7.0}`),
`consumer_contract_version` **v1.14** (§1.21), ontology `sbdtoe-ontology-v2.2`, **Manual
v1.7.1** @ `8e03454c`. Supersedes `v1.6.1` (0.10.3) and the dev-build v2.2 pin (#53).

### Changed — served knowledge (`v1.6.1` / dev-build v2.2 → `v1.7.0`)

- Curated requirement→control layer: 281 → **282 links** (GOV-013 gains its curated CAP
  secondary — Archon convergence 27/27; curated on surface 12 + 4). Requirements 256/27,
  EvidencePatterns 256/256, 20 controls unchanged.
- **Threats now carry structural control ids** (contract v1.14 §1.21, G-b decision 8):
  `associated_control_ids` (CTRL-* ids, chapter-grained derivation **declared per record**
  via `associated_control_ids_derivation`; 233/233 in this release) and
  `associated_controls_text` (the Manual's prose); `associated_controls` unchanged for
  compatibility. Served through `get_threat_landscape` — previously the surface carried
  only the prose field.

### Changed — threat routing (G-b decision 2, serving-layer fix)

- The **defining chapters** of the activated controls (`defining_chapter_ids`, published
  since contract v1.13) now count as in-scope in `get_threat_landscape`, and the ch.02
  suppression applies only to controls merely *catalogued* there: a control that DEFINES
  in ch.02 (C1 identity/auth, C2 data_protection, C3 dev tooling) brings the ch.02
  threats with it, with the control listed in `mitigated_by`. Post-fix scopes at L2:
  **auth 77 → 95** (+18 ch.02 catalogue threats), encryption 107, validation 72;
  logging (15) and iac unchanged — no ch.02-defining control. No-concern landscape
  unchanged (233).
- Acceptance criterion for TC-E-01/02 updated accordingly (both PASS: `mitigated_by` and
  `associated_control_ids` populated with resolving ids); TC-F-08 re-baselined to 282
  links / curated 12+4. Run record: `docs/acceptance-runs/2026-08-30-v0.10.4-acceptance.md`
  — 104 scenarios, 81 executed, **63 PASS · 18 PART · 0 FAIL · 23 SKIP, gate E PASS**.

## 0.10.3 — 2026-08-30

**Patch** — formal KG release `v1.6.1` (curated requirement→control layer v2) + the #49
serving/test changes. Additive on the tool surface (`filters` on `query_sbd_toe_entities`);
no tool removed or reshaped.

Served bundle: **formal KG release `v1.6.1`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.6.1`, commit `e9fc54f312829c632ecd50e2306bfa356e9e457c`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.6.1.zip`, sha256
**`df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b`**, fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`;
`run_manifest.release = {channel: stable, version: v1.6.1}`), `consumer_contract_version`
**v1.12** (§1.19 curated layer v2), **Manual v1.7.1** @ `8e03454c` (mini-site aligned to
0.10.2; illustrative `REQ-NNN` → `EX-REQ-NNN`), ontology `ontology-v1.1-fair-baseline`.
Supersedes `v1.6.0` (0.10.2).

### Changed — served knowledge (`v1.6.0` → `v1.6.1`)

- **Curated requirement→control layer v2** (Archon opinion ratified 2026-08-30, applied by
  curated edit, no rebuild): `requirement_control_links` 263 → **265**, **0 requirements
  without a link**; 12 links removed / 14 added, each new link carrying an additive
  `curation {curator: archon-2026-08-29, rationale}` key (tolerated by the loader — served
  fields unchanged). Re-targets served: AUT-007/AUT-008 → identity control, AUT-010 →
  monitoring, CNT-003/005/006/009 → images, ENC-007 → secrets, GOV-009 → suppliers,
  REQ-001 → classification; INT-008 → suppliers (+ segmentation); ARC-013 + segmentation,
  ARC-001 + architecture. 10 EvidencePatterns follow (`maps_to_control_id`); overlay
  mappings 6382 → 6457; cross-layer referrals 7240 → 7315. Requirements 256/27 and
  EvidencePatterns 256/256 unchanged.
- Manual v1.7.1: content-only wave — the 25 illustrative `REQ-NNN` example ids became
  `EX-REQ-NNN` (never resolve, no citation note), and the mini-site `020-assets/mcp/`
  describes 0.10.2 as published (content-lag lifted).

### Acceptance regression (`npm run eval:acceptance`, this bundle)

- See `docs/acceptance-runs/2026-08-30-v0.10.3-acceptance.md`. Axis E criterion revised by
  the programme lead: the structural mitigation link is `mitigated_by` (must be populated,
  ids must resolve); the substrate's textual `associated_controls` is passed through and
  reported as PART, never as a serving FAIL. New TC-F-08 checks the curated layer v2 (265
  links, 0 gaps, the AUT re-targets, `curation` tolerated).

### Record corrections (Manual v1.7.1 handover, verified live on 0.10.2)

- AI Act overlay: **661** mappings (earlier handoffs said 651); the server exposes **3**
  prompts (`setup_sbd_toe_agent`, `ask_sbd_toe_manual`, `prepare_grounded_codegen`), not 2;
  the npm `beta` dist-tag is **0.20.0-beta.3** (not beta.2).

### Added — acceptance regression runner (merged in #49)

- **`npm run eval:acceptance`** (`scripts/run-acceptance-scenarios.mjs` + `scripts/acceptance/`):
  executes the **94 acceptance scenarios** of
  `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md` (axes A–E) against the real
  stdio server on the pinned bundle, one verdict per scenario (PASS / PART / FAIL / SKIP with
  owner `mcp`·`graph`·`roadmap`), Axis E as the promotion gate (exit 1 on FAIL), and a
  **coverage** section (scenarios executed, tools exercised vs exposed, ACs covered, roles ×
  phases). **Axis F** (7 scenarios) covers the six 0.10.0 tools that post-date the June
  elicitation plus the G1 pagination gate. Run records live in `docs/acceptance-runs/`.
- First run on `0.10.2` / KG `v1.6.0`: 101 scenarios, 78 executed (23 SKIP: 21 commercial
  ACs + 2 needing a client LLM), **58 PASS · 18 PART · 2 FAIL**; **21/21 tools exercised**.
  The two FAILs (TC-E-01/02) are data-rooted: `associated_controls` on threats is empty for
  ch.12 and textual elsewhere in the bundle (routed to Codex); `mitigated_by` is populated
  structurally on every threat.

### Fixed — `query_sbd_toe_entities` filters (found by TC-A-13)

- `entityType` and `riskLevel` filters returned **0 for every query**: they matched the
  Algolia-era record fields `entity_type` / `risk_levels`, which no chunk of the current
  substrate carries. They now match what the substrate publishes — entity types via the
  chunk's entity mentions (`Requirement | UserStory | Metric | Threat`, aliases accepted) and
  the risk facet `filter_tags.risk_level` — over the full ranked retrieval, and the response
  declares `filters {applied, retrieval_pool, matched, pool_with_risk_facet, note}` (chunks
  without a risk facet are not returned — declared, never silent). `chapterId` accepts the
  bundle id or its numeric prefix. Tool schema documents the vocabulary.

### Removed — Algolia-era snapshot-cache paths (dead at runtime)

- `structured-tools.ts` (`list_chapters`, `query_entities`, `chapter_brief`,
  `map_applicability`) and `plan-repo-governance.ts` carried a `SnapshotCache` branch that
  the server never reached (runtime calls pass no cache). Removed, together with the ~25
  unit tests that only exercised those branches with `chapter_bundle` /
  `practice_assignment` / `risk_levels` fixtures; replaced by tests over the runtime bundle.
  Suite: 532 tests.

## 0.10.2 — 2026-08-29

**Patch** — served-bundle alignment + declared-gap serving. Additive on the tool
surface (new response fields, one new `concerns` value); no tool removed or reshaped.

Served bundle: **formal KG release `v1.6.0`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`, commit `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.6.0.zip`, sha256
**`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`**, fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`;
`run_manifest.release = {channel: stable, version: v1.6.0}`), `consumer_contract_version`
**v1.11** (§1.19), **Manual v1.7.0** @ `d5c2586a` (remote `SbD-ToE/sbd-toe-manual`), ontology
`ontology-v1.1-fair-baseline` (unchanged). `source: release` — supersedes the formal `v1.5.0`
pin of 0.10.0/0.10.1. Lineage on this line (same day, both dev-builds, merged in #45 / #46):
`kg-v1-manual-v1.6.7-aligned-2026-08-29` (`762ccaaf`, sha256 `a66c3245…5276`, contract v1.10)
→ `kg-v1-manual-v1.7.0-aligned-2026-08-29` (`737efe20`, sha256 `2c27f4eb…64fa`, contract v1.11);
`v1.6.0` is byte-identical to the latter in `data/publish` — the only difference in the
consumed files is the `release` block of `run_manifest.json`.

### Changed — served knowledge (dev-build 2026-08-29 v1.6.7 → v1.7.0, contract v1.11)

- **Manual v1.7.0**: **OPS-015** «Sinais contínuos de saúde e disponibilidade operacional»
  (L2/L3, chapter 12) → `requirements.json` 255 → **256** (27 categories); EvidencePatterns
  256 (coverage 256/256). Per level: L1 120, L2 231, L3 256.
- **Curated requirement→control layer** (`requirement_control_links` 242 → **263**,
  `--preserve-existing`): the 20 requirements previously without a control link (AGN ×4,
  ARC-014/015, DEP-011…014, DPL-010/011, OPS-011…014, GOV-013/014, THR-008, VAL-008) and
  OPS-015 are now linked — REQ-AGN-001…004 → `CTRL-governance-classificacao-e-governacao-por-risco-*`
  via the curated `domain_mapping.AGN: [governance, identity]` (programme-lead judgement,
  not Manual-derived). `coverage_gaps.requirements_without_control_link` is therefore **0**
  at every level — the declaration machinery stays (data-driven).
- **Legacy citations corrected upstream**: 0 unresolvable `REQ-[A-Z]{3}-NNN` mentions and
  0 `EX-` entries in `chunk_entity_mentions` → **0 declared legacy-citation gaps**. The 25
  illustrative `REQ-NNN` example mentions (20 ids, 8 example docs) and non-requirement
  tokens captured by the `<CAT>-NNN` shape (`CWE-`, `SHA-256`, …) are **informative, not
  gaps**: `query_sbd_toe_entities` / `resolve_entities` surface them as `citation_note` /
  `meta.citation_note` (`status: "informative"`) while keeping their normal path — never
  aliased, never silent.
- `00-fundamentos/macro-processos.md` (new, 82 chunks, role `addon`) is served in the
  **`guide`** and `consult` profiles (MP1–MP5 are not entities, by declaration).

### Changed — served knowledge (formal `v1.5.0` → dev-build 2026-08-29 v1.6.7; superseded above)

### Changed — served knowledge (formal `v1.5.0` → dev-build 2026-08-29)

- **REQ-AGN-001…004 served** — the AI-agent / automation governance catalogue (versioned
  mandate, autonomy A0–A4, kill-switch, intent declaration; Manual
  `02-requisitos-seguranca/addon/09-governaca-automatismos.md`). `requirements.json`
  251 → **255**, categories 26 → **27** (`AGN`, chapter 02); EvidencePatterns 251 → **255**
  (coverage 255/255). Per level: L1 118 → 120, L2 226 → 230, L3 251 → 255. Closes the
  Pontifex side of `agentic/briefs/2026-08-02-orchestrator-to-pontifex-req-agn-surface-gap.md`.
- Collateral of the dev-build line (contract v1.9, 2026-06-18): the regulatory overlay now
  indexes **AI Act** and **ENISA-CSA** (`external_frameworks` 4 → 6; overlay mappings 6360;
  cross-layer referrals 7218). The 0.10.0 note "AI Act cross-check is not indexed" no
  longer holds.
- Legacy `REQ-<CAT>-NNN` citations of base requirements no longer resolve by substring
  accident to requirements with another meaning (contract §1.18) — declared instead, below.

### Added — requirement-id grammar (consumer contract v1.10 §1.18)

- `src/serving/requirement-id.ts` — the single serving-side source of the grammar
  `^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$` (**fullmatch**; never search, never prefix
  normalisation). `category` = the segment before the number (`AGN`, never `REQ`).
  Audit: no site in this server assumed the old `^[A-Z]{3}-\d{3}$`; the loader now flags on
  stderr (never drops, never rewrites) any published id outside the grammar. Mandatory
  cases under test: `REQ-AGN-001` ✓, `AUT-003` ✓, `EX-AUT-003` ✗ (the Manual's illustrative
  `EX-` prefix — never resolves to `AUT-003`), `REQ-AUTH-001` ✗.
- `consult_security_requirements`: new `concerns` value **`agents`** → category `AGN`
  (consult only; `get_threat_landscape` has no domain chapter for it).

### Added — declared gaps (never silent; Codex handover 2026-08-29)

- **(a) Requirements without a control link.** `consult_security_requirements` returns
  `coverage_gaps.requirements_without_control_link` `{count, requirement_ids, note}` and a
  `REQUIREMENT_WITHOUT_CONTROL_LINK` rule-trace line. The 20 requirements with no
  `requirement_control_links` entry (AGN ×4, ARC-014/015, DEP-011…014, DPL-010/011,
  OPS-011…014, GOV-013/014, THR-008, VAL-008) are served with the absence declared — not
  omitted, no controls invented (link layer of 2026-04-07; refresh is a Codex decision).
- **(b) Legacy citations.** `query_sbd_toe_entities(query=<id>)` and
  `resolve_entities(requirement, {requirement_id})` answer a cited-but-unpublished
  requirement id with a **declared gap** (`match: "declared_gap"` / `meta.declared_gap`,
  with the citing chunk/document ids). The 20 legacy `REQ-<CAT>-NNN` citations (16 ids,
  6 Manual files) carry the serving phrase «citação legada não resolvível (finding
  editorial em curso)» — never «requisito inexistente», never a silent semantic fallback.
  The 21st (`REQ-AC-010`) is not present in this bundle's `chunk_entity_mentions`, so
  there is nothing to declare for it until the KG surfaces it.
- `assets/agent-guide.md`: requirement identifier convention (both forms, category rule,
  `EX-` illustrative prefix, legacy-citation rule), the `agents` concern, and
  interpretation rows for `coverage_gaps` / `declared_gap` / `citation_note`.

### Changed — toolchain hygiene (devDependencies only, no package impact)

- Dependabot alerts on the test toolchain: `vitest` 1.6.1 → **4.1.9**, `@vitest/coverage-v8`
  and `@vitest/ui` 1.6.1 → **4.1.9** (Dependabot #39/#41/#42), pulling `vite` 8.2.2 and
  `postcss` 8.5.26 through the tree; `esbuild` and `brace-expansion` (the other two alerts) are no
  longer in the dependency tree at all (vite 8 builds on rolldown; `test-exclude`/`minimatch` dropped).
  `npm audit`: 0 vulnerabilities. `npm test` / `npm run check` green; `npm pack --dry-run`
  file list identical before/after — toolchain hygiene, no impact on the published package.

### Governance

- No interim AGN gap declaration had been implemented in the served code (brief 02-08
  item 1); nothing to lift — the closure is the published data itself.
- Not a freeze event; `FREEZE-REGISTRY.md` unchanged. Pending upstream before a formal
  release: KG formal release (re-pin `source: release`) + `mcp-stable` move (Codex /
  programme lead); Manual correction of the legacy citations, then Codex recompile.

## 0.10.1 — 2026-06-25

**Patch** — packaging, distribution, and repository-metadata changes only. No
functional, API, or served-bundle changes; the MCP tool surface is identical to
0.10.0.

### Fixed

- **Broken npm tarball on clean install (`ERR_MODULE_NOT_FOUND`).** The `files`
  allowlist in `package.json` enumerated `dist/` outputs file-by-file and omitted
  `dist/version-info.js` (plus its `.d.ts` / `.js.map`), which `dist/index.js`
  imports. As a result `0.9.0` and `0.10.0` failed to start from a clean
  `npx -y @shiftleftpt/sbd-toe-mcp` pull (the file was only present in cached
  builds). Added the three `dist/version-info.*` entries to `files`; verified via
  `npm pack` that the tarball now contains them. `0.7.7` was unaffected and
  remained the last known-good published version.

### Changed

- Repository relocated to `github.com/SbD-ToE/sbd-toe-mcp` (was
  `Shiftleftpt/sbd-toe-mcp-poc`). Updated `repository`/`homepage`/`bugs` in
  `package.json`, the GitHub Releases link in `README.md`, and
  `repository-code`/`url` in `CITATION.cff`. The npm package name
  (`@shiftleftpt/sbd-toe-mcp`) is unchanged.

### Added

- **Distribution wrappers (zero-config install).** A Claude Code plugin
  (`sbd-toe-plugin/` + `.claude-plugin/marketplace.json`) and an OpenAI Codex CLI
  config example (`examples/codex-config.toml`). These wrap the standard,
  unchanged `@shiftleftpt/sbd-toe-mcp` server — no new server code, no change to
  the served bundle or tool surface.
- **`FREEZE-REGISTRY.md`** at the repo root, satisfying
  `PROGRAMME-PRESERVATION-PROTOCOL.md` §5 (the file was previously absent).
  AI-prepared skeleton, pending human verification; unverified tag→event mappings
  are marked `TODO — verify`, and no hashes/DOIs/tags were invented.

> Note: published `0.10.0` is immutable per `PROGRAMME-PRESERVATION-PROTOCOL.md`
> (Principle 1 / Rule 3); this is a fix-forward patch, not a republish of 0.10.0.

## 0.10.0 — 2026-06-17

**Minor** bump: 7 new tools + a changed `generate_sbd_toe_skill` schema + a `next`
advisory band retrofitted onto the legacy tools. Additive / backward-compatible on the
existing tools' core contract ⇒ minor.

Served bundle: **formal KG release `v1.5.0`** (GitHub Release
`Shiftleftpt/sbd-toe-knowledge-graph@v1.5.0`, sha256 `feaa0155…7294`,
`consumer_contract_version` v1.8, **Manual v1.6.4** @ `09b20f6f`, ontology
`ontology-v1.1-fair-baseline`).

### Added — Implementation view ("how do I run this" family)

- **`get_sbd_toe_chapter_implementation_checklist`** — retrieval-grounded canon/20
  "how to implement chapter NN" guidance; coverage-preserving, cites chunk ids.
- **`get_sbd_toe_operating_model`** — RACI / decision-rights / governance cadences /
  org-model from the rollout playbook; retrieval-grounded prose.
- **`plan_sbd_toe_rollout`** — phased rollout roadmap: the 8 canonical lifecycle phases
  mapped to manual chapters. Phase-ordered MVP; the dependency DAG is declared-deferred.
- **`assess_sbd_toe_implementation`** — stateless KPI self-report vs published per-level
  thresholds (`metrics.json`) → posture + gaps. An applicable KPI with no value is
  `not_reported`, never a pass; thresholds cited, never invented.

Together with `get_guide_by_role` these are the implementation view: what to do (role/DoD)
· how to implement (checklist) · who governs (operating model) · in what order (rollout)
· how compliant am I (assess).

### Added — Verification reference

- **`get_sbd_toe_verification_matrix`** — the EXPECTED side of verification: per
  requirement/control at a risk level, the validation method + expected evidence +
  EvidencePattern reference, cited per row. EvidencePatterns are first-class published
  entities — full coverage (L1 118, L2 226, L3 251 requirements covered; 0 gaps,
  0 unhinted). Coverage-preserving.

### Added — Regulatory lens

- **`map_sbd_toe_regulatory_activation`** — reverse-of-provenance lens: framework
  (DORA / NIS2 / CRA / RGPD) → which manual chapters it activates, grouped with mapping +
  obligation counts (coverage-preserving). DORA: 14 chapters, 1430 mappings.

### Added — Manual answering

- **`answer_sbd_toe_manual`** — retrieves grounded manual context and requests the final
  answer from the client's model via MCP sampling; falls back to formatted retrieval when
  the client lacks sampling support.

### Changed — Role-skill / sub-agent serving (RF-S)

- **`generate_sbd_toe_skill` schema extended**: `role`, `format` (`skill` | `subagent`),
  `flavour` (`harnessed` | `skilled`), `risk_level`, `phase`, `include_detail`.
  - **harnessed** sub-agent grants `mcp__sbd-toe__*` (queries live; embedded slice = index).
  - **skilled** sub-agent carries no MCP tools, embeds the frozen slice (DoD inline).
  - Coverage is declared (chapters / assignments / user stories / checklist items).
- New resources `sbd://toe/skill/{role}` and `sbd://toe/subagent/{role}`.

### Changed — Protocol envelope (`next` advisory band, RF-H)

- Tool responses carry a two-band **`next`** advisory band — ≤3 adjacent tools the caller
  likely needs next, each `kind: "semantic" | "structural"`, referencing only real
  tools/resources. Emitted by all new tools and retrofitted onto the legacy tools
  (`consult_security_requirements`, `get_threat_landscape`, `list_sbd_toe_chapters`,
  `map_sbd_toe_applicability`, `get_sbd_toe_chapter_brief`, `resolve_entities`,
  `plan_sbd_toe_repo_governance`, `map_sbd_toe_review_scope`, `generate_sbd_toe_skill`).
  Advisory only — never changes a tool's primary result shape.

### Fixed

- **`get_threat_landscape` base-concern routing** — base concerns
  (`auth` / `access` / `encryption` / `validation` / `session`) previously collapsed onto
  chapter 02 (their requirements' catalog home), surfacing the requirements-process
  meta-threats (`MT-021…038`) instead of the domain threats. Now routed by the concern's
  domain (`CONCERN_TO_DOMAIN_CHAPTER` + the resolved controls' chapters); chapter 02 is
  surfaced only for the explicit `requirements` concern. (`auth` → 144 domain threats,
  no `MT-021…038`.)
- `get_guide_by_role` now sharpens user stories by risk level via the assignment's
  proportionality (L1 ⊂ L3), and surfaces the level-specific obligation.
- `plan_sbd_toe_repo_governance` filters requirement-first (`applicable_levels`) instead
  of a hardcoded chapter table; control/artifact = floor.
- `map_sbd_toe_review_scope` path table extended beyond GitHub (containers/k8s/helm → 09,
  Terraform/Bicep → 08, Python deps → 05, CI → 07/10/11, `.env` → 06); unmapped paths
  fall to the foundation guardrail via an explicit pattern.
- `get_threat_landscape` passes through the substrate's `associated_controls`
  (previously hard-coded `[]`).
- `inspect_sbd_toe_retrieval` / response shaping: consumer-aware bounding, honours `topK`
  (≈17 MB → ≈50 KB at `topK=5`); no silent truncation.
- `list_sbd_toe_chapters` returns per-level `applicability {L1,L2,L3}` + `minLevel`.

### Provenance

- `sbd://toe/version` now exposes the served knowledge provenance: server version,
  **Manual `tag`/`version` (real — v1.6.4, read from `run_manifest.manual`, not the KG
  compiler version)**, KG `release_tag` + sha256 + `consumer_contract_version`, and
  ontology tag/commit — read live from the `consumed-bundle.json` pin, never invented.
- Pin: `consumed-bundle.json` → **formal release `v1.5.0`** (`source: release`,
  `release_ref: Shiftleftpt/sbd-toe-knowledge-graph@v1.5.0`), sha256
  `feaa0155b64d78fe529d805c6e17430fb3ce9fe1c5b5900eb6e267e2fa077294`, contract v1.8 —
  fetched + digest-verified from the GitHub Release (`sync-bundle --from-release`), not a
  local dev snapshot.

### Notes

- AI Act cross-check is **not** indexed in this bundle (RGPD / NIS2 / DORA / CRA are).

## 0.9.0 — 2026-05-21

### Added — KG / runtime surface

- Consumes the AppSec Core V1 runtime surface (`data/publish/runtime/v1/`): `slices.json`, `control_objectives.json`, `mechanisms.json`, `practices.json`, `artifacts.json`, `relations.jsonl`, `manual_rastreabilidade.jsonl`, `v1_manifest.json`.
- Consumes the regulatory overlay surface (`data/publish/overlay/`): `external_frameworks.json`, `external_obligations.json`, `overlay_playbooks.json`, `overlay_mappings.jsonl`, `framework_overlay_index.json`.
- Pinned KG state: `master` @ `5c02010358d4afa5fc0b4aae5a026d5da25aa796` (baseline tag `kg-v1-cycle-b-manual-ref-2026-05-14`).
- `checkout-backend` extended to copy declared overlay artefacts (filter via upstream `publication_manifest.json`), expose `runtime/v1` and `overlay` status in `BackendCheckout`, and run a post-copy `sanitizePrivateAbsolutePaths` pass over the published runtime/indexes/overlay text artefacts.

### Added — Deterministic loaders

- `src/tools/g2-runtime-loader.ts`: caches the AppSec Core v1 surface with consistency checks against `v1_manifest.json` (entity counts, relation counts, file sha256) and exposes `getV1EntityDisplayName(entityId)` that returns `undefined` when `manual_rastreabilidade.jsonl` did not publish a name (no name invention).
- `src/tools/regulatory-overlay-loader.ts`: caches frameworks/obligations/mappings/playbooks with `frameworksByShortCode` lookup (case-insensitive). Returns `status: "absent"` when the overlay is not published, `OverlayAssetMissingError` when partially present.
- Both loaders tolerate legitimate upstream patterns: nullable `subject_type`/`object_type` for `objective_*` relations and empty `obligation_id` for `playbook_*` mapping types.

### Added — MCP tool surface

- New tool **`prepare_sbd_toe_codegen_context`** — prepares deterministic, bite-sized grounded context for a downstream LLM to generate, review or test-plan code. **Does not generate code and does not edit files.** Returns one of four statuses: `ready_for_codegen` | `needs_clarification` | `needs_decomposition` | `unsupported_scope`. On `ready_for_codegen` the response carries `activation_trace`, `activated_scope`, `g2_context`, `manual_grounding`, `regulatory_overlay`, `citation_map`, `completeness_report`, `llm_codegen_instructions` and `security_rationale_template`.
- `resolve_entities` extended with **10 new record types**: `appsec_slice`, `control_objective`, `mechanism`, `appsec_practice`, `appsec_artifact`, `appsec_relation` (runtime v1) and `regulatory_framework`, `regulatory_obligation`, `regulatory_mapping`, `regulatory_playbook` (overlay). Per-source provenance: runtime v0 → `data/publish/runtime/*.json`; runtime v1 → `data/publish/runtime/v1/*`; overlay → `data/publish/overlay/*` (or `... (absent)` when not published — never throws for overlay).

### Added — Semantic disambiguation (WP6)

- Activation engine carries deterministic per-entry `score` in `[0,1]` and exposes the following sources in `activation_trace`: `explicit_concern` (1.0), `task_term` (0.8), `compound_term` (0.7), `alias_expansion` (0.6 via `expandQueryWithAliases`), `intent_keyword` (0.5 via whole-word matcher; the gateway substring matcher is intentionally NOT reused for codegen), `changed_file` (0.5), `risk_level` (1.0).
- Compound phrases cover canonical multi-domain asks: `endpoint seguro`/`secure endpoint`, `segredo hardcoded`/`hardcoded secret`, `pipeline release`/`release pipeline`, `trust boundary`, `service to service`, etc.
- Evidence patterns are ranked by deterministic relevance (direct control match = 1.0, active requirement = 0.7, derived control = 0.5) and capped at 25 patterns to keep the LLM context manageable. Capped patterns appear in `debug.rejected_candidates` when `debug=true`.

### Added — Agent guidance

- New MCP resource `sbd://toe/grounded-codegen-guide` exposing the canonical agent guide at `prompts/sbd-toe-grounded-codegen.md`.
- New MCP prompt `prepare_grounded_codegen` that bundles the guide with a user task and instructs the agent to call `prepare_sbd_toe_codegen_context` before producing code. The guide enforces: cite `citation_map` IDs, fill `security_rationale_template` (decisions/validations/expected_evidence/residual_risk), distinguish code/tests/evidence, never declare regulatory compliance, never invent identifiers, never treat AI-generated code as evidence, route `needs_clarification`/`needs_decomposition`/`unsupported_scope` to user dialog instead of silent guessing.

### Hardened — Release artefact hygiene

- `npm run check:npm-package` now scans every published text artefact under `data/publish/**` and `data/reports/**` for absolute build-machine paths (`/Users/`, `/home/`, `/Volumes/`). Banned prefixes now include `data/upstream/` and `data/publish/overlay/p2v2_round_1/`.
- `package-release-lib.mjs` runs a recursive `scanBundleForPrivatePaths` over the entire release bundle (with an allowlist for placeholder strings such as `<absolute-path-to-repo>` and `<private>`). The release script aborts before tar/zip if leaks are detected.
- `shouldExcludeFromBundle` filters `.DS_Store`, `Thumbs.db`, `._*`, `.AppleDouble`, `.LSOverride` from the release tarball.
- Pre-existing leak fixed: `docs/MCP-QUALITATIVE-EVAL-PLAN.md` now references `<absolute-path-to-repo>/dist/index.js` instead of the author's local path.

### Notes

- This is the MVP G2 release. The full Paper 5 evaluation programme is out of scope.
- The tool's semantic activation is deterministic at WP6 (lexicon + alias expansion + whole-word intents). Probabilistic / learned scoring is not part of this release.
- The shipped npm package is ~4.19 MB (runtime/v1 ~1.3 MB, overlay ~4.6 MB raw, compressed in tarball).

## 0.8.0 — earlier

See git history (`git log v0.7.x..v0.8.0`).
