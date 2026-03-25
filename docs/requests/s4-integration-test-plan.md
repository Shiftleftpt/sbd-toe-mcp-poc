---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: integration-test
reasoning: Integration test scenarios generated from s4 acceptance criteria for MCP v2 structured tools
review_status: approved-by-tester
---

# s4 — Integration Test Plan (Failsafe)

> **Role:** tester  
> **Slice:** s4 — Tools estruturadas de consulta (F4)  
> **Data:** 2026-03-24

## Como executar

```bash
# 1. Compilar
npm run build

# 2. Verificar snapshot (deve existir em data/publish/)
ls data/publish/algolia_entities_records.json

# 3. Enviar payload via stdin
echo '<json>' | node dist/index.js
```

> **Nota:** O servidor lê stdin linha a linha. O resultado vai para stdout, logs para stderr.  
> **Dependência de dados:** As tools `list_sbd_toe_chapters`, `get_sbd_toe_chapter_brief` e `map_sbd_toe_applicability` lêem `data/publish/algolia_entities_records.json`. A tool `query_sbd_toe_entities` lê também os ficheiros de docs. Se os ficheiros não existirem, a tool devolve `isError: true`.

---

## Cenários

### T1 — list_sbd_toe_chapters (sem filtro)

**Payload:**
```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_sbd_toe_chapters","arguments":{}}}
```

**Esperado:** `result.content[0].text` contém JSON com campo `chapters` como array  
**Pass:** sem campo `error` na resposta; `chapters` é array (pode ser não vazio com snapshot real)  
**Nota de dados:** Com o snapshot actual, `chapters` contém blocos `chapter_bundle` do índice de entidades (23 registos conhecidos).

---

### T2 — list_sbd_toe_chapters (riskLevel inválido)

**Payload:**
```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_sbd_toe_chapters","arguments":{"riskLevel":"L9"}}}
```

**Esperado:** `result.isError === true` e `result.content[0].text` contém "riskLevel inválido"  
**Pass:** campo `isError` presente e `true`; mensagem inclui "riskLevel inválido" ou "L1, L2, L3"  
**Atenção:** Em MCP, erros de validação de tool são devolvidos como `{ isError: true, content: [...] }`, não como `{ error: { code: -32602 } }`.

---

### T3 — list_sbd_toe_chapters (riskLevel válido — limitação de dados)

**Payload:**
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_sbd_toe_chapters","arguments":{"riskLevel":"L1"}}}
```

**Esperado:** `result.content[0].text` contém JSON com `chapters` como array  
**Pass:** sem `isError`; `chapters` pode ser vazio (os `chapter_bundle` do snapshot actual têm `risk_levels: []`, pelo que o filtro retorna lista vazia — limitação conhecida do índice)

---

### T4 — query_sbd_toe_entities (input válido)

**Payload:**
```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"query_sbd_toe_entities","arguments":{"query":"dependências e sbom","topK":5}}}
```

**Esperado:** `result.content[0].text` contém JSON com campos `entities` (array) e `total` (número)  
**Pass:** sem `isError`; `entities` é array; `total` >= 0

---

### T5 — query_sbd_toe_entities (query vazia)

**Payload:**
```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"query_sbd_toe_entities","arguments":{"query":""}}}
```

**Esperado:** `result.isError === true`; mensagem refere `"query"` obrigatório  
**Pass:** `isError` presente e `true`

---

### T6 — query_sbd_toe_entities (topK fora de range)

**Payload:**
```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"query_sbd_toe_entities","arguments":{"query":"test","topK":99}}}
```

**Esperado:** `result.isError === true`; mensagem refere `"topK"` entre 1 e 15  
**Pass:** `isError` presente e `true`

---

### T7 — get_sbd_toe_chapter_brief (capítulo existente)

**Payload:**
```json
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_sbd_toe_chapter_brief","arguments":{"chapterId":"01-classificacao-aplicacoes"}}}
```

**Esperado:** `result.content[0].text` contém JSON com `found: true`, `id`, `title`  
**Pass:** sem `isError`; `found === true`

---

### T8 — get_sbd_toe_chapter_brief (capítulo inexistente)

**Payload:**
```json
{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"get_sbd_toe_chapter_brief","arguments":{"chapterId":"capitulo-fantasma"}}}
```

**Esperado:** `result.content[0].text` contém JSON com `found: false`  
**Pass:** sem `isError`; `found === false`; `id === "capitulo-fantasma"`

---

### T9 — get_sbd_toe_chapter_brief (chapterId vazio)

**Payload:**
```json
{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"get_sbd_toe_chapter_brief","arguments":{"chapterId":""}}}
```

**Esperado:** `result.isError === true`; mensagem inclui `"chapterId" é obrigatório`  
**Pass:** `isError` presente e `true`

---

### T10 — map_sbd_toe_applicability (L1 válido)

**Payload:**
```json
{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"map_sbd_toe_applicability","arguments":{"riskLevel":"L1"}}}
```

**Esperado:** `result.content[0].text` contém JSON com campos `riskLevel`, `active`, `conditional`, `excluded`  
**Pass:** sem `isError`; `riskLevel === "L1"`; `active` e `excluded` são arrays; `conditional` é array (pode ser vazio); `active` deve conter pelo menos os capítulos com `practice_assignment` para L1 (ex: `"01-classificacao-aplicacoes"`)

---

### T11 — map_sbd_toe_applicability (riskLevel inválido)

**Payload:**
```json
{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"map_sbd_toe_applicability","arguments":{"riskLevel":"L4"}}}
```

**Esperado:** `result.isError === true`; mensagem inclui "riskLevel é obrigatório"  
**Pass:** `isError` presente e `true`

---

### T12 — tools/list inclui as 7 tools

**Payload:**
```json
{"jsonrpc":"2.0","id":12,"method":"tools/list","params":{}}
```

**Esperado:** `result.tools` contém exactamente 7 tools  
**Pass:** `result.tools.length === 7`; nomes incluem `list_sbd_toe_chapters`, `query_sbd_toe_entities`, `get_sbd_toe_chapter_brief`, `map_sbd_toe_applicability`

---

## Limitações conhecidas do snapshot actual

| Tool | Campo | Limitação |
|---|---|---|
| `list_sbd_toe_chapters` com `riskLevel` | `risk_levels` em `chapter_bundle` | Todos os `chapter_bundle` têm `risk_levels: []` → filtro retorna sempre lista vazia |
| `get_sbd_toe_chapter_brief` | `title` | Títulos dos `chapter_bundle` são os IDs técnicos (ex: `"01-classificacao-aplicacoes"`), não títulos descritivos |
| `map_sbd_toe_applicability` | `conditional` | Sempre `[]` — não há campo `applicability` nos registos actuais |

Estas limitações devem ser resolvidas no upstream (`sbd-toe-knowledge-graph`), não neste repositório.

---

## Critérios de aceitação (para tester)

- [ ] T1–T12 passam conforme esperado
- [ ] `npm run test` ≥ 69 testes existentes + novos testes de `structured-tools.test.ts` passam
- [ ] `npm run check` sem erros TypeScript
- [ ] `npm run build` limpo
- [ ] `result.isError` presente em todos os casos de input inválido (não `error.code`)
- [ ] Stdout contém apenas JSON-RPC válido (sem texto adicional)
