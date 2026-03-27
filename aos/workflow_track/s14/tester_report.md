---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: tester
slice_id: s14
cycle: 0
---

# Tester Report — s14

## Metadata

- **slice_id:** s14
- **produced_by:** tester
- **date:** 2026-03-27
- **cycle:** 0
- **outcome:** PASS

---

## Summary

Validação independente do slice s14 "Smithery registration". Todos os 6 acceptance criteria satisfeitos. `smithery.yaml` existe na raiz, é YAML sintacticamente válido, configura `npx -y sbd-toe-mcp` via `commandFunction`, documenta as 6 env vars funcionais com descriptions e defaults, exclui as 5 dead-code vars. Já referenciado em `package.json files` (s12). Build/check/test limpos — 247 testes sem regressões.

Nota de contexto: o executor levantou uma blocking question (q-s14-schema-preconditions) sobre a inacessibilidade da URL de docs Smithery e sobre o processo de registo. O sync respondeu: schema do brief válido; registo é manual pelo operador após s15. Este contexto não afecta nenhum dos ACs de validação.

---

## Acceptance Criteria — Validation

### AC-1: `smithery.yaml` existe e é YAML válido

#### Criterion: Ficheiro existe na raiz; YAML sintacticamente válido
- **Status:** PASS
- **Method:** `ls smithery.yaml && python3 -c "import yaml; yaml.safe_load(open('smithery.yaml')); print('YAML válido')"`
- **Output:** `YAML válido`
- **Finding:** Ficheiro presente. Python yaml.safe_load não lança excepção — YAML válido.

---

### AC-2: `startCommand` configurado com npx

#### Criterion: Contém configuração de arranque com `npx` e `sbd-toe-mcp`
- **Status:** PASS
- **Method:** Leitura directa do ficheiro + `grep "npx" smithery.yaml`
- **Output:**
  ```
  command: "npx",
  ```
  Contexto completo do `commandFunction`:
  ```
  (config) => ({
    command: "npx",
    args: ["-y", "sbd-toe-mcp"],
    env: Object.fromEntries(...)
  })
  ```
- **Finding:** `npx` e `sbd-toe-mcp` presentes no `commandFunction`. `type: stdio` correcto.

---

### AC-3: Env vars funcionais documentadas

#### Criterion: ≥4 das 6 env vars funcionais presentes com `description` e `default`
- **Status:** PASS
- **Method:** Leitura directa de `smithery.yaml` — secção `configSchema.properties`
- **Output:** 6 entradas presentes:
  - `DEBUG_MODE` — default: `"false"`, description presente ✓
  - `MAX_CONTEXT_RECORDS` — default: `"8"`, description presente ✓
  - `SITE_BASE_URL` — default com URL, description presente ✓
  - `MANUAL_BASE_URL` — default com URL, description presente ✓
  - `CROSS_CHECK_BASE_URL` — default com URL, description presente ✓
  - `SBD_TOE_APP_ROOT` — sem default (avançado), description presente ✓
- **Finding:** 6 env vars (≥4 obrigatório). `additionalProperties: false` garante que só as 6 funcionais são aceites.

---

### AC-4: Dead-code vars ausentes

#### Criterion: `smithery.yaml` não menciona `DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`, `SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`
- **Status:** PASS
- **Method:** `grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|SAMPLING_MAX_TOKENS|UPSTREAM_RELEASE_TAG)" smithery.yaml`
- **Output:** `(sem output — limpo)`
- **Finding:** Nenhuma das 5 dead-code vars presente.

---

### AC-5: Referência em `package.json` confirmada

#### Criterion: `grep "smithery.yaml" package.json` retorna resultado
- **Status:** PASS
- **Method:** `grep "smithery.yaml" package.json`
- **Output:** `"smithery.yaml"`
- **Finding:** Já presente no campo `files` do `package.json` desde s12. Critério satisfeito.

---

### AC-6: Qualidade

#### Criterion: `npm run check` limpo; `npm run build` limpo; `npm run test` → 247 testes, zero regressões
- **Status:** PASS
- **Method:** `npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5`
- **Output:**
  ```
  [AI Disclosure Validation] 43 valid, 5 human-authored (skipped), 0 invalid
  ✅ All disclosed AI documents are valid
  Test Files  10 passed (10)
  Tests  247 passed (247)
  Duration  1.16s
  ```
- **Finding:** 43 documentos válidos. Zero erros TypeScript. 247 testes sem regressões.

---

## Overall Outcome

**PASS** — todos os 6 critérios satisfeitos. Recomendar close.

`smithery.yaml` correcto e conforme o brief. Nota operacional para o operador: o registo na Smithery é **manual** após publicação npm (s15) — não é automático. Ver `sync_answer.md` e `executor_report.md` para detalhes do processo.

---

## Notes

- Validação semântica do `commandFunction` contra o schema oficial Smithery não foi possível (URL de docs inacessível). O formato é consistente com servidores MCP públicos na Smithery. Se a Smithery rejeitar no momento do registo, a mudança é trivial (substituir `commandFunction` por `command`/`args` directos).
- `additionalProperties: false` no `configSchema` é uma boa prática de segurança — apenas as 6 env vars declaradas são aceites.
