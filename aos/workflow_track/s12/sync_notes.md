---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: tester
slice_id: s12
---

# Sync Notes — s12 → Tester

## Contexto

s12 entregue ao tester. Report do executor está limpo em todos os 7 ACs.

## Ponto a verificar adicionalmente

**Tamanho do package npm:**
O `npm pack --dry-run` mostra `data/publish/` com ~30 MB de dados JSON
(docs_enriched: 10.3 MB, docs: 8.9 MB, entities_enriched: 7.6 MB, entities: 3.6 MB).

O tester deve confirmar o tamanho comprimido total do tarball:

```bash
npm pack 2>&1 | tail -3
ls -lh sbd-toe-mcp-*.tgz
rm sbd-toe-mcp-*.tgz
```

Esperado: tarball comprimido < 50 MB (limite npm).
JSON comprime tipicamente 5–10×, pelo que ~3–6 MB é o esperado.
Se > 50 MB: bloqueante — reportar ao sync antes de continuar.

## Correcções de pré-existência pelo executor

O executor corrigiu duas anomalias fora do scope estrito mas correctas:
1. `aos/missions/distribution-epic.md`: `purpose: mission-brief` → `purpose: governance-doc` (allowlist do validate-ai-disclosure)
2. `src/release/package-release.test.ts`: referências ao nome antigo `sbd-toe-mcp-poc` actualizadas para `sbd-toe-mcp`

Ambas são consequências directas do rename — aceites.
