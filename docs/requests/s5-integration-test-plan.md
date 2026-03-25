---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: integration-test
reasoning: Integration test scenarios generated from s5 acceptance criteria for MCP v2 resources and prompts
review_status: approved-by-tester
---

# s5 — Plano de Testes de Integração (Failsafe)

**Slice:** s5 — MCP Resources para enforcement a agentes (F5)
**Data:** 2026-03-24
**Destinatário:** tester

---

## Pré-Condições

1. Build limpo: `npm run build` executado com sucesso.
2. Sequência obrigatória em todos os cenários: `initialize` → `notifications/initialized` → método alvo.
3. Respostas avaliadas como JSON-RPC 2.0 da stdout; logs operacionais vão para stderr (ignorar).

---

## Sequência Base (usada em todos os testes)

```jsonl
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"tester","version":"0.0.1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

---

## T1 — `resources/list` devolve 2 resources

**Método:** `resources/list`

**Pedido:**
```json
{"jsonrpc":"2.0","id":2,"method":"resources/list","params":{}}
```

**Critério de aceitação:**
- Resposta com campo `result.resources` que é array com exactamente 2 entradas.
- Primeira entrada tem `name` que contém `"Skill Template"` e `mimeType: "text/markdown"`.
- Segunda entrada tem `name` que contém `"Chapter Applicability"` e `mimeType: "application/json"`.
- Nenhum campo `error` presente.

**Status esperado:** pass

---

## T2 — `resources/read` chapter-applicability/L1

**Método:** `resources/read`

**Pedido:**
```json
{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"sbd://toe/chapter-applicability/L1"}}
```

**Critério de aceitação:**
- Resposta com `result.contents` array com 1 entrada.
- `contents[0].mimeType === "application/json"`.
- `contents[0].text` é texto JSON com campos `riskLevel`, `active`, `conditional`, `excluded`.
- `riskLevel === "L1"`.
- `active` contém `"Cap. 01"`, `"Cap. 02"`, `"Cap. 05"`, `"Cap. 06"`, `"Cap. 07"`, `"Cap. 10"`.
- `conditional` contém `"Cap. 03"`, `"Cap. 04"`, `"Cap. 11"`, `"Cap. 12"`, `"Cap. 14"`.
- Nenhum campo `error` presente.

**Status esperado:** pass

---

## T3 — `resources/read` skill-template/L2/api-service

**Método:** `resources/read`

**Pedido:**
```json
{"jsonrpc":"2.0","id":4,"method":"resources/read","params":{"uri":"sbd://toe/skill-template/L2/api-service"}}
```

**Critério de aceitação:**
- Resposta com `result.contents` array com 1 entrada.
- `contents[0].mimeType === "text/markdown"`.
- `contents[0].text` contém `"L2"` e `"api-service"` e `"Cap."`.
- `contents[0].text` contém as secções `# SbD-ToE Skill Template`, `## Capítulos Activos`, `## Capítulos Condicionais`, `## Triggers de Consulta`, `## Requisitos Base`.
- Nenhum campo `error` presente.

**Status esperado:** pass

---

## T4 — `resources/read` com URI inválida

**Método:** `resources/read`

**Pedido:**
```json
{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"sbd://toe/unknown-resource/L1"}}
```

**Critério de aceitação:**
- Resposta com campo `error`.
- `error.code === -32602`.
- Nenhum campo `result` presente.

**Status esperado:** pass

---

## T5 — `resources/read` com riskLevel inválido

**Método:** `resources/read`

**Pedido:**
```json
{"jsonrpc":"2.0","id":6,"method":"resources/read","params":{"uri":"sbd://toe/chapter-applicability/L9"}}
```

**Critério de aceitação:**
- Resposta com campo `error`.
- `error.code === -32602`.
- Nenhum campo `result` presente.

**Status esperado:** pass

---

## T6 — `prompts/list` inclui `setup_sbd_toe_agent`

**Método:** `prompts/list`

**Pedido:**
```json
{"jsonrpc":"2.0","id":7,"method":"prompts/list","params":{}}
```

**Critério de aceitação:**
- `result.prompts` é array com pelo menos 2 entradas.
- Uma entrada tem `name === "ask_sbd_toe_manual"` (regressão — não deve ter desaparecido).
- Uma entrada tem `name === "setup_sbd_toe_agent"`.
- `setup_sbd_toe_agent` tem campo `arguments` com entrada `name === "riskLevel"` e `required === true`.
- `setup_sbd_toe_agent` tem campo `arguments` com entrada `name === "projectRole"` e `required === false`.
- Nenhum campo `error` presente.

**Status esperado:** pass

---

## T7 — `prompts/get` setup_sbd_toe_agent com riskLevel L1

**Método:** `prompts/get`

**Pedido:**
```json
{"jsonrpc":"2.0","id":8,"method":"prompts/get","params":{"name":"setup_sbd_toe_agent","arguments":{"riskLevel":"L1","projectRole":"mcp-wrapper"}}}
```

**Critério de aceitação:**
- `result.messages` é array com pelo menos 1 entrada.
- `messages[0].role === "user"`.
- `messages[0].content.type === "text"`.
- `messages[0].content.text` contém `"L1"` e `"Cap. 01"` e `"mcp-wrapper"`.
- Nenhum campo `error` presente.

**Status esperado:** pass

---

## T8 — `prompts/get` setup_sbd_toe_agent sem riskLevel

**Método:** `prompts/get`

**Pedido:**
```json
{"jsonrpc":"2.0","id":9,"method":"prompts/get","params":{"name":"setup_sbd_toe_agent","arguments":{}}}
```

**Critério de aceitação:**
- Resposta com campo `error`.
- `error.code === -32602`.
- Nenhum campo `result` presente.

**Status esperado:** pass

---

## Exemplo de Execução Manual (script de smoke)

```bash
cd /path/to/sbd-toe-mcp-poc
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"tester","version":"0.0.1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"resources/list","params":{}}' \
  '{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"sbd://toe/chapter-applicability/L1"}}' \
  '{"jsonrpc":"2.0","id":4,"method":"resources/read","params":{"uri":"sbd://toe/skill-template/L2/api-service"}}' \
  '{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"sbd://toe/unknown-resource/L1"}}' \
  '{"jsonrpc":"2.0","id":6,"method":"resources/read","params":{"uri":"sbd://toe/chapter-applicability/L9"}}' \
  '{"jsonrpc":"2.0","id":7,"method":"prompts/list","params":{}}' \
  '{"jsonrpc":"2.0","id":8,"method":"prompts/get","params":{"name":"setup_sbd_toe_agent","arguments":{"riskLevel":"L1","projectRole":"mcp-wrapper"}}}' \
  '{"jsonrpc":"2.0","id":9,"method":"prompts/get","params":{"name":"setup_sbd_toe_agent","arguments":{}}}' \
  | node dist/index.js 2>/dev/null | python3 -m json.tool --no-ensure-ascii
```

Filtrar respostas por id para mapear cada output ao cenário correspondente.

---

## Critérios de Pass/Fail Globais

| ID | Cenário | Expected |
|---|---|---|
| T1 | resources/list | 2 resources, sem error |
| T2 | resources/read chapter-applicability/L1 | contents com JSON L1, sem error |
| T3 | resources/read skill-template/L2/api-service | contents com Markdown L2, sem error |
| T4 | resources/read URI inválida | error -32602 |
| T5 | resources/read riskLevel L9 | error -32602 |
| T6 | prompts/list inclui setup_sbd_toe_agent | 2+ prompts, sem error |
| T7 | prompts/get setup_sbd_toe_agent L1 | messages com texto, sem error |
| T8 | prompts/get setup_sbd_toe_agent sem riskLevel | error -32602 |

**Regressão obrigatória:** `ask_sbd_toe_manual` em `prompts/list` (T6) e o comportamento existente de tools não devem ser afectados.
