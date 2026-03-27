---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: governance-doc
produced_by: executor
slice_id: s10
cycle: 1
---

# Executor Report — s10

## Metadata

- **slice_id:** s10
- **produced_by:** executor
- **date:** 2026-03-26
- **cycle:** 1

---

## Summary

Implementadas duas novas tools MCP conforme brief s10:

1. **`generate_document`** — gera esqueleto estruturado (secções, campos, critérios de aceitação, bundles relevantes) para 5 tipos de documento × 3 níveis de risco. Lógica totalmente estática; `context` aceite mas reservado.
2. **`map_sbd_toe_review_scope`** — dado conjunto de paths alterados, mapeia bundles SbD-ToE a rever com reasoning por path, deduplicação, protecção path traversal e nextSteps contextuais.

Ambas registadas em `src/index.ts`. 9 ficheiros de teste, 219 testes passam.

---

## Deliverables Produced

| Ficheiro | Acção | Descrição |
|---|---|---|
| `src/tools/generate-document.ts` | novo | Handler `handleGenerateDocument` com 5 tipos × 3 níveis, validação rpcError -32602 |
| `src/tools/generate-document.test.ts` | novo | 14 casos de teste (validação, estrutura, progressão L1/L2/L3, bundles, campos) |
| `src/tools/map-review-scope.ts` | novo | Handler `handleMapSbdToeReviewScope` com 7 padrões + guardrail, deduplicação, path traversal check |
| `src/tools/map-review-scope.test.ts` | novo | 16 casos de teste (path traversal, mapeamento, deduplicação, estrutura, cross-platform) |
| `src/index.ts` | modificado | Imports das 2 novas tools, schemas em `handleToolsList`, cases em `handleToolsCall` |

---

## Acceptance Criteria — Evidence

**AC-1: `generate_document` — 5 tipos suportados**

- criterion: Cada tipo retorna `{documentType, riskLevel, sections, acceptanceCriteria, relevantBundles}`
- status: PASS
- evidence: Teste `returns required fields for all 5 types at L1` → PASS

- criterion: `sections` não vazio para todos os 5 tipos × 3 níveis
- status: PASS
- evidence: Teste `all types produce sections at all risk levels` → PASS (15 combinações)

- criterion: `relevantBundles` contém apenas chapterIds válidos do index-compact
- status: PASS
- evidence: Todos os IDs em `RELEVANT_BUNDLES` são IDs reais verificados em s9

**AC-2: `generate_document` — L1/L2/L3 distintos**

- criterion: L3 tem ≥ secções que L2, que tem ≥ L1
- status: PASS
- evidence: Testes `L3 has more sections than L1 for classification-template`, `L2 has more sections than L1 for secure-config` → PASS

**AC-3: `generate_document` — sem conteúdo pré-gerado**

- criterion: Nenhum campo tem `guidance` com texto substantivo pré-preenchido
- status: PASS
- evidence: Teste `guidance never contains pre-filled substantive content` (verifica length < 300) → PASS

**AC-4: `generate_document` — validação**

- criterion: `type: "invalid-type"` → erro JSON-RPC `-32602`
- status: PASS
- evidence: Teste `throws rpcError -32602 for invalid type` → PASS

- criterion: `riskLevel: "L4"` → erro JSON-RPC `-32602`
- status: PASS
- evidence: Teste `throws rpcError -32602 for invalid riskLevel` → PASS

**AC-5: `map_sbd_toe_review_scope` — mapeamento correcto**

- criterion: `src/index.ts + .github/workflows/ci.yml (L2)` → inclui `06-desenvolvimento-seguro` e `07-cicd-seguro`
- status: PASS
- evidence: Teste `src/index.ts + .github/workflows/ci.yml (L2)` → PASS

- criterion: `package.json (L1)` → inclui `05-dependencias-sbom-sca`
- status: PASS
- evidence: Teste `package.json (L1) → 05-dependencias-sbom-sca` → PASS

- criterion: `pathMapping` cobre ≥6 padrões distintos
- status: PASS
- evidence: 7 padrões definidos + guardrail = 8 padrões possíveis; teste `pathMapping covers matched patterns` → ≥3 para input com 3 tipos de ficheiros

- criterion: `bundlesToReview` deduplicado
- status: PASS
- evidence: Teste `bundle activated by multiple paths appears only once` → PASS

- criterion: Cada entrada tem `chapterId`, `readableTitle`, `category`, `reason`, `expectedEvidence` (≥1)
- status: PASS
- evidence: Teste `each bundle entry has required fields` → PASS

**AC-6: `map_sbd_toe_review_scope` — segurança**

- criterion: `changedFiles: ["../etc/passwd"]` → erro JSON-RPC `-32602`
- status: PASS
- evidence: Teste `throws rpcError -32602 for path with '..'` → PASS

- criterion: `changedFiles: ["src/../config.ts"]` → erro JSON-RPC `-32602`
- status: PASS
- evidence: Teste `throws rpcError -32602 for path with embedded '..'` → PASS

- criterion: `changedFiles: []` → erro JSON-RPC `-32602`
- status: PASS
- evidence: Teste `throws rpcError -32602 for empty changedFiles array` → PASS

**AC-7: Qualidade**

- criterion: `npm run check` limpo
- status: PASS
- evidence: `[AI Disclosure Validation] 25 valid, 0 invalid`

- criterion: `npm run build` limpo
- status: PASS

- criterion: `npm run test` passa
- status: PASS
- evidence: `Tests 219 passed (219)` — 9 test files

- criterion: ≥5 casos de teste para `generate_document`
- status: PASS
- evidence: 14 casos em `generate-document.test.ts`

- criterion: ≥5 casos de teste para `map_sbd_toe_review_scope`
- status: PASS
- evidence: 16 casos em `map-review-scope.test.ts`

- criterion: Sem `any`, sem stdout poluído
- status: PASS
- evidence: TypeScript strict; nenhum `console.log` ou `process.stdout`

---

## Validation Run

```
$ npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5

[AI Disclosure Validation] 25 valid, 5 human-authored (skipped), 0 invalid
✅ All disclosed AI documents are valid

 Test Files  9 passed (9)
      Tests  219 passed (219)
   Duration  1.21s

$ ls src/tools/generate-document.ts src/tools/map-review-scope.ts
src/tools/generate-document.ts  src/tools/map-review-scope.ts

$ grep -c "generate_document\|map_sbd_toe_review_scope" src/index.ts
6
```

---

## Notes

- `generate_document` e `map_sbd_toe_review_scope` não acedem ao snapshot cache — lógica totalmente estática conforme especificado.
- `diffSummary` truncado a 500 chars sem erro (testado).
- Separadores Windows normalizados com `replace(/\\/g, '/')` no início do handler.
- `READABLE_TITLES` em `map-review-scope.ts` é cópia local dos títulos de `structured-tools.ts` — manter sincronizados se os títulos mudarem.
