---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: tester
slice_id: s11
cycle: 0
---

# Tester Report — s11

## Metadata

- **slice_id:** s11
- **produced_by:** tester
- **date:** 2026-03-27
- **cycle:** 0
- **outcome:** PASS

---

## Summary

Validação independente do slice s11 "plan_sbd_toe_repo_governance (F10)". Os 2 ficheiros novos existem, a tool está registada em `src/index.ts`, build e check limpos. 247 testes passam (10 ficheiros de teste) — 28 casos para `plan_sbd_toe_repo_governance`. Todos os 7 acceptance criteria satisfeitos. Evidência contada directamente via execução ESM do artefacto compilado: L3 evidenceChecklist = 12 (≥12 conforme nota do Sync), mandatory L3 = 15 (≥10), subset property OK.

---

## Acceptance Criteria — Validation

### AC-1: Input validation

#### Criterion: `repoType: "invalid"` → erro JSON-RPC `-32602`
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:** `✓ throws rpcError -32602 for invalid repoType`
- **Finding:** Critério satisfeito.

#### Criterion: `platform: "bitbucket"` → erro JSON-RPC `-32602`
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:** `✓ throws rpcError -32602 for invalid platform (bitbucket)`
- **Finding:** Critério satisfeito.

#### Criterion: `riskLevel: "L4"` → erro JSON-RPC `-32602`
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:** `✓ throws rpcError -32602 for invalid riskLevel L4`
- **Finding:** Critério satisfeito.

#### Criterion: `organizationContext.teamSize: 0` → erro JSON-RPC `-32602`
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:** `✓ throws rpcError -32602 for teamSize 0`
- **Finding:** Critério satisfeito. Também testado: `enforcementLevel` inválido → -32602.

---

### AC-2: `applicableControls` completos

#### Criterion: Qualquer combinação válida devolve `applicableControls` com ≥4 entradas; cada entrada tem `controlId`, `description`, `category`, `rationale`; `category` é sempre um dos 6 valores válidos
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:**
  ```
  ✓ any valid combination returns ≥4 controls
  ✓ each control has controlId, description, category, rationale
  ✓ L1 mandatory controls are present for service/github/L1
  ```
- **Finding:** Catálogo de 16 controlos definido; todas as combinações produzem ≥4 entradas com os 4 campos obrigatórios.

---

### AC-3: `mandatoryControls` não vazio para L2/L3

#### Criterion: L2 → `mandatoryControls.length ≥ 5`
- **Status:** PASS
- **Method:** ESM import do artefacto compilado: `node --input-type=module`
- **Output:** `mandatory L1: 4 L2: 9 L3: 15`
- **Finding:** L2 tem 9 obrigatórios (≥5). Critério satisfeito.

#### Criterion: L3 → `mandatoryControls.length ≥ 10`
- **Status:** PASS
- **Method:** ESM import do artefacto compilado
- **Output:** `mandatory L3: 15`
- **Finding:** L3 tem 15 obrigatórios (≥10). Critério satisfeito.

#### Criterion: `mandatoryControls ⊆ applicableControls`
- **Status:** PASS
- **Method:** ESM import — verificação directa do subset
- **Output:** `mandatory subset OK: YES`
- **Finding:** Todos os IDs de `mandatoryControls` existem em `applicableControls`. Critério satisfeito.

---

### AC-4: `baselineCheckpoints` ≥ 4 fases

#### Criterion: Qualquer input válido devolve `baselineCheckpoints` com ≥4 entradas; cada entrada tem `phase` não vazio e `actions` com ≥1 entrada
- **Status:** PASS
- **Method:** ESM import + `npm run test -- --reporter=verbose`
- **Output:**
  ```
  checkpoints L1: 4 L2: 5 L3: 5
  ✓ always returns ≥4 checkpoints
  ✓ each checkpoint has non-empty phase and ≥1 action
  ✓ L2+ includes incident-response checkpoint
  ✓ L1 does NOT include incident-response checkpoint
  ```
- **Finding:** L1 = 4 fases (setup, pre-merge, release, audit); L2/L3 = 5 fases (+incident-response). Critério satisfeito.

---

### AC-5: `evidenceChecklist` — contagem explícita (nota do Sync)

#### Criterion: L1 → `evidenceChecklist.length ≥ 4`
- **Status:** PASS
- **Method:** ESM import directo do artefacto compilado (`dist/tools/plan-repo-governance.js`)
- **Output:** `evidence L1: 4`
- **Finding:** 4 items (= mínimo). Critério satisfeito.

#### Criterion: L2 → `evidenceChecklist.length ≥ 8`
- **Status:** PASS
- **Method:** ESM import
- **Output:** `evidence L2: 8`
- **Finding:** 8 items (= mínimo). Critério satisfeito.

#### Criterion: L3 → `evidenceChecklist.length ≥ 12`
- **Status:** PASS
- **Method:** ESM import — contagem explícita conforme instrução do Sync
- **Output:** `evidence L3: 12`
- **Finding:** **12 items exactamente** (= mínimo obrigatório). Critério satisfeito.

#### Criterion: Cada entrada tem `item`, `category`, `requiredFor` (array não vazio)
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:** `✓ each item has item, category, and non-empty requiredFor`
- **Finding:** Critério satisfeito.

---

### AC-6: `platformSpecific` YAML não vazio

#### Criterion: `platform: "github"` → `platformSpecific.recommendations` contém `branch_protection`
- **Status:** PASS
- **Method:** ESM import + `npm run test -- --reporter=verbose`
- **Output:**
  ```
  github branch_protection: true
  ✓ github returns YAML with branch_protection
  ✓ github L3 YAML includes require_signed_commits: true
  ✓ github L2 YAML includes security-scan in required_status_checks
  ```
- **Finding:** YAML GitHub contém `branch_protection` e adapta-se ao nível de risco.

#### Criterion: `platform: "gitlab"` → `platformSpecific.recommendations` contém `protected_branches`
- **Status:** PASS
- **Method:** ESM import + `npm run test -- --reporter=verbose`
- **Output:**
  ```
  gitlab protected_branches: true
  ✓ gitlab returns YAML with protected_branches
  ```
- **Finding:** YAML GitLab contém `protected_branches`. Critério satisfeito.

#### Criterion: String YAML é estruturada e não vazia
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose`
- **Output:** `✓ platformSpecific.recommendations is a non-empty string`
- **Finding:** Critério satisfeito.

---

### AC-7: Qualidade

#### Criterion: `npm run check` limpo
- **Status:** PASS
- **Method:** `npm run check`
- **Output:** `[AI Disclosure Validation] 29 valid, 5 human-authored (skipped), 0 invalid` / `✅ All disclosed AI documents are valid`
- **Finding:** Critério satisfeito.

#### Criterion: `npm run build` limpo
- **Status:** PASS
- **Method:** `npm run build`
- **Output:** `(zero output — clean)`
- **Finding:** Zero erros TypeScript.

#### Criterion: `npm run test` passa — todos os testes existentes (219 de s10) continuam a passar
- **Status:** PASS
- **Method:** `npm run test -- --reporter=verbose 2>&1 | tail -8`
- **Output:** `Test Files  10 passed (10)` / `Tests  247 passed (247)` / `Duration  1.15s`
- **Finding:** 247 testes (219 de s9/s10 + 28 novos) sem regressões.

#### Criterion: ≥5 casos de teste para `plan_sbd_toe_repo_governance`
- **Status:** PASS
- **Method:** Contagem dos testes em `plan-repo-governance.test.ts`
- **Output:** 28 casos (validation: 6, applicableControls: 3, mandatoryControls: 4, baselineCheckpoints: 4, evidenceChecklist: 4, platformSpecific: 5, gaps: 2)
- **Finding:** Critério satisfeito (28 ≥ 5).

#### Criterion: Sem `any`, sem stdout poluído
- **Status:** PASS
- **Method:** `grep -n ": any" src/tools/plan-repo-governance.ts`
- **Output:** `(sem output)`
- **Finding:** Zero ocorrências de `: any`. `npm run check` confirma TypeScript strict limpo.

---

## Overall Outcome

**PASS** — todos os 7 critérios satisfeitos. Recomendar close.

Implementação limpa e completamente estática (sem I/O, sem snapshot cache). Lógica aditiva L1⊂L2⊂L3 confirmada: mandatory 4→9→15, evidence 4→8→12, checkpoints 4→5→5. Subset property verificada directamente no artefacto compilado. Epic F8–F10 completo.

---

## Notes

- `evidenceChecklist` L3 = 12 exactamente (mínimo especificado). Se o brief for revisto para ≥13, requereria nova iteração.
- `organizationContext` validado mas não influencia a lógica de controlos nesta versão — reservado para expansão futura (conforme nota do executor).
- `READABLE_TITLES` duplicado em `map-review-scope.ts` e `structured-tools.ts` — manter sincronizados em releases futuras (nota de debt técnico, não é AC desta slice).
