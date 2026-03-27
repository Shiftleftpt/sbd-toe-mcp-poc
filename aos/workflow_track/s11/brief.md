---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s11
review_status: approved-by-sync
---

# Brief — s11: Repo Governance Planning (F10)

## Metadata

- **slice_id:** s11
- **produced_by:** sync
- **date:** 2026-03-26
- **target:** executor
- **depends_on:** s10 (closed)
- **epic:** F8–F10

---

## Objective

Implementar a tool MCP `plan_sbd_toe_repo_governance` que, dado o tipo de repositório, plataforma e nível de risco, devolve um plano de governança JSON com controlos aplicáveis, checkpoints de baseline, checklist de evidências e recomendações específicas da plataforma (GitHub/GitLab em YAML simples).

A tool é puramente advisory — não executa nem configura nada; apenas produz o plano para consumo humano ou por outro agente.

---

## Scope

### 11.1 — `plan_sbd_toe_repo_governance`

**Ficheiros novos:** `src/tools/plan-repo-governance.ts`, `src/tools/plan-repo-governance.test.ts`
**Ficheiros modificados:** `src/index.ts`

**Input schema:**
```typescript
{
  repoType: "library" | "service" | "webapp" | "infrastructure" | "pipeline" | "monorepo",
  platform: "github" | "gitlab",
  riskLevel: "L1" | "L2" | "L3",
  organizationContext?: {
    scale?: "startup" | "mid-size" | "enterprise",
    teamSize?: number,            // inteiro ≥ 1
    enforcementLevel?: "advisory" | "enforced" | "strict"
  }
}
```

**Output schema:**
```typescript
{
  applicableControls: Array<{
    controlId: string,            // ex: "CTRL-BRANCH-001"
    description: string,
    category: "access" | "code-quality" | "supply-chain" | "secrets" | "ci-cd" | "audit",
    rationale: string
  }>,
  mandatoryControls: string[],    // controlIds obrigatórios para este perfil
  recommendedControls: string[],  // controlIds recomendados mas não obrigatórios
  baselineCheckpoints: Array<{
    phase: string,                // ex: "setup", "pre-merge", "release", "audit"
    actions: string[],
    tooling?: string[]
  }>,
  evidenceChecklist: Array<{
    item: string,
    category: string,
    requiredFor: ("L1" | "L2" | "L3")[]
  }>,
  gaps: Array<{
    area: string,
    risk: string,
    mitigation: string
  }>,
  platformSpecific: {
    recommendations: string       // YAML string com configurações específicas da plataforma
  }
}
```

**Controlos por categoria (hardcoded):**

| ControlId | Categoria | Descrição |
|---|---|---|
| `CTRL-ACCESS-001` | access | Branch protection com ≥1 reviewer obrigatório |
| `CTRL-ACCESS-002` | access | CODEOWNERS definido para paths críticos |
| `CTRL-ACCESS-003` | access | MFA obrigatório para todos os contributors |
| `CTRL-QUALITY-001` | code-quality | Linting e type-checking em CI |
| `CTRL-QUALITY-002` | code-quality | Cobertura de testes mínima (L1: 60%, L2: 70%, L3: 80%) |
| `CTRL-QUALITY-003` | code-quality | Code review obrigatório (L2: 1 reviewer; L3: 2 reviewers) |
| `CTRL-SUPPLY-001` | supply-chain | Dependency scanning (Dependabot/Renovate) |
| `CTRL-SUPPLY-002` | supply-chain | SBOM gerado em cada release |
| `CTRL-SUPPLY-003` | supply-chain | Pinning de versões de dependências de CI |
| `CTRL-SECRETS-001` | secrets | Scanning de segredos (gitleaks/trufflehog) |
| `CTRL-SECRETS-002` | secrets | Variáveis sensíveis exclusivamente em vault/secrets manager |
| `CTRL-CICD-001` | ci-cd | Pipeline de CI obrigatório em PRs |
| `CTRL-CICD-002` | ci-cd | SAST em CI (CodeQL/semgrep) |
| `CTRL-CICD-003` | ci-cd | Container image scanning (L2+) |
| `CTRL-AUDIT-001` | audit | Audit log de acessos ao repositório |
| `CTRL-AUDIT-002` | audit | Signed commits obrigatórios (L3) |

**Regras de applicability por repoType:**

| repoType | Controlos sempre aplicáveis (adicionais) |
|---|---|
| `library` | `CTRL-SUPPLY-002` (SBOM), `CTRL-QUALITY-002` |
| `service` | `CTRL-CICD-002` (SAST), `CTRL-SECRETS-001` |
| `webapp` | `CTRL-CICD-002` (SAST), `CTRL-SECRETS-001`, `CTRL-CICD-003` (L2+) |
| `infrastructure` | `CTRL-SUPPLY-003` (pin CI deps), `CTRL-CICD-002`, `CTRL-AUDIT-001` |
| `pipeline` | `CTRL-SUPPLY-003`, `CTRL-CICD-001`, `CTRL-SECRETS-002` |
| `monorepo` | `CTRL-ACCESS-002` (CODEOWNERS), `CTRL-QUALITY-003` |

**Controlos mandatórios por nível:**
- L1: `CTRL-ACCESS-001`, `CTRL-QUALITY-001`, `CTRL-SECRETS-001`, `CTRL-CICD-001`
- L2 (adicional): `CTRL-ACCESS-002`, `CTRL-QUALITY-002`, `CTRL-QUALITY-003`, `CTRL-SUPPLY-001`, `CTRL-CICD-002`
- L3 (adicional): `CTRL-ACCESS-003`, `CTRL-SUPPLY-002`, `CTRL-SUPPLY-003`, `CTRL-SECRETS-002`, `CTRL-AUDIT-001`, `CTRL-AUDIT-002`

**Checkpoints de baseline (≥4 fases):**
1. `setup` — configuração inicial do repo (branch protection, CODEOWNERS, secrets)
2. `pre-merge` — gates de CI antes de merge (lint, testes, scanning)
3. `release` — gates de release (SBOM, tagging, signing L3)
4. `audit` — revisão periódica (acessos, dependências, drift de configuração)
5. `incident-response` — procedimentos de resposta (L2+)

**Evidence checklist mínima:**
- L1 (≥4 items): branch protection activa, CI pipeline funcional, secrets scan configurado, linting em CI
- L2 (+4 items ≥8 total): CODEOWNERS presente, dependency scan activo, SAST configurado, code review logs
- L3 (+4 items ≥12 total): SBOM artefacto em releases, signed commits verificados, audit log configurado, MFA evidenciado

**platformSpecific YAML examples:**

*GitHub:*
```yaml
branch_protection:
  required_reviews: 1         # L2: 1, L3: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true  # L2+
  required_status_checks:
    - lint
    - test
    - security-scan            # L2+
actions_permissions:
  allowed_actions: selected
  github_owned_allowed: true
dependabot:
  enabled: true
  update_schedule: weekly
```

*GitLab:*
```yaml
protected_branches:
  allowed_to_merge: maintainer
  allowed_to_push: no_one
  code_owner_approval_required: true  # L2+
merge_request_approvals:
  approvals_required: 1         # L2: 1, L3: 2
security_scanning:
  sast_enabled: true            # L2+
  dependency_scanning: true     # L2+
```

**Validação obrigatória:**
- `repoType` fora do enum → `-32602`
- `platform` fora do enum → `-32602`
- `riskLevel` fora do enum → `-32602`
- `organizationContext.teamSize` < 1 → `-32602`
- `organizationContext.enforcementLevel` fora do enum → `-32602`

---

## Out of Scope

- Não executar nem configurar automaticamente nada no repositório
- Não chamar APIs GitHub/GitLab
- Não implementar outras tools de governança além de `plan_sbd_toe_repo_governance`
- Não modificar tools existentes de s9/s10
- Não alterar `src/backend/`, `src/bootstrap/`, `src/resources/`

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `src/tools/plan-repo-governance.ts` | novo |
| `src/tools/plan-repo-governance.test.ts` | novo |
| `src/index.ts` | modificar (registo da nova tool) |

---

## Implementation

### Padrão de registo em `src/index.ts`

1. `handleToolsList()` → adicionar entrada com `name`, `title`, `description`, `inputSchema`, `annotations: { readOnlyHint: true }`
2. `handleToolsCall()` → adicionar `case "plan_sbd_toe_repo_governance":` seguindo o padrão existente: chamada ao handler, `sendResponse`, log via `sendNotification`

### Ordem recomendada

1. `src/tools/plan-repo-governance.ts` — handler com lógica de controlos e plano
2. `src/tools/plan-repo-governance.test.ts` — ≥5 casos de teste
3. Registo em `src/index.ts`
4. `npm run check && npm run build && npm run test`

### Notas

- **Sem `any`**: tipos explícitos em tudo
- **`stdout` reservado**: logs apenas em `stderr`
- **Allowlists**: validar `repoType`, `platform`, `riskLevel`, `scale`, `enforcementLevel` antes de qualquer uso
- **Lógica aditiva**: L2 inclui sempre os controlos de L1; L3 inclui L1+L2
- **YAML como string**: `platformSpecific.recommendations` é uma string YAML — não um objecto; usar template literal
- **Pure function**: sem I/O, sem side effects, sem acesso ao snapshot cache

---

## Acceptance Criteria

**AC-1: Input validation**
- `repoType: "invalid"` → erro JSON-RPC `-32602`
- `platform: "bitbucket"` → erro JSON-RPC `-32602`
- `riskLevel: "L4"` → erro JSON-RPC `-32602`
- `organizationContext.teamSize: 0` → erro JSON-RPC `-32602`

**AC-2: applicableControls completos**
- Qualquer combinação válida devolve `applicableControls` com ≥4 entradas
- Cada entrada tem `controlId`, `description`, `category`, `rationale`
- `category` é sempre um dos 6 valores válidos

**AC-3: mandatoryControls não vazio para L2/L3**
- Para `riskLevel: "L2"` → `mandatoryControls.length ≥ 5`
- Para `riskLevel: "L3"` → `mandatoryControls.length ≥ 10`
- `mandatoryControls` ⊆ IDs presentes em `applicableControls`

**AC-4: baselineCheckpoints ≥ 4 fases**
- Qualquer input válido devolve `baselineCheckpoints` com ≥4 entradas
- Cada entrada tem `phase` (string não vazia) e `actions` (array com ≥1 entrada)

**AC-5: evidenceChecklist ≥ 8 items para L2+**
- Para `riskLevel: "L1"` → `evidenceChecklist.length ≥ 4`
- Para `riskLevel: "L2"` → `evidenceChecklist.length ≥ 8`
- Para `riskLevel: "L3"` → `evidenceChecklist.length ≥ 12`
- Cada entrada tem `item`, `category`, `requiredFor` (array não vazio)

**AC-6: platformSpecific YAML não vazio**
- Para `platform: "github"` → `platformSpecific.recommendations` contém `branch_protection`
- Para `platform: "gitlab"` → `platformSpecific.recommendations` contém `protected_branches`
- String é YAML válido sintaticamente (não necessariamente parseado — basta ser string não vazia e estruturada)

**AC-7: Qualidade**
- `npm run check` limpo
- `npm run build` limpo
- `npm run test` passa — todos os testes existentes continuam a passar (219 testes de s10 intactos)
- ≥5 casos de teste para `plan_sbd_toe_repo_governance`
- Sem `any`, sem stdout poluído

---

## Validation

```bash
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc

# 1. Qualidade geral
npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -10

# 2. Ficheiro criado
ls src/tools/plan-repo-governance.ts src/tools/plan-repo-governance.test.ts

# 3. Registo em index.ts
grep -n "plan_sbd_toe_repo_governance" src/index.ts | head -10

# 4. Sem any
grep -n ": any" src/tools/plan-repo-governance.ts

# 5. mandatoryControls não vazio para L2
node -e "
const {handlePlanRepoGovernance} = require('./dist/tools/plan-repo-governance.js');
const r = handlePlanRepoGovernance({repoType:'service', platform:'github', riskLevel:'L2'});
console.log('mandatory:', r.mandatoryControls.length, 'checkpoints:', r.baselineCheckpoints.length, 'evidence:', r.evidenceChecklist.length);
"
```

---

## Risks

| Risco | Mitigação |
|---|---|
| `evidenceChecklist` insuficiente para L3 | Mínimo 12 items hardcoded para L3; tester conta explicitamente |
| YAML string malformado em `platformSpecific` | Template literal com indentação consistente; tester verifica presença de chaves esperadas |
| `mandatoryControls` com IDs não presentes em `applicableControls` | Tester verifica subset explicitamente |
| Lógica aditiva L1⊂L2⊂L3 quebrada | Testes cobrem os 3 níveis para o mesmo repoType e verificam crescimento |
