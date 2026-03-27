---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s9
review_status: approved-by-sync
---

# Brief — s9: AI Setup Foundation (F8)

## Metadata

- **slice_id:** s9
- **produced_by:** sync
- **date:** 2026-03-26
- **target:** executor
- **depends_on:** s5 (closed)
- **epic:** F8–F10

---

## Objective

Corrigir cinco gaps de usabilidade confirmados em duas iterações reais com Claude.ai (Março 2026), todos incidindo em tools ou ficheiros existentes — sem nova arquitectura:

1. **SKILL.md** ausente → chamadas exploratórias desnecessárias (30–40% do total)
2. **`map_sbd_toe_applicability`** não aceita contexto de projecto nem devolve `activatedBundles` com reasoning
3. **`answer_sbd_toe_manual`** lança erro no utilizador quando sampling não disponível
4. **`list_sbd_toe_chapters`** devolve `title` igual ao ID (ilegível)
5. **Resource `sbd://toe/index-compact`** ausente → Claude precisa de fazer descoberta exploratória a cada sessão

---

## Scope

### 9.1 — SKILL.md

Criar `.github/skills/sbd-toe-skill/SKILL.md`.

**Conteúdo obrigatório:**
- Workflow recomendado por tipo de pergunta (o que chamar primeiro, sequência típica de tools)
- Mapeamento de 9+ domínios SbD-ToE → bundle (ex.: "containers" → cap. 09, "CI/CD" → cap. 07)
- Convenções canónicas: `ART-*`, `CTRL-*`, níveis de risco L1/L2/L3
- Exemplos ponta-a-ponta: 2–3 sessões modelo (pergunta → tools chamadas → resposta esperada)
- Quando NÃO usar o servidor MCP (ex.: perguntas fora do âmbito SbD-ToE)
- Não requer alterações ao código do servidor

---

### 9.2 — `map_sbd_toe_applicability` — expandir input e output

**Ficheiro:** `src/tools/structured-tools.ts` + `src/index.ts`

**Input schema actual:**
```json
{ "riskLevel": "L1|L2|L3" }
```

**Input schema novo** (adicionar campos opcionais — todos com allowlists):
```json
{
  "riskLevel": "L1|L2|L3",
  "technologies": ["containers", "serverless", ...],
  "hasPersonalData": true|false,
  "isPublicFacing": true|false,
  "projectRole": "developer|architect|security|devops|manager"
}
```

**Allowlist de technologies** (usar exactamente estes valores):
`["containers", "serverless", "kubernetes", "ci-cd", "iac", "api-gateway", "mobile", "spa", "microservices", "legacy-integration", "ml-ai", "data-pipeline", "sca-sbom", "sast", "dast", "secrets-management", "monitoring", "iam", "network-segmentation", "cryptography"]`

**Output actual:**
```json
{ "riskLevel": "L1", "active": [...], "conditional": [], "excluded": [...] }
```

**Output novo** (manter campos actuais para retro-compatibilidade, adicionar `activatedBundles`):
```json
{
  "riskLevel": "L1",
  "active": [...],
  "conditional": [],
  "excluded": [...],
  "activatedBundles": {
    "foundationBundles": [
      { "chapterId": "01-classificacao-aplicacoes", "status": "active", "reason": "Obrigatório L1+" }
    ],
    "domainBundles": [
      { "chapterId": "09-containers-imagens", "status": "active", "reason": "technologies inclui containers" }
    ],
    "operationalBundles": [
      { "chapterId": "07-cicd-seguro", "status": "active", "reason": "technologies inclui ci-cd" }
    ]
  }
}
```

**Categorização dos bundles** (lógica interna, não configurável externamente):
- **foundationBundles** → capítulos obrigatórios para qualquer nível: `01-classificacao-aplicacoes`, `02-requisitos-seguranca`, `03-threat-modeling`
- **domainBundles** → activados por tecnologia ou contexto:
  - `05-dependencias-sbom-sca` → technologies inclui `sca-sbom`, `sast`, ou `dast`
  - `06-desenvolvimento-seguro` → sempre para L2+
  - `08-iac-infraestrutura` → technologies inclui `iac`, `containers`, ou `kubernetes`
  - `09-containers-imagens` → technologies inclui `containers` ou `kubernetes`
  - `10-testes-seguranca` → technologies inclui `sast` ou `dast`
- **operationalBundles** → activados por plataforma/operações:
  - `07-cicd-seguro` → technologies inclui `ci-cd`
  - `11-deploy-seguro` → L2+
  - `12-monitorizacao-operacoes` → technologies inclui `monitoring`
  - `13-formacao-onboarding` → L3

**Validação:**
- `technologies` itens não na allowlist → rejeitar com JSON-RPC `-32602` e listar valores inválidos
- `projectRole` não na allowlist → rejeitar com `-32602`
- `riskLevel` continua obrigatório e validado como antes

---

### 9.3 — `answer_sbd_toe_manual` — fallback gracioso

**Ficheiro:** `src/index.ts`

**Comportamento actual** (linha ~757):
```typescript
throw new Error("O cliente MCP atual não declarou suporte para sampling.");
```

**Comportamento novo:**
Quando `this.clientCapabilities.sampling` não está declarado:
1. Chamar `retrievePublishedContext(query, 3)` para obter top-3 documentos
2. Devolver resultado com campo extra `sampling_unavailable: true` e nota explicativa:
```json
{
  "sampling_unavailable": true,
  "note": "Sampling não disponível neste cliente. Apresentando os 3 documentos mais relevantes como contexto.",
  "results": [...top-3 docs...]
}
```
3. Zero impacto em clientes que suportam sampling (path existente não muda)

---

### 9.4 — `list_sbd_toe_chapters` — campo `readableTitle`

**Ficheiro:** `src/tools/structured-tools.ts`

**Comportamento actual:** `title: getStr(item, "title") ?? id` — devolve o ID quando sem título legível.

**Comportamento novo:** adicionar campo `readableTitle` ao output de cada capítulo com tabela hardcoded:

```typescript
const READABLE_TITLES: Record<string, string> = {
  "00-fundamentos":                "Fundamentos SbD-ToE",
  "01-classificacao-aplicacoes":   "Classificação de Aplicações",
  "02-requisitos-seguranca":       "Requisitos de Segurança",
  "03-threat-modeling":            "Threat Modeling",
  "04-arquitetura-segura":         "Arquitetura Segura",
  "05-dependencias-sbom-sca":      "Dependências, SBOM e SCA",
  "06-desenvolvimento-seguro":     "Desenvolvimento Seguro",
  "07-cicd-seguro":                "CI/CD Seguro",
  "08-iac-infraestrutura":         "IaC e Infraestrutura",
  "09-containers-imagens":         "Containers e Imagens",
  "10-testes-seguranca":           "Testes de Segurança",
  "11-deploy-seguro":              "Deploy Seguro",
  "12-monitorizacao-operacoes":    "Monitorização e Operações",
  "13-formacao-onboarding":        "Formação e Onboarding",
  "14-governanca-contratacao":     "Governança e Contratação",
};
```

Output de cada capítulo: `{ id, title, readableTitle }` onde `readableTitle = READABLE_TITLES[id] ?? title`.
Retro-compatível: `id` e `title` mantidos sem alteração.

---

### 9.5 — Resource `sbd://toe/index-compact`

**Ficheiros:** `src/index.ts` + novo `data/publish/sbd-toe-index-compact.json`

**`data/publish/sbd-toe-index-compact.json`** — estrutura:
```json
{
  "version": "1.0",
  "generated_at": "2026-03-26T00:00:00Z",
  "chapters": [
    {
      "chapterId": "01-classificacao-aplicacoes",
      "readableTitle": "Classificação de Aplicações",
      "domains": ["governance", "risk"],
      "technologies": [],
      "minLevel": "L1"
    }
  ]
}
```
Deve cobrir ≥14 capítulos. Tamanho alvo: <5KB.

**Registar em `src/index.ts`** (junto aos resources existentes):
- URI: `sbd://toe/index-compact`
- Name: `"SbD-ToE Index Compact"`
- MimeType: `application/json`
- Description: `"Índice compacto do manual SbD-ToE. Injectável em system prompt para eliminar fase de descoberta exploratória."`

**Handler:** quando URI === `"sbd://toe/index-compact"`, ler e devolver `sbd-toe-index-compact.json`.

---

## Out of Scope

- Não implementar `compare_to_framework`
- Não alterar o comportamento de sampling quando disponível
- Não modificar `src/backend/semantic-index-gateway.ts`
- Não alterar `src/types.ts`
- Não adicionar tools novas além das especificadas (s10 e s11 fazem isso)
- Não tocar em outros ficheiros de teste além de `structured-tools.test.ts`

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `.github/skills/sbd-toe-skill/SKILL.md` | novo |
| `data/publish/sbd-toe-index-compact.json` | novo |
| `src/tools/structured-tools.ts` | modificar (9.2 + 9.4) |
| `src/index.ts` | modificar (9.3 + 9.5) |
| `src/tools/structured-tools.test.ts` | modificar (novos casos 9.2 + 9.4) |

---

## Implementation

### Ordem recomendada

1. **9.4** — `readableTitle` (mais simples, isola impacto)
2. **9.2** — expandir `map_sbd_toe_applicability`
3. **9.3** — fallback em `answer_sbd_toe_manual`
4. **9.5** — resource `sbd://toe/index-compact`
5. **9.1** — SKILL.md
6. **Testes** — após 9.4 e 9.2

### Notas

- **Sem `any`**: usar `unknown` + narrowing
- **`stdout` reservado**: logs apenas em `stderr`
- **Allowlists**: validar antes de qualquer uso (Cap. 06 VAL-002)
- **Retro-compatibilidade**: testes existentes devem passar sem modificação
- **Caminho do JSON compacto**: resolver via path relativo ao app root (seguir padrão de `docsSnapshotFile`)

---

## Acceptance Criteria

**AC-1: SKILL.md**
- Ficheiro `.github/skills/sbd-toe-skill/SKILL.md` existe e é Markdown válido
- Contém workflow por tipo de pergunta (≥3 tipos)
- Contém tabela com ≥9 domínios → chapterId
- Contém convenções `ART-*`, `CTRL-*`, `L1/L2/L3`
- Contém ≥2 exemplos ponta-a-ponta com sequência de tools
- Contém secção "Quando não usar"

**AC-2: `map_sbd_toe_applicability` expandido**
- Input `{riskLevel: "L2", technologies: ["containers", "ci-cd"], hasPersonalData: true}` → `activatedBundles` com `foundationBundles`, `domainBundles`, `operationalBundles` não vazios
- `domainBundles` inclui `09-containers-imagens` quando technologies inclui `"containers"`
- `domainBundles` inclui `08-iac-infraestrutura` quando technologies inclui `"iac"`, `"containers"` ou `"kubernetes"`
- `operationalBundles` inclui `07-cicd-seguro` quando technologies inclui `"ci-cd"`
- `operationalBundles` inclui `13-formacao-onboarding` quando riskLevel é `"L3"`
- `foundationBundles` inclui sempre `01-classificacao-aplicacoes`, `02-requisitos-seguranca`, `03-threat-modeling`
- `technologies: ["invalid-tech"]` → erro JSON-RPC `-32602`
- `projectRole: "invalid-role"` → erro JSON-RPC `-32602`
- Input `{riskLevel: "L1"}` (sem campos opcionais) → testes existentes passam

**AC-3: Fallback sampling**
- Quando `clientCapabilities.sampling` é falsy: devolve `{sampling_unavailable: true, results: [...]}` — não lança excepção
- Quando sampling disponível: comportamento existente inalterado

**AC-4: `readableTitle`**
- Cada capítulo tem `readableTitle` distinto do `id`
- ≥14 capítulos mapeados
- Campos `id` e `title` mantidos — testes existentes passam

**AC-5: Resource `sbd://toe/index-compact`**
- `resources/list` inclui URI `sbd://toe/index-compact`
- `resources/read` com essa URI devolve JSON com `chapters` de ≥14 entradas
- Cada entrada tem `chapterId`, `readableTitle`, `domains`, `technologies`, `minLevel`
- Tamanho JSON: <5KB

**AC-6: Qualidade**
- `npm run check` limpo
- `npm run build` limpo
- `npm run test` passa — todos os testes existentes continuam a passar
- Novos testes em `structured-tools.test.ts`: ≥3 casos para `activatedBundles`, ≥2 casos para `readableTitle`
- Sem `any`, sem stdout poluído

---

## Validation

```bash
# 1. Qualidade
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc
npm run check
npm run build
npm run test -- --reporter=verbose 2>&1 | tail -30

# 2. SKILL.md
wc -l .github/skills/sbd-toe-skill/SKILL.md
grep -c "##" .github/skills/sbd-toe-skill/SKILL.md

# 3. index-compact válido e <5KB
wc -c data/publish/sbd-toe-index-compact.json
node -e "const d=JSON.parse(require('fs').readFileSync('data/publish/sbd-toe-index-compact.json','utf8')); console.log('chapters:', d.chapters.length, 'size_ok:', JSON.stringify(d).length < 5120)"

# 4. readableTitle no código
grep -n "readableTitle\|READABLE_TITLES" src/tools/structured-tools.ts | head -20

# 5. fallback sampling
grep -n "sampling_unavailable" src/index.ts | head -10

# 6. activatedBundles no código
grep -n "activatedBundles\|foundationBundles\|domainBundles\|operationalBundles" src/tools/structured-tools.ts | head -20
```

---

## Risks

| Risco | Mitigação |
|---|---|
| `activatedBundles` com categorização incorrecta | Sync revê tabela de categorização; tester valida 5 perfis distintos |
| Fallback sampling devolve resultado vazio | Usar `topK=3`, fallback para array vazio em vez de crash |
| SKILL.md com nomes/argumentos errados de tools | Executor lê `src/index.ts` e `structured-tools.ts` antes de escrever |
| Testes existentes partirem por retro-incompatibilidade | Executor corre `npm run test` após cada sub-tarefa |
| `sbd-toe-index-compact.json` com chapterIds inconsistentes | Usar os IDs que aparecem nos dados do snapshot (`chapter_id` dos entity records) |
