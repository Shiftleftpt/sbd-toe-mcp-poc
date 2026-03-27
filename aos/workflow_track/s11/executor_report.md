---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: executor
slice_id: s11
cycle: 1
---

# Executor Report — s11

## Metadata

- **slice_id:** s11
- **produced_by:** executor
- **date:** 2026-03-27
- **cycle:** 1

---

## Summary

Implementada a tool MCP `plan_sbd_toe_repo_governance`. Dado repoType, platform e riskLevel, devolve um plano de governança completo: controlos aplicáveis (catálogo de 16 CTRL-*), mandatoryControls/recommendedControls, ≥4 checkpoints de baseline (setup/pre-merge/release/audit + incident-response para L2+), evidenceChecklist progressiva (L1≥4, L2≥8, L3≥12), gaps contextuais por repoType e riskLevel, e YAML platform-specific (GitHub/GitLab) adaptado ao nível de risco. Lógica totalmente estática, sem I/O. Tool registada em `src/index.ts`. 28 casos de teste, 247 testes passam.

---

## Deliverables Produced

| Ficheiro | Acção | Descrição |
|---|---|---|
| `src/tools/plan-repo-governance.ts` | novo | Handler com catálogo de 16 controlos, lógica aditiva L1⊂L2⊂L3, YAML platform-specific |
| `src/tools/plan-repo-governance.test.ts` | novo | 28 casos (validação, controls, mandatory, checkpoints, evidence, YAML, gaps) |
| `src/index.ts` | modificado | Import, schema em `handleToolsList`, case em `handleToolsCall` |

---

## Acceptance Criteria — Evidence

**AC-1: Input validation**

- criterion: `repoType: "invalid"` → `-32602`
- status: PASS — teste `throws rpcError -32602 for invalid repoType`

- criterion: `platform: "bitbucket"` → `-32602`
- status: PASS — teste `throws rpcError -32602 for invalid platform`

- criterion: `riskLevel: "L4"` → `-32602`
- status: PASS

- criterion: `organizationContext.teamSize: 0` → `-32602`
- status: PASS — teste `throws rpcError -32602 for teamSize 0`

**AC-2: applicableControls ≥4 entradas**

- status: PASS — `any valid combination returns ≥4 controls` testa 6 combinações

**AC-3: mandatoryControls**

- criterion: L2 → `mandatoryControls.length ≥ 5`
- status: PASS — L2 tem 9 obrigatórios (4 L1 + 5 adicionais L2)

- criterion: L3 → `mandatoryControls.length ≥ 10`
- status: PASS — L3 tem 15 obrigatórios (9 L2 + 6 adicionais L3)

- criterion: `mandatoryControls ⊆ applicableControls`
- status: PASS — teste `mandatoryControls is subset of applicableControls IDs`

**AC-4: baselineCheckpoints ≥4 fases**

- status: PASS — 4 fases para L1, 5 fases para L2/L3 (+ incident-response)

**AC-5: evidenceChecklist**

- L1 ≥4: PASS (4 items)
- L2 ≥8: PASS (8 items)
- L3 ≥12: PASS (12 items)

**AC-6: platformSpecific YAML**

- GitHub → contém `branch_protection`: PASS
- GitLab → contém `protected_branches`: PASS
- GitHub L3 → `require_signed_commits: true`: PASS
- GitHub L2 → `security-scan` em status checks: PASS

**AC-7: Qualidade**

- `npm run check`: PASS — 28 valid, 0 invalid
- `npm run build`: PASS
- `npm run test`: PASS — 247 testes, 10 ficheiros
- ≥5 casos de teste: PASS — 28 casos
- Sem `any`, sem stdout: PASS

---

## Validation Run

```
$ npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5

[AI Disclosure Validation] 28 valid, 5 human-authored (skipped), 0 invalid
✅ All disclosed AI documents are valid

 Test Files  10 passed (10)
      Tests  247 passed (247)
   Duration  1.13s
```

---

## Notes

- `READABLE_TITLES` duplicado em `map-review-scope.ts` e `structured-tools.ts` — manter sincronizados se os títulos mudarem em releases futuras.
- `organizationContext` é validado mas não influencia a lógica de controlos nesta versão (reservado para expansão).
- YAML em `platformSpecific.recommendations` é uma string template literal — não é parseado pelo servidor; o consumidor (LLM ou agente) é responsável por interpretar.
