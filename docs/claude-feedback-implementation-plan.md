# Plano de Implementação: Feedback Claude → s9–s11

**Data:** 25 Mar 2026  
**Baseado em:** Análise consolidada de feedback Claude.ai sobre MCP usabilidade  
**Referência:** `docs/claude-mcp-feedback-analysis.md`

---

## Overview

O feedback do Claude reorganiza a prioridade de s9–s11 para centrar em **AI assistant setup** como foundation antes de tools específicas:

### Sequência de Prioridade (Por Impacto)

1. **P0 — Foundation para AI Usage (s9 — Fase 1)**
   - SKILL.md — workflow documentado
   - System Prompt — convenções e modo de operação
   - Tool improvements — naming, payloads, sampling fallback

2. **P1 — Visibilidade e Templates (s9 — Fase 2, s10 — Fase 1)**
   - Index compacto — tabela ~50-100 linhas
   - MCP prompt templates — slash commands/macros
   - `get_artifact_template` — estrutura de artefactos

3. **P2 — Query Diretas (s10–s11)**
   - `get_controls_by_technology` — tech → controlos
   - `generate_checklist` — chapter → checklist estruturada
   - `map_applicability` — input context → aplicabilidade completa

4. **P3 — Conformidade Especializada (Future)**
   - `cross_check_compliance` — frameworks mapping

---

## Fase 1 de s9 — Foundation (P0) — Duração Estimada: 1.5 semanas

**Objectivo:** Equipar Claude com infraestrutura de operação correcta. Sem isto, ferramentas não são usadas eficientemente.

### Tarefa 9.1 — SKILL.md para SbD-ToE MCP

**O que:** Documentação colocada em `.github/skills/sbd-toe-skill/SKILL.md`

**Por quê:** Claude já usa mecanismo de SKILL.md para docs, PDFs, etc. É o padrão conhecido. Elimina fase de descoberta.

**Conteúdo:**
```markdown
# SbD-ToE Security by Design Manual — MCP Skill

## Quando Usar
- Perguntas sobre controlos de segurança, requisitos, threat modeling
- Geração de artefactos (scripts, checklists, templates, políticas)
- Classificação de aplicações por nível de risco (L1/L2/L3)
- Conformidade e mapeamento (NIS2, DORA, ISO 27001)
- Recomendações de política (GitHub, Terraform, Kubernetes, Docker)

## Workflow Recomendado
1. **search_sbd_toe_manual** — como 1ª chamada para contexto semântico
2. **query_sbd_toe_entities** com riskLevel — para controlos específicos
3. **get_sbd_toe_chapter_brief** — para entender estrutura de capítulo (se necessário)
4. **get_artifact_template** — para obter estrutura antes de gerar artefacto
5. **Compor resposta** com base no contexto recuperado

## Convenções Canónicas
- IDs de artefactos: `ART-{domínio}-{descrição}-{hash}`
- IDs de controlos: `CTRL-{capítulo}-{número}`
- Níveis: L1 (baixo), L2 (médio), L3 (alto/crítico) — determinam **obrigatoriedade**
- "Obrigatório" = tem evidência necessária. "Recomendado" = considerar por risco residual. "Opcional" = fora do scope

## Mapeamento Rápido: Domínio → Capítulos
| Domínio | Capítulos | Caso de Uso |
|---------|-----------|-----------|
| GitHub / CI-CD | 07-cicd-seguro | Branch protection, code review, artifact signing, release gates |
| Terraform / IaC | 08-iac-infraestrutura | State encryption, drift detection, approval workflows, SAST IaC |
| Kubernetes / Containers | 09-containers-imagens | Image scanning, registry policies, runtime security, RBAC |
| Logging / Monitoring | 12-monitorizacao-operacoes | Central logging, alert rules, retention policies, audit trails |
| Aplicação / Classificação | 01-classificacao-aplicacoes | Determine L1/L2/L3 **antes** de aplicar Cap. 02+ |
| Requisitos Base | 02-requisitos-seguranca | Master list, matriz de controlos, obrigatoriedade por nível |
| Threat Modeling | 03-threat-modeling | STRIDE, attack trees, risk acceptance, aprovação formal |
| Arquitectura | 04-arquitetura-segura | System boundaries, trust zones, API security, isolation |
| Testes / SAST+DAST | 10-testes-seguranca | SAST results, SCA gates, DAST findings, fuzzing strategies |

## Quando NÃO Usar
- Perguntas genéricas sobre "cloud security" desconexas de contexto SbD-ToE
- Requisitos que não mapeiem a threat profile (use contexto externo)
- Problemas de execução (bugs técnicos do MCP)
```

**Tarefas concretas:**
- [ ] Criar directório `.github/skills/sbd-toe-skill/`
- [ ] Escrever SKILL.md com as 5 secções acima
- [ ] Adicionar 3 exemplos de perguntas end-to-end (ex. "configure GitHub para L2", "threat model para API")
- [ ] Validar: Copilot consegue ler o ficheiro e aplicar workflow

**Ficheiros:**
- novo: `.github/skills/sbd-toe-skill/SKILL.md`

**Critério de Aceitação:**
- Ficheiro é legível (markdown válido)
- O mapeamento domínio → capítulo cobre 9 domínios principais
- Exemplos demostram uso real
- Não há `any` ou conteúdo vago

---

### Tarefa 9.2 — System Prompt para Claude + SbD-ToE MCP

**O que:** Prompt injectado no início da sessão quando MCP está activo

**Por quê:** Elimina ambiguidade sobre modo de operação. Claude já sabe: use este MCP para segurança, convenções L1/L2/L3, artefactos são obrigatórios.

**Estrutura:**
```markdown
# System Prompt: SbD-ToE Manual + MCP

You have access to the SbD-ToE (Security by Design - Theory of Everything) manual via MCP.

## Mode of Operation
- When the user asks about software security controls, requirements, threat modeling, or compliance,
  always assume the SbD-ToE context.
- Use `search_sbd_toe_manual` as your first call to gather semantic context.
- For technology-specific questions (GitHub, Kubernetes, Terraform), use `get_controls_by_technology`
  to get direct control mappings.

## Key Conventions
- **Risk levels:** L1 (low), L2 (medium), L3 (critical) — these determine **mandatory vs optional**
- **Artifacts** (ART-*): are **mandatory evidence**, not optional recommendations
- **Controls** (CTRL-*): are organized by chapter and technology
- "Mandatory" = must have evidence. "Recommended" = consider based on residual risk. "Optional" = out of scope.
- **Workflow:** Classify (Cap. 01) → Apply requisites by risk (Cap. 02) → Technology-specific chapter (03–14)

## Recommended Response Pattern
1. Identify risk level (L1/L2/L3)
2. Map applicable chapters using Cap. 01 logic
3. Retrieve controls from applicable chapters
4. Return concrete artefacts with templates (use `get_artifact_template`)
5. Include evidence checklist

## Important Limitations
- The MCP does not execute code or create files — it provides guidance and templates only
- `answer_sbd_toe_manual` may fail if MCP client doesn't support sampling (fallback: use `search_sbd_toe_manual`)
- When Claude provides a checklist or control, always reference the source chapter
```

**Tarefas concretas:**
- [ ] Criar `prompts/system-prompt-sbd-toe-claude.md` (ou documentar onde será injectado)
- [ ] Testar em Claude.ai: inserir prompt no início da sessão MCP e validar que Claude respeita convenções
- [ ] Versionar e documentar no README.md como incluir este prompt em client MCP

**Ficheiros:**
- novo: `prompts/system-prompt-sbd-toe-claude.md`
- modificar: `README.md` (secção "Usage with AI Assistants")

**Critério de Aceitação:**
- Sistema prompt é válido (sem syntax errors)
- Claude compreende ("Entendido, vou usar SbD-ToE para segurança")
- Subsequentes queries de Claude seguem convenções (incluem riscos L1/L2/L3, referenciam artefactos, etc.)

---

### Tarefa 9.3 — Tool Improvements (Naming, Payloads, Sampling)

**Subitem 9.3a — `list_sbd_toe_chapters`: Adicionar Nomes Legíveis**

**O que:**
```json
{
  "id": "07-cicd-seguro",
  "title": "CI/CD Seguro",  // ← NOVO
  "subtitle": "Pipeline de construção, testes e deployment com gates de segurança",
  "chapters": [...]
}
```

**Por quê:** Claude não sabe se `07-cicd-seguro` é sobre CI/CD, Configuração ou Segurança de Codificação.

**Tarefas:**
- [ ] Atualizar `src/backend/semantic-index-gateway.ts` em `listChapters()` para incluir títulos legíveis
- [ ] Retirar títulos da index compacta (s5) se não existir, ou retirar de metadados upstream se disponível
- [ ] Testar: `list_sbd_toe_chapters` agora devolve campos `title` e `subtitle`

**Ficheiros:**
- modificar: `src/backend/semantic-index-gateway.ts`
- possivelmente: consultar `sbd-toe-knowledge-graph` para formato de títulos canónicos

**Critério de Aceitação:**
- Todos os ~15 capítulos têm títulos legíveis em português (não IDs)
- Subtítulos descrevem brevemente o tema
- npm run check && npm run build limpos

---

**Subitem 9.3b — `query_sbd_toe_entities`: Adicionar `summary_short`**

**O que:**
```json
{
  "entities": [
    {
      "id": "CTRL-07-001",
      "summary_short": "Branch protection rules required",  // ← NOVO: <20 palavras
      "requirement_short": "L2+",                            // ← NOVO: nível mínimo
      "artifacts": ["ART-branch-policy-config"],             // ← NOVO: apenas IDs
      // ... rest of payload (full details)
    }
  ]
}
```

**Por quê:** Grandes payloads gastam tokens. Claude quer overview rápido e depois drills into details se necessário.

**Tarefas:**
- [ ] Atualizar `src/backend/semantic-index-gateway.ts`: `normalizeHit()` para adicionar campos curtos
- [ ] Validar: campo `summary_short` tem <20 palavras
- [ ] Testar: `query_sbd_toe_entities` devolve payloads menores, Claude consegue fazer mais queries

**Ficheiros:**
- modificar: `src/backend/semantic-index-gateway.ts`, `src/types.ts`

**Critério de Aceitação:**
- `summary_short` adicionado para todas as entidades
- <20 palavras por `summary_short`
- npm run check && npm run build limpos
- Tamanho do payload < 60% do anterior

---

**Subitem 9.3c — `answer_sbd_toe_manual`: Sampling Fallback Degracioso**

**O que:** Claude.ai não declara suporte para sampling MCP. Tool falha silenciosamente. Queremos fallback.

**Solução:**
1. Documentar no README: "answer_sbd_toe_manual requer cliente MCP com sampling. Alternativa: use search_sbd_toe_manual."
2. Ou: Implementar fallback gracioso (se sampling não declarado, devolver top-3 resultados sem sampling)

**Tarefas:**
- [ ] Verificar: MCP client capabilities em inicialização (cap.sampling)
- [ ] Se não tem sampling: log aviso em stderr, fallback a search directo
- [ ] Testar: `answer_sbd_toe_manual` funciona (com ou sem sampling)

**Ficheiros:**
- modificar: `src/orchestrator/ask-manual.ts`, `README.md`

**Critério de Aceitação:**
- answer_sbd_toe_manual não falha silenciosamente
- Retorna resultado mesmo sem sampling (degradado)
- Mensagem de erro clara se há problema

---

**Subtarefas (9.3 totais):**

| Subitem | Ficheiros | Esforço | Risco |
|---------|-----------|---------|-------|
| 9.3a | semantic-index-gateway.ts | 1h | Baixo |
| 9.3b | semantic-index-gateway.ts, types.ts | 2h | Médio (payload changes) |
| 9.3c | ask-manual.ts, README.md | 1.5h | Baixo |
| **Total 9.3** | | **4.5h** | **Médio** |

---

## Fase 2 de s9 — Visibilidade & Templates (P1) — Duração Estimada: 2 semanas

### Tarefa 9.4 — Index Compacto (~50-100 linhas)

**O que:** Tabela JSON/Markdown injectada no contexto de Claude no início de cada sessão

**Por quê:** Claude identificou como a solução mais eficaz para "unknown unknowns". Visibilidade completa sem queries exploratórias.

**Estrutura:**
```json
{
  "uri": "sbd://toe/index-compact",
  "format": "json",
  "content": [
    {
      "chapter": "01",
      "title": "Classificação de Criticidade",
      "domains": ["risk-assessment", "app-profiling"],
      "tech": ["generic"],
      "min_level": "L1",
      "control_count": 15,
      "key_questions": "O quão crítica é a app? Tem dados pessoais? É pública?"
    },
    {
      "chapter": "02",
      "title": "Requisitos de Segurança",
      "domains": ["master-list", "matrix"],
      "tech": ["generic"],
      "min_level": "L1",
      "control_count": 47,
      "key_questions": "Que controlos são obrigatórios para L1/L2/L3?"
    },
    {
      "chapter": "07",
      "title": "CI/CD Seguro",
      "domains": ["pipeline-security", "artifact-management"],
      "tech": ["github", "gitlab", "jenkins"],
      "min_level": "L1",
      "control_count": 22,
      "key_questions": "Como protejo o pipeline? Branch protection? Code review?"
    },
    // ... mais capítulos
  ]
}
```

**Tarefas concretas:**
- [ ] Gerar tabela a partir dos dados enriquecidos (s5)
- [ ] Limitar a ~50-100 linhas total (não duplicar o manual)
- [ ] Adicionar como MCP resource (`sbd://toe/index-compact`) ou injectável no system prompt
- [ ] Documentar no README: como usar o index compacto

**Ficheiros:**
- novo: `data/publish/sbd-toe-index-compact.json`
- modificar: `src/index.ts` (adicionar resource)

**Critério de Aceitação:**
- Índice cabe em <5KB JSON
- Cobre ~15 capítulos principais
- Claude consegue escanear e fazer queries mais informadas
- npm run check && build limpos

---

### Tarefa 9.5 — MCP Prompt Templates

**O que:** Prompts como primitivas MCP (primeiras classes da MCP)

**Porquê:** Claude quer macros/slash commands para workflows comuns

**Prompts a Implementar:**

```
1. sbd://prompts/classify-application
   input: {description, technologies, dataClassification, deployment}
   output: {riskLevel: L1|L2|L3, justification, applicableChapters}

2. sbd://prompts/generate-checklist
   input: {chapterId, riskLevel, format: md|json|yaml}
   output: {checklist: [{item, mandatory, evidence_type}], totalItems}

3. sbd://prompts/review-artifact
   input: {artifactType, content, context}
   output: {conformance: pass|warn|fail, findings, recommendations}

4. sbd://prompts/threat-model-starter
   input: {architecture, technologies, scope}
   output: {threats, mitigations, priorities}

5. sbd://prompts/governance-roadmap
   input: {currentState, riskLevel, team_size}
   output: {phases, gates, responsibilities}
```

**Tarefas:**
- [ ] Criar handlers para cada prompt em `src/prompts/`
- [ ] Implementar lógica de cada prompt (inference + template generation)
- [ ] Registar em MCP `prompts/list` e `prompts/get`
- [ ] Documentar schema de input/output
- [ ] Testar: Claude consegue invocar `/generare-checklist` e obter resultado

**Ficheiros:**
- novo: `src/prompts/classify-application.ts`, `generate-checklist.ts`, `review-artifact.ts`, etc.
- modificar: `src/index.ts` (registar prompts)

**Critério de Aceitação:**
- 5 prompts implementados e funcionais
- Cada prompt valida inputs explicitamente
- Outputs são estruturados (JSON/YAML, não text livre)
- npm run check && build limpos

**Esforço:** ~8h (1.5h por prompt + integração)

---

### Tarefa 9.6 — Tool: `get_artifact_template`

**O que:** MCP tool que retorna a estrutura esperada de um artefacto

**Por quê:** Artefactos aparecem nos resultados (`ART-pipeline-config-...`) mas Claude não consegue obter o template. Isto leva a erros de omissão.

**Exemplo:**
```json
{
  "input": {"artifactId": "ART-pipeline-config-f8f2ba893d"},
  "output": {
    "name": "Pipeline Configuration Policy",
    "purpose": "Define authorized build steps, artifacts, deployment gates",
    "structure": {
      "metadata": {"version", "owner"},
      "stages": [
        {"name": "build", "requiredSteps": ["compile", "test", "SAST"]},
        {"name": "gate", "requiredApprovals": 1},
        {"name": "deploy", "requiredSteps": ["smoke-test"]}
      ]
    },
    "template": "# Pipeline Config Template\n...",
    "applicableChapters": ["07-cicd-seguro"],
    "exampleUrl": "https://..."
  }
}
```

**Tafas concretas:**
- [ ] Mapeador: artefacto ID → template metadata (core info)
- [ ] ~20 templates principais (ART-*) para domínios principais (CI/CD, IaC, containers, etc.)
- [ ] Registar como MCP tool
- [ ] Testar: `get_artifact_template("ART-pipeline-config")` retorna estrutura completa

**Ficheiros:**
- novo: `src/tools/get-artifact-template.ts`, `data/artifact-templates.json`
- modificar: `src/index.ts`

**Critério de Aceitação:**
- 20+ templates definidos
- Cada template tem: name, purpose, structure (JSON schema), template string, chapters
- Tool valida artifactId (allowlist de IDs conhecidos)
- npm run check && build limpos

**Esforço:** ~6h (4h curação de templates, 2h integração)

---

## Phase 3: s10–s11 − Query Diretas (P2)

### Tarefa 10.1 − `get_controls_by_technology`

Requer input específico de tecnologia + risco → retorna controlos estruturados.

Detalhe completo: `docs/claude-mcp-feedback-analysis.md` secção 3.1

**Ficheiros:** novo `src/tools/get-controls-by-technology.ts`

**Esforço:** ~5h

---

### Tarefa 10.2 − `generate_checklist`

Capítulo + nível + formato → checklist estruturada accionável.

Detalhe: `docs/claude-mcp-feedback-analysis.md` secção 3.2

**Ficheiros:** novo `src/tools/generate-checklist.ts`

**Esforço:** ~6h

---

### Tarefa 11.1 − `map_applicability`

Contexto de projeto → capítulos/controlos obrigatórios/condicionais/excluídos.

Detalhe: `docs/claude-mcp-feedback-analysis.md` secção 3.5

**Ficheiros:** novo `src/tools/map-applicability.ts`

**Esforço:** ~8h

---

## Critical Path

```
Week 1-2:
  ├─ 9.1 SKILL.md (2 days)
  ├─ 9.2 System Prompt (2 days)
  ├─ 9.3 Tool Improvements (3 days)
  └─ Code review + fixes (2 days)

Week 3-4:
  ├─ 9.4 Index Compacto (3 days)
  ├─ 9.5 MCP Prompts (4 days)
  ├─ 9.6 get_artifact_template (3 days)
  └─ Integration test + s9 closure (2 days)

Week 5-6:
  ├─ 10.1 get_controls_by_technology (3 days)
  ├─ 10.2 generate_checklist (3 days)
  ├─ s10 tests + integration (2 days)
  └─ s10 closure (1 day)

Week 7:
  ├─ 11.1 map_applicability (4 days)
  ├─ s11 tests + integration (2 days)
  └─ s11 closure + v0.3.0 release (1 day)
```

---

## Métricas de Sucesso

| Métrica | Antes (Sem Setup) | Depois (Com Setup) | Alvo |
|---------|-------------------|-------------------|------|
| Queries exploratórias por sessão | 5-7 | 1-2 | 1-2 |
| Confidence de Claude ("I know what I don't know") | Baixa | Alta | Alta |
| Token efficiency (% para context building) | 40% | 15% | <20% |
| False negatives (controlos omitidos) | ~15% | <2% | <5% |
| Time to first meaningful response | 3-4 min | 30s | <1 min |

---

## Referências SbD-ToE

- **Cap. 01** — Classificação de Criticidade
- **Cap. 02** — Requisitos de Segurança (matriz, obrigatoriedade)
- **Cap. 13** — Formação e Onboarding (skill delivery, workflow documentation)
- **Cap. 14** — Governança, Conformidade, Auditoria

---

## Próximas Ações (Após Plan Aprovação)

1. **Sync Review:** Validar sequência e alocar s9 com P0 + P1 items
2. **Executor Kickoff:** Começar com 9.1 (SKILL.md) — maior impacto, menor risco
3. **Tester Preparation:** Setup test harness para validar use cases Claude
4. **Release Planning:** v0.3.0 com s9–s11 features, drop 23 Abril

