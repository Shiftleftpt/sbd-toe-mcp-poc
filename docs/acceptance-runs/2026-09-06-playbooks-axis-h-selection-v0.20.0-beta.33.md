# Axis H — requirement-selection vs golden oracle — 2026-09-06-playbooks — @shiftleftpt/sbd-toe-mcp@0.20.0-beta.33

Oracle: `golden-selection-cases.md` **v1 (closed 2026-08-31, ratified in block)** (programme lead's; read-only). Bundle: **v1.11.0** (`release`, contract v1.17). Measurement only — **not part of the promotion gate**. "Discutíveis" lines are neutral; GC-01 carries the oracle's contamination note. Verdict measured on `prepare` (the selection instrument); `consult` (task-derived equivalent context, mapping documented in `scripts/acceptance/axis-h.mjs`) reported alongside.

## Tabela — 10 casos × 2 tools × 3 métricas

| Caso | Nível | Verdict | prepare cob. | prepare prec. | prepare exc. | consult cob. | consult prec. | consult exc. |
|---|---|---|---|---|---|---|---|---|
| GC-01 | L2 | PASS | 100% | 100% | 46 | 69% | 100% | 18 |
| GC-02 | L3 | PASS | 100% | 100% | 61 | 82% | 84% | 24 |
| GC-03 | L2 | PASS | 100% | 100% | 13 | 100% | 68% | 149 |
| GC-04 | L2 | PASS | 100% | 100% | 11 | 100% | 100% | 11 |
| GC-05 | L2 | PASS | 100% | 100% | 55 | 16% | 100% | 4 |
| GC-06 | L3 | PASS | 100% | 100% | 43 | 100% | 100% | 46 |
| GC-07 | L3 | PASS | 100% | 100% | 11 | 22% | 100% | 0 |
| GC-08 | L1 | PASS | 100% | 100% | 7 | 100% | 100% | 1 |
| GC-09 | — | PASS | 100% | 100% | 0 | n/a | n/a | n/a |
| GC-10 | L2 | PASS | 100% | 100% | 29 | 100% | 100% | 22 |

Verdicts: **10 PASS · 0 PART · 0 FAIL**. Médias (prepare): cobertura 100%, precisão-estrita 100%.

## Braço DECLARATIVO (0.20.0-beta.21) — as mesmas 10 situações, expressas por declarações

Verdicts: **6 PASS · 4 PART · 0 FAIL** (braço `discover` acima: 10/0/0). Expectativas do oráculo intocadas; muda só a FORMA de pedir.

| Caso | Verdict (discover) | Verdict (declarativo) | cob. discover | cob. declarativo | prec. discover | prec. declarativo |
|---|---|---|---|---|---|---|
| GC-01 | PASS | PART | 100% | 90% | 100% | 100% |
| GC-02 | PASS | PART | 100% | 95% | 100% | 89% |
| GC-03 | PASS | PART | 100% | 55% | 100% | 50% |
| GC-04 | PASS | PASS | 100% | 100% | 100% | 100% |
| GC-05 | PASS | PART | 100% | 79% | 100% | 100% |
| GC-06 | PASS | PASS | 100% | 100% | 100% | 100% |
| GC-07 | PASS | PASS | 100% | 100% | 100% | 100% |
| GC-08 | PASS | PASS | 100% | 100% | 100% | 100% |
| GC-09 | PASS | PASS | 100% | 100% | 100% | 100% |
| GC-10 | PASS | PASS | 100% | 100% | 100% | 100% |

## Faltas, violações e excessos por caso

### GC-01 — Upload de ficheiros com autenticação e RBAC (⚠ caso contaminado — nota do oráculo)
- oráculo: must-have 29, discutíveis 4, must-NOT 116 · prepare status `ready_for_codegen`, seleccionados 79
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ACC-003, ACC-004, ACC-007, ACC-010, API-002, API-004, API-006, API-007, AUT-002, AUT-004, AUT-005, AUT-007, AUT-010, ENC-003, ENC-004, ENC-006, ENC-007, ENC-008, ERR-003, ERR-004, ERR-005, ERR-006, ERR-007, FIL-001, FIL-002, FIL-003, FIL-004, FIL-005, FIL-006, FIL-007, FIL-008, LOG-004, LOG-005, LOG-006, LOG-007, LOG-008, LOG-009, PRI-001, PRI-002, PRI-003, PRI-004, PRI-005, SES-005, SES-007, VAL-007, VAL-008
- discutíveis seleccionados (neutros): AUT-001, AUT-008, SES-008, VAL-003
- consult: faltas 9 [API-001, API-003, API-005, ENC-001, ENC-002, ENC-005, LOG-001, LOG-002, LOG-003], violações 0 []
- lacuna registada no oráculo: tratamento de ficheiros (tipo/magic bytes, tamanho, anti-malware, armazenamento, nomes) — sem categoria no catálogo
- **transição lacuna → coberto:** coberto (v1.8.0): FIL-001..008 publicados no catálogo (cap. 02); sinal upload/file/ficheiro → FIL selecciona-os

### GC-02 — API REST pública com rate limiting
- oráculo: must-have 22, discutíveis 0, must-NOT 105 · prepare status `ready_for_codegen`, seleccionados 83
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ACC-001, ACC-002, ACC-003, ACC-004, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ARC-001, ARC-003, ARC-004, ARC-005, ARC-006, ARC-007, ARC-008, ARC-009, ARC-010, ARC-011, ARC-012, ARC-013, ARC-014, ARC-015, AUT-001, AUT-002, AUT-003, AUT-004, AUT-005, AUT-007, AUT-008, AUT-009, AUT-010, CFG-001, CFG-002, CFG-003, CFG-004, CFG-005, CFG-006, CFG-007, ENC-002, ENC-003, ENC-004, ENC-005, ENC-006, ENC-007, ENC-008, ENC-009, ERR-004, ERR-005, ERR-006, ERR-007, LOG-003, LOG-004, LOG-005, LOG-006, LOG-007, LOG-008, LOG-009, LOG-010, VAL-002, VAL-008
- consult: faltas 4 [ENC-001, LOG-001, LOG-002, ARC-002], violações 8 [SES-001, SES-002, SES-003, SES-004, SES-005, SES-006, SES-007, SES-008]
- lacuna registada no oráculo: ciclo de vida de API keys (emissão/rotação/revogação) — parcialmente em CFG-006/ENC-007

### GC-03 — Serviço containerizado com deploy em Kubernetes
- oráculo: must-have 20, discutíveis 0, must-NOT 78 · prepare status `ready_for_codegen`, seleccionados 33
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** CFG-003, CFG-004, CFG-005, CFG-006, DPL-001, DPL-004, DPL-010, DST-001, DST-002, DST-003, DST-004, DST-005, DST-007
- consult: faltas 0 [], violações 78 [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-010, AUT-001, AUT-002, AUT-003, …]

### GC-04 — Módulo Terraform de rede + segredos
- oráculo: must-have 14, discutíveis 0, must-NOT 69 · prepare status `ready_for_codegen`, seleccionados 25
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** CFG-001, CFG-002, CFG-003, CFG-004, CFG-005, ENC-001, ENC-002, ENC-003, ENC-004, ENC-005, ENC-008

### GC-05 — Pipeline CI com build e push de imagem
- oráculo: must-have 19, discutíveis 0, must-NOT 62 · prepare status `ready_for_codegen`, seleccionados 74
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** CNT-001, CNT-003, CNT-004, CNT-005, CNT-006, CNT-009, CNT-010, CNT-011, DEP-004, DEP-005, DEP-006, DEP-007, DEP-008, DEP-010, DEP-011, DEP-012, DEP-013, DEP-014, DPL-001, DPL-002, DPL-003, DPL-004, DPL-005, DPL-006, DPL-007, DPL-008, DPL-010, DST-001, DST-002, DST-005, DST-007, ENC-001, ENC-002, ENC-003, ENC-004, ENC-005, ENC-007, ENC-008, INT-001, INT-002, INT-003, INT-004, INT-005, INT-006, INT-009, INT-010, INT-011, TST-001, TST-002, TST-003, TST-004, TST-005, TST-006, TST-007, TST-008
- consult: faltas 16 [CIC-001, CIC-002, CIC-003, CIC-004, CIC-005, CIC-006, CIC-007, CIC-008, CIC-009, DEP-001, DEP-002, DEP-003, …], violações 0 []

### GC-06 — App com dados pessoais e overlay regulatório (AI Act)
- oráculo: must-have 16, discutíveis 0, must-NOT 69 · prepare status `ready_for_codegen`, seleccionados 59 · overlay obligations 14
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ACC-001, ACC-003, ACC-004, ACC-005, ACC-007, ACC-008, ACC-009, ACC-010, AUT-001, AUT-003, AUT-004, AUT-005, AUT-007, AUT-008, AUT-009, AUT-010, ENC-004, ENC-006, ENC-007, ENC-009, ERR-002, ERR-003, ERR-004, ERR-005, ERR-006, LOG-001, LOG-002, LOG-004, LOG-006, LOG-007, LOG-008, LOG-009, LOG-010, PRI-001, PRI-002, PRI-003, PRI-004, PRI-005, VAL-002, VAL-003, VAL-006, VAL-007, VAL-008
- lacuna registada no oráculo: minimização/consentimento/retenção de dados pessoais sem requisitos próprios (DAT-*/PRI-* eram ilustrativos)
- **transição lacuna → coberto:** coberto (v1.8.0): PRI-001..005 publicados; data_sensitivity personal/regulated e sinais dados pessoais/pii/finalidade → PRI

### GC-07 — Agente AI com tool-calls e kill-switch
- oráculo: must-have 18, discutíveis 0, must-NOT 64 · prepare status `ready_for_codegen`, seleccionados 29
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** LOG-001, LOG-002, LOG-003, LOG-004, LOG-005, LOG-006, LOG-007, LOG-008, LOG-009, LOG-010, THR-008
- consult: faltas 14 [ARC-014, ARC-015, OPS-011, OPS-012, OPS-013, OPS-014, DPL-010, DPL-011, DEP-011, DEP-013, DEP-014, AUT-006, …], violações 0 []

### GC-08 — Frontend com sessões JWT — filtro de nível (L1)
- oráculo: must-have 35, discutíveis 0, must-NOT 149 · prepare status `ready_for_codegen`, seleccionados 42
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ACC-003, API-001, API-002, API-003, API-005, API-006, SES-008
- lacuna registada no oráculo: paradoxo SES-008: guidance JWT para L1 não existe — lead decide
- **transição lacuna → coberto:** coberto (v1.8.0/decisão do Author): SES-008-por-tecnologia — sinal JWT activa SES-008 a qualquer nível, declarado no trace; isenção declarada no runner, oráculo intocado

### GC-09 — Alteração só de documentação (caso NEGATIVO)
- oráculo: must-have 0, discutíveis 0, must-NOT 0 · prepare status `needs_clarification`, seleccionados 0

### GC-10 — Integração serviço-a-serviço com mTLS e mensageria
- oráculo: must-have 10, discutíveis 0, must-NOT 75 · prepare status `ready_for_codegen`, seleccionados 39
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** API-001, API-002, API-003, API-004, API-005, API-006, API-007, CFG-001, CFG-002, CFG-003, CFG-004, CFG-005, ENC-002, ENC-004, ENC-005, ENC-006, ENC-007, ENC-008, INT-009, INT-010, INT-011, LOG-002, LOG-003, LOG-004, LOG-005, LOG-006, LOG-007, LOG-008, LOG-009
- lacuna registada no oráculo: mensageria (poison messages, DLQ, replay) sem requisitos
- **transição lacuna → coberto:** coberto (v1.8.0): INT-009..012 publicados (cap. 02, categoria INT alargada); o concern integration selecciona-os

## Leitura (Pontifex, 5 linhas)

_preenchida na emissão do relatório — ver secção no espelho do hub._

