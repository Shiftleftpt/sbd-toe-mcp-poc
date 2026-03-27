---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s10
review_status: approved-by-sync
---

# Brief — s10: generate_document + map_sbd_toe_review_scope (F9)

## Metadata

- **slice_id:** s10
- **produced_by:** sync
- **date:** 2026-03-26
- **target:** executor
- **depends_on:** s9 (closed)
- **epic:** F8–F10

---

## Objective

Implementar duas tools MCP que automatizam os padrões de uso mais frequentes observados em sessões Claude.ai:

1. **`generate_document`** — dado tipo de documento + nível de risco, devolve o esqueleto estruturado (secções, campos obrigatórios/condicionais/opcionais, critérios de aceitação, bundles relevantes). O MCP fornece a estrutura; o LLM gera o conteúdo.
2. **`map_sbd_toe_review_scope`** — dado um conjunto de paths alterados, mapeia quais knowledge bundles SbD-ToE devem ser revistos, com reasoning explícito por path.

---

## Scope

### 10.1 — `generate_document`

**Ficheiros novos:** `src/tools/generate-document.ts`, `src/tools/generate-document.test.ts`
**Ficheiros modificados:** `src/index.ts`

**Input schema:**
```typescript
{
  type: "classification-template" | "threat-model-template" | "checklist" | "training-plan" | "secure-config",
  riskLevel: "L1" | "L2" | "L3",
  context?: Record<string, unknown>   // sanitizado; sem side effects
}
```

**Output schema:**
```typescript
{
  documentType: string,
  riskLevel: "L1" | "L2" | "L3",
  sections: Array<{
    name: string,
    mandatory: boolean,
    fields: Array<{
      name: string,
      required: "mandatory" | "conditional" | "optional",
      guidance: string
    }>
  }>,
  acceptanceCriteria: string[],
  relevantBundles: string[]   // chapterIds do index-compact
}
```

**Estrutura por tipo** (hardcoded no handler):

| Tipo | Secções L1 | Adicionais L2 | Adicionais L3 |
|---|---|---|---|
| `classification-template` | Identificação, Dados Processados, Nível de Risco | Ameaças Identificadas | Plano de Remediação |
| `threat-model-template` | Âmbito, Actores, Superfície de Ataque | Árvores de Ameaça, Controlos | Análise de Residual Risk |
| `checklist` | Requisitos Mínimos L1 | Requisitos Adicionais L2 | Requisitos Regulatórios L3 |
| `training-plan` | Objectivos, Audiência, Módulos Base | Exercícios Práticos | Avaliação e Certificação |
| `secure-config` | Hardening Base, Segredos, Logging | Network Segmentation, mTLS | Auditoria Contínua, Conformidade |

**Regras de `required`:** `mandatory` = obrigatório no nível; `conditional` = só em determinado contexto (descrito em `guidance`); `optional` = recomendado.

**Bundles relevantes por tipo** (chapterIds reais):
- `classification-template` → `["01-classificacao-aplicacoes", "02-requisitos-seguranca", "14-governanca-contratacao"]`
- `threat-model-template` → `["03-threat-modeling", "04-arquitetura-segura", "02-requisitos-seguranca"]`
- `checklist` → `["02-requisitos-seguranca", "06-desenvolvimento-seguro", "10-testes-seguranca"]`
- `training-plan` → `["13-formacao-onboarding", "14-governanca-contratacao"]`
- `secure-config` → `["04-arquitetura-segura", "08-iac-infraestrutura", "09-containers-imagens", "07-cicd-seguro"]`

**Restrições:**
- `context` aceite mas não usado na lógica de estrutura (reservado para expansão futura) — sanitizado
- Sem conteúdo pré-gerado: `guidance` descreve o que preencher, nunca conteúdo substantivo
- `type` e `riskLevel` validados com allowlists → `-32602` se inválidos
- Sem `any`; sem stdout

---

### 10.2 — `map_sbd_toe_review_scope`

**Ficheiros novos:** `src/tools/map-review-scope.ts`, `src/tools/map-review-scope.test.ts`
**Ficheiros modificados:** `src/index.ts`

**Input schema:**
```typescript
{
  changedFiles: string[],             // obrigatório, ≥1 path relativo ao raiz do repo
  riskLevel: "L1" | "L2" | "L3",     // obrigatório
  projectContext?: {                  // opcional
    repoRole?: string,
    runtimeModel?: string,
    distributionModel?: string,
    hasCi?: boolean
  },
  diffSummary?: string                // opcional, truncado a 500 chars
}
```

**Output schema:**
```typescript
{
  bundlesToReview: Array<{
    chapterId: string,
    readableTitle: string,
    category: "foundation" | "domain" | "operational",
    reason: string,
    expectedEvidence: string[]
  }>,
  pathMapping: Array<{
    pattern: string,
    matchedFiles: string[],
    bundles: string[]
  }>,
  nextSteps: string[]
}
```

**Tabela de mapeamento path → bundles** (hardcoded):

| Padrão | Bundles |
|---|---|
| `src/**` | `02-requisitos-seguranca`, `06-desenvolvimento-seguro`, `10-testes-seguranca` |
| `src/config.ts` | adiciona `08-iac-infraestrutura` |
| `.github/workflows/**` | `07-cicd-seguro`, `10-testes-seguranca`, `11-deploy-seguro` |
| `package.json`, `*-lock.json`, `package-lock.json`, `yarn.lock` | `05-dependencias-sbom-sca` |
| `release/**`, `scripts/package-*` | `11-deploy-seguro` |
| `docs/**` | `14-governanca-contratacao` |
| `aos/**`, `.github/skills/**` | `14-governanca-contratacao`, `13-formacao-onboarding` |
| Guardrail (path não mapeado) | `01-classificacao-aplicacoes`, `02-requisitos-seguranca` |

**Categorias dos bundles:**
- `foundation`: `01-classificacao-aplicacoes`, `02-requisitos-seguranca`, `03-threat-modeling`, `04-arquitetura-segura`
- `domain`: `05-dependencias-sbom-sca`, `06-desenvolvimento-seguro`, `08-iac-infraestrutura`, `09-containers-imagens`, `10-testes-seguranca`
- `operational`: `07-cicd-seguro`, `11-deploy-seguro`, `12-monitorizacao-operacoes`, `13-formacao-onboarding`, `14-governanca-contratacao`

**Validação obrigatória:**
- Path com `..` → rejeitar com `-32602` e indicar o path inválido
- `changedFiles` vazio → rejeitar com `-32602`
- `riskLevel` inválido → rejeitar com `-32602`
- `diffSummary` truncado a 500 chars sem erro

**Deduplicação:** bundle activado por múltiplos paths → aparece uma vez em `bundlesToReview`, `reason` menciona todos os paths relevantes.

---

## Out of Scope

- Não implementar `compare_to_framework`
- `generate_document` não gera conteúdo — apenas esqueleto
- Não modificar tools existentes de s9
- Não alterar `src/backend/`, `src/bootstrap/`, `src/resources/`
- Não tocar em testes existentes além dos novos ficheiros

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `src/tools/generate-document.ts` | novo |
| `src/tools/generate-document.test.ts` | novo |
| `src/tools/map-review-scope.ts` | novo |
| `src/tools/map-review-scope.test.ts` | novo |
| `src/index.ts` | modificar (registo das 2 novas tools) |

---

## Implementation

### Padrão de registo em `src/index.ts`

1. `handleToolsList()` → adicionar entrada com `name`, `title`, `description`, `inputSchema`, `annotations: { readOnlyHint: true }`
2. `handleToolsCall()` → adicionar `case "generate_document":` e `case "map_sbd_toe_review_scope":` seguindo o padrão existente: chamada ao handler, `sendResponse`, log via `sendNotification`

Nem `generate_document` nem `map_sbd_toe_review_scope` precisam de acesso ao snapshot cache — a lógica é totalmente estática/baseada em input.

### Ordem recomendada

1. `src/tools/generate-document.ts` + `generate-document.test.ts`
2. Registo de `generate_document` em `src/index.ts`
3. `src/tools/map-review-scope.ts` + `map-review-scope.test.ts`
4. Registo de `map_sbd_toe_review_scope` em `src/index.ts`
5. `npm run check && npm run build && npm run test`

### Notas

- **Sem `any`**: tipos explícitos em tudo
- **`stdout` reservado**: logs apenas em `stderr`
- **Allowlists**: validar `type`, `riskLevel` antes de qualquer uso
- **Path traversal**: verificar `..` antes de qualquer processamento de path
- **Normalização de separadores**: `path.replace(/\\/g, '/')` no início do handler para suporte cross-platform

---

## Acceptance Criteria

**AC-1: `generate_document` — 5 tipos suportados**
- Cada tipo retorna `{documentType, riskLevel, sections, acceptanceCriteria, relevantBundles}`
- `sections` não vazio para todos os 5 tipos × 3 níveis
- `relevantBundles` contém apenas chapterIds válidos do index-compact

**AC-2: `generate_document` — L1/L2/L3 distintos**
- Para o mesmo tipo, L1/L2/L3 produzem `sections` com número diferente de entradas OU campos `required` diferentes
- L3 tem sempre ≥ secções/campos obrigatórios que L2, que tem ≥ L1

**AC-3: `generate_document` — sem conteúdo pré-gerado**
- Nenhum campo tem `guidance` com texto substantivo pré-preenchido — apenas instruções de preenchimento
- `fields[*].name` e `guidance` descrevem o quê preencher, nunca o conteúdo

**AC-4: `generate_document` — validação**
- `type: "invalid-type"` → erro JSON-RPC `-32602`
- `riskLevel: "L4"` → erro JSON-RPC `-32602`

**AC-5: `map_sbd_toe_review_scope` — mapeamento correcto**
- `{changedFiles: ["src/index.ts", ".github/workflows/ci.yml"], riskLevel: "L2"}` → `bundlesToReview` inclui `06-desenvolvimento-seguro` e `07-cicd-seguro`
- `{changedFiles: ["package.json"], riskLevel: "L1"}` → `bundlesToReview` inclui `05-dependencias-sbom-sca`
- `pathMapping` cobre ≥6 padrões distintos
- `bundlesToReview` deduplicado (sem repetições)
- Cada entrada tem `chapterId`, `readableTitle`, `category`, `reason`, `expectedEvidence` (≥1)

**AC-6: `map_sbd_toe_review_scope` — segurança**
- `changedFiles: ["../etc/passwd"]` → erro JSON-RPC `-32602`
- `changedFiles: ["src/../config.ts"]` → erro JSON-RPC `-32602`
- `changedFiles: []` → erro JSON-RPC `-32602`

**AC-7: Qualidade**
- `npm run check` limpo
- `npm run build` limpo
- `npm run test` passa — todos os testes existentes continuam a passar
- ≥5 casos de teste para `generate_document`
- ≥5 casos de teste para `map_sbd_toe_review_scope`
- Sem `any`, sem stdout poluído

---

## Validation

```bash
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc

# 1. Qualidade geral
npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -10

# 2. Ficheiros criados
ls src/tools/generate-document.ts src/tools/map-review-scope.ts
ls src/tools/generate-document.test.ts src/tools/map-review-scope.test.ts

# 3. Registo em index.ts
grep -n "generate_document\|map_sbd_toe_review_scope" src/index.ts | head -20

# 4. Path traversal protegido
grep -n '"\.\."' src/tools/map-review-scope.ts | head -10

# 5. Sem any
grep -n ": any" src/tools/generate-document.ts src/tools/map-review-scope.ts
```

---

## Risks

| Risco | Mitigação |
|---|---|
| `generate_document` com `sections` insuficientes para L1 | Mínimo 3 secções por tipo em todos os níveis; tester valida estrutura real |
| Paths Windows (`\`) causando false negatives no mapeamento | Normalizar separadores com `path.replace(/\\/g, '/')` no início do handler |
| Deduplicação incorrecta de bundles | Usar `Map<chapterId, entry>` internamente e converter no final |
| `relevantBundles` com chapterIds não existentes | Usar a lista hardcoded de IDs reais do index-compact (validados em s9) |
