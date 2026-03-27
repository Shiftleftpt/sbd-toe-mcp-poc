# Análise de Feedback SbD-ToE MCP — Claude.ai

**Data:** 25 Mar 2026  
**Origem:** Sessão prática Claude.ai com MCP ativo — feedback honesto sobre usabilidade e lacunas  
**Status:** Análise consolidada, priorização executável

---

## 1. O Que Funciona Bem ✅

| Tool | Feedback | Caso de Uso |
|------|----------|-----------|
| `search_sbd_toe_manual` | Retrieval semântico com contexto suficiente | Gerar artefactos concretos (scripts, libs, checklists) |
| `query_sbd_toe_entities` | Estrutura de entities com proportionality por risco | Identificar controlos específicos por nível |
| `get_sbd_toe_chapter_brief` | Orientação rápida | Entender estrutura de um capítulo rapidamente |

**Insights:** As tools de retrieval funcionam bem quando há contexto suficiente. O problema é que Claude não tem visibilidade **upfront** do que está disponível, resultando em buscas exploratórias.

---

## 2. Gap Crítico Identificado ⚠️

> **"O gap maior que senti foi este: eu não sei o que não sei sobre o manual."**

Claude experienciou o problema de **"unknown unknowns"**:
- Fez retrieval sobre GitHub e obteve contexto de Cap. 07 (CI/CD)
- Mas pode ter **omitido controlos** em Cap. 04 (Arquitetura) ou Cap. 10 (Testes) com nomes diferentes
- Resulta em **perguntas exploratórias** para cobrir gaps

**Solução proposta:** Index compacto (~50-100 linhas) injectado no contexto inicial
- Tabela com: `{capitulo, controlo_id, tecnologia, nivel, obrigatorio}`
- Caberia bem no context window
- Daria **visibilidade completa** sem queries exploratórias

---

## 3. Ferramentas (Tools) Novas Necessárias

### 3.1 `get_controls_by_technology(tech, riskLevel)`

**Contexto:** Claude perguntou "o que configuro no GitHub para L2" → exigiu 3 calls encadeados

```json
{
  "input": {"tech": "github", "riskLevel": "L2"},
  "output": {
    "controls": [
      {
        "id": "CTRL-07-001",
        "chapter": "07-cicd-seguro",
        "requirement": "Branch protection rules obrigatórias",
        "artifacts": ["ART-branch-policy-config"],
        "priority": "HIGH"
      },
      {...}
    ]
  }
}
```

**Tecnologias esperadas:** github, gitlab, jenkins, terraform, kubernetes, docker, aws, azure, gcp

**SbD-ToE Relevante:** Cap. 07 (CI/CD), Cap. 08 (IaC), Cap. 09 (Containers)

---

### 3.2 `generate_checklist(chapterId, riskLevel, format)`

**Contexto:** Claude constrói checklists por inferência → pode omitir itens

```json
{
  "input": {
    "chapterId": "07-cicd-seguro",
    "riskLevel": "L2",
    "format": "markdown" | "json"
  },
  "output": {
    "checklist": [
      {"id": "CTRL-07-001", "item": "Branch protection rules", "mandatory": true, "evidenceFormat": "screenshot"},
      {"id": "CTRL-07-002", "item": "Code review policy", "mandatory": true, "evidenceFormat": "workflow config"},
      {...}
    ],
    "generatedAt": "ISO8601",
    "applicableToRisks": ["L2", "L3"]
  }
}
```

**SbD-ToE Relevante:** Cap. 02 (Requisitos de Segurança), Cap. 01 (Classificação)

---

### 3.3 `get_artifact_template(artifactId)`

**Contexto:** IDs aparecem nos resultados (`ART-pipeline-config-f8f2ba893d`) mas sem template

```json
{
  "input": {"artifactId": "ART-pipeline-config-f8f2ba893d"},
  "output": {
    "name": "Pipeline Configuration Policy",
    "purpose": "Define authorized build steps, artifacts, deployment gates",
    "structure": {
      "metadata": {"version": "1.0", "owner": "DevOps"},
      "stages": [
        {"name": "build", "requiredSteps": ["compile", "test", "SAST"]},
        {"name": "gate", "requiredApprovals": 1},
        {"name": "deploy", "requiredSteps": ["smoke-test", "monitoring-validation"]}
      ]
    },
    "template": "# Pipeline Config Template\n...",
    "exampleUrl": "https://securitybydesign.dev/artifacts/ART-pipeline-config",
    "applicableChapters": ["07-cicd-seguro"]
  }
}
```

**SbD-ToE Relevante:** Cap. 02 (Artefactos Obrigatórios), Cap. 14 (Governança)

---

### 3.4 `cross_check_compliance(chapterId, framework)`

**Contexto:** Cap. 02 existe (normativo) mas não navegável — "que controlos do Cap. 07 mapeiam para NIS2 Art. 21?"

```json
{
  "input": {
    "chapterId": "07-cicd-seguro",
    "framework": "NIS2" | "DORA" | "ISO27001" | "PCI-DSS"
  },
  "output": {
    "mappings": [
      {
        "controlId": "CTRL-07-001",
        "requirement": "Branch protection rules",
        "frameworkCitation": "NIS2 Art. 21(3)(e)",
        "frameworkRequirement": "Secure development practices",
        "alignment": "DIRECT"
      },
      {...}
    ],
    "coverage": "95%",
    "gaps": ["Art. 21(2)(a) requires incident response which is Cap. 12"]
  }
}
```

**SbD-ToE Relevante:** Cap. 02 (Cross-Check Normativo), Cap. 14 (Conformidade)

---

### 3.5 `map_applicability(context)` — **Mais Poderoso de Todos**

**Contexto:** Equivalente ao `map_sbd_toe_applicability` que existe mas não está activo

```json
{
  "input": {
    "riskLevel": "L2",
    "hasPersonalData": true,
    "isPublicFacing": true,
    "technologies": ["kubernetes", "postgres", "github"],
    "domain": "fintech"
  },
  "output": {
    "applicableChapters": {
      "01-classificacao": {"status": "ACTIVE", "priorityOrder": 1},
      "02-requisitos": {"status": "ACTIVE", "priorityOrder": 2},
      "03-threat-modeling": {"status": "ACTIVE", "priorityOrder": 3},
      "07-cicd": {"status": "ACTIVE", "priorityOrder": 4},
      "08-iac": {"status": "ACTIVE", "priorityOrder": 5},
      "12-monitorizacao": {"status": "CONDITIONAL", "condition": "Se dados pessoais"}
    },
    "requiredArtifacts": ["ART-threat-model", "ART-risk-acceptance", ...],
    "controlBreakdown": {
      "mandatory": 47,
      "conditional": 12,
      "excluded": 8
    },
    "governanceCheckpoints": [
      {"phase": "design", "gate": "Threat Model Approval"},
      {"phase": "implementation", "gate": "SAST + SCA gates"}
    ]
  }
}
```

**SbD-ToE Relevante:** Cap. 01 (Classificação), Cap. 02 (Requisitos), Cap. 14 (Governança)

---

## 4. Melhorias às Tools Existentes

### 4.1 `list_sbd_toe_chapters` — Adicionar Nomes Legíveis

**Problema:** Devolve `07-cicd-seguro` — Claude não sabe se é "CI/CD" ou "Segurança de Configuração"

```json
{
  "output": [
    {
      "id": "07-cicd-seguro",
      "title": "CI/CD Seguro",               // ← ADICIONAR
      "subtitle": "Pipeline de construção, testes e deployment com gates de segurança",
      "chapters": [...]
    }
  ]
}
```

**Impacto:** Reduz clarificações; Claude sabe imediatamente em que domínio está.

### 4.2 `query_sbd_toe_entities` — Adicionar `summary_short`

**Problema:** Payload grande por entidade; Claude gasta tokens em detalhe quando quer apenas overview

```json
{
  "output": {
    "entities": [
      {
        "id": "CTRL-07-001",
        "summary_short": "Branch protection rules required",  // ← ADICIONAR
        "requirement_short": "L2+",                            // ← ADICIONAR
        "artifacts": ["ART-branch-policy-config"],
        // ... resto do payload (full details opcional)
      }
    ]
  }
}
```

**Impacto:** Permite mais queries dentro do context window; melhor exploração gradual.

### 4.3 `answer_sbd_toe_manual` — Sampling Fallback

**Problema:** MCP sampling não suportado por Claude.ai → `answer_sbd_toe_manual` falha silenciosamente

**Solução:**
- Documentar claramente: "Apenas funciona em clientes com sampling declarado"
- Ou: Implementar fallback gracioso → devolver top-3 registos sem sampling
- Ou: Retry logic com degrade

**Impacto:** Evita "tool timeout" silencioso; Claude sabe porque falha e consegue contornar.

---

## 5. Setup & Context — O Mais Importante

### 5.1 System Prompt Dedicado (ALTA PRIORIDADE)

Claude quer um **system prompt injectado quando MCP activo**:

```markdown
Tu tens acesso ao manual SbD-ToE (Security by Design - Theory of Everything) via MCP.

## Modo de Operação
- Quando o utilizador fizer perguntas sobre segurança de software, assume sempre o contexto SbD-ToE
- Usa `search_sbd_toe_manual` antes de responder sobre controlos, requisitos ou artefactos
- Se a pergunta inclui tecnologia específica (GitHub, Kubernetes, etc.), usa `get_controls_by_technology`

## Convenções
- Níveis de risco: L1 (baixo), L2 (médio), L3 (alto/crítico)
- Artefactos (ART-*) são **evidências obrigatórias**, não opcionais
- Controlos (CTRL-*) são organizados por capítulo e tecnologia
- "Obrigatório" vs "Recomendado" vs "Opcional" têm significado preciso

## Workflow Recomendado para Respostas
1. Identify aplicabilidade (Cap. 01)
2. Map requisitos por risco (Cap. 02)
3. Consulta técnica específica (Cap. relevante pela tecnologia)
4. Retorna artefactos concretos com templates
```

**Mapeamento SbD-ToE:** Cap. 13 (Formação), Cap. 02 (Requisitos)

---

### 5.2 SKILL.md — Documentação de Workflow

Claude quer um ficheiro SKILL.md (mecanismo que já usa para docs, pptx, pdf):

```markdown
# SbD-ToE Skill

## Quando Usar
- Perguntas sobre controlos de segurança, requisitos, threat modeling
- Geração de artefactos (scripts, checklists, templates, políticas)
- Classificação de aplicações por nível de risco
- Mapeamento de conformidade (NIS2, DORA, ISO 27001)

## Workflow Recomendado
1. **search_sbd_toe_manual** — contexto semântico inicial
2. **query_sbd_toe_entities** com riskLevel — controlos específicos
3. **get_sbd_toe_chapter_brief** — estrutura do capítulo se necessário
4. **get_artifact_template** — obter template antes de gerar
5. **Compor artefacto** com base no contexto recuperado

## Convenções Canónicas
- Artefactos têm IDs: `ART-{domínio}-{descrição}-{hash}`
- Controlos têm IDs: `CTRL-{capítulo}-{número}`
- Níveis L1/L2/L3 determinam **obrigatoriedade**, não implementação
- "Obrigatório" → deve ter evidência. "Recomendado" → considerar por risco residual

## Capítulos por Domínio (Mapeamento Rápido)
| Domínio | Capítulos | Exemplo |
|---------|-----------|---------|
| GitHub/CI-CD | 07-cicd-seguro | Branch protection, code review, artifact signing |
| Infra/IaC | 08-iac-infraestrutura | Terraform policies, drift detection, approval gates |
| Containers | 09-containers-imagens | Image scanning, registry policies, runtime security |
| Logging | 12-monitorizacao-operacoes | Central logging, retention, alerting |
| Classificação | 01-classificacao-aplicacoes | Determine L1/L2/L3 antes de aplicar Cap. 02+ |

## Quando Não Usar
- Perguntas genéricas sobre "segurança em software" desconexas de contexto SbD-ToE
- Requisitos não-funcionais que não mapeiem a threat profile (use contexto fora do MCP)
```

**Mapeamento SbD-ToE:** Cap. 13 (Formação), Cap. 02 (Requisitos de Segurança)

---

### 5.3 Index Compacto — Tabela no Context

Claude quer uma **tabela ~50-100 linhas** injectada no contexto inicial:

```json
{
  "uri": "sbd://toe/index-compact",
  "content": [
    {"chapter": "01", "title": "Classificação de Criticidade", "controlCount": 15, "key_techs": "Risk assessment, application profiling", "level_min": "L1"},
    {"chapter": "02", "title": "Requisitos de Segurança", "controlCount": 47, "key_techs": "Master list of base requirements", "level_min": "L1"},
    {"chapter": "03", "title": "Threat Modeling", "controlCount": 12, "key_techs": "STRIDE, attack trees, risk acceptance", "level_min": "L2"},
    {"chapter": "04", "title": "Arquitetura Segura", "controlCount": 18, "key_techs": "System boundaries, trust zones, API security", "level_min": "L2"},
    {"chapter": "07", "title": "CI/CD Seguro", "controlCount": 22, "key_techs": "GitHub, GitLab, Jenkins, pipeline gates, artifact signing", "level_min": "L1"},
    {"chapter": "08", "title": "IaC - Infraestrutura", "controlCount": 19, "key_techs": "Terraform, Kubernetes, drift detection, approval", "level_min": "L2"},
    {"chapter": "09", "title": "Containers - Imagens", "controlCount": 16, "key_techs": "Docker, registry, scanning, runtime", "level_min": "L2"},
    {"chapter": "10", "title": "Testes de Segurança", "controlCount": 24, "key_techs": "SAST, SCA, DAST, IAST, fuzzing, gates", "level_min": "L1"},
    {"chapter": "12", "title": "Monitorização & Operações", "controlCount": 20, "key_techs": "Logging, alerting, incident response, audit trails", "level_min": "L2"},
    {...}
  ]
}
```

**Propósito:** Dar visibilidade completa sem queries exploratórias. Claude sabe exatamente:
- Quantos capítulos existem
- Que tecnologias cada um cobre
- Qual o nível mínimo de risco
- Quantos controlos estão em cada

---

### 5.4 MCP Prompt Templates

Claude quer prompts como primitivas de primeira classe (MCP suporta):

```
prompts/classify-application
  input: {description, context, technologies}
  output: {riskLevel, justification, applicableChapters}

prompts/generate-checklist
  input: {chapterId, riskLevel, format: md|json}
  output: {checklist, artifacts, dependencies}

prompts/review-artefact
  input: {artefactContent, expectedType, context}
  output: {conformance, findings, recommendations}

prompts/threat-model-starter
  input: {architecture, technologies, scope}
  output: {threatModel, mitigations, priorities}

prompts/governance-roadmap
  input: {currentState, riskLevel, team_size}
  output: {phases, gates, responsibilities}
```

---

## 6. Priorização por Impacto

| Item | Impacto | Esforço | Prioridade | Fase |
|------|---------|---------|-----------|------|
| **SKILL.md** | Muito Alto (workflow clarity) | Muito Baixo (~2h) | **P0** | s9 |
| **System Prompt** | Alto (elimina ambiguidade) | Baixo (~1h) | **P0** | s9 |
| **Index Compacto** | Alto (visibilidade upfront) | Médio (~4h) | **P1** | s9 |
| **MCP Prompt Templates** | Médio (convenience) | Médio (~6h) | **P1** | s10 |
| **get_artifact_template** | Médio (correctness) | Médio (~6h) | **P1** | s10 |
| **get_controls_by_technology** | Médio (direct queries) | Médio (~5h) | **P2** | s11 |
| **generate_checklist** | Médio (automation) | Médio (~6h) | **P2** | s11 |
| **cross_check_compliance** | Baixo (specialized) | Médio (~5h) | **P3** | Future |
| **map_applicability** | Alto (foundational) | Alto (~8h) | **P2** | s11 |
| **Tool improvements** (naming, payloads, sampling) | Médio (polish) | Baixo (~3h) | **P1** | s10 |

---

## 7. Roadmap de Implementação

### Fase 1: Foundation (s9) — Foundation para AI Usage
**Objectivo:** Equipar Claude com contexto de operação correcto

- [ ] **SKILL.md** — Arquivo em `.github/skills/sbd-toe-skill/SKILL.md`
- [ ] **System Prompt** — Criar `prompts/claude-sbd-toe-system.md` como resource injectável
- [ ] **Index Compacto** — Criar `sbd://toe/index-compact` like resource
- [ ] **Tool Improvements** — Adicionar `title`, `summary_short`, sampling fallback
- [ ] **Documentation** — Criar `docs/MCP-SETUP-FOR-AI-ASSISTANTS.md`

**Owners:** Sync (design), Executor (implementation), Tester (validation)

### Fase 2: Tools (s10–s11) — Ampliar Capacidades
**Objectivo:** Ferramentas específicas que Claude pediu

- [ ] **get_artifact_template** — Query artefactos por ID
- [ ] **get_controls_by_technology** — Query controlos por tech + risk
- [ ] **generate_checklist** — Gerar checklists estruturadas
- [ ] **map_applicability** — Input context → output chapters/controls
- [ ] **cross_check_compliance** — Frameworks mapping

---

## 8. Métricas de Sucesso

**Antes (sem setup):**
- Claude faz 5-7 queries exploratórias por sessão
- Confidence: "Não sei o que não sei"
- Token efficiency: 40% em context building
- False negatives: ~15% de controlos omitidos

**Depois (com setup):**
- Claude faz 1-2 queries por sessão
- Confidence: "Tenho visibilidade completa"
- Token efficiency: 20% em context building
- False negatives: <2% (index completo)

---

## Referências SbD-ToE

- **Cap. 01** — Classificação de Criticidade (aplicabilidade)
- **Cap. 02** — Requisitos de Segurança (matriz, obrigatoriedade)
- **Cap. 02** — Artefactos Obrigatórios (template reference)
- **Cap. 13** — Formação e Onboarding (skill delivery)
- **Cap. 14** — Governança e Conformidade (cross-check mappings)
- **Doc:** `docs/sbd-toe-applicability.md` (risk levels, active/conditional/excluded)

---

## Próximos Passos

1. **Sync Review:** Validar priorização e alocar a s9, s10, s11
2. **Executor Kickoff:** Começar com SKILL.md + System Prompt (P0)
3. **Index Build:** Gerar compact index a partir dos dados existentes
4. **Tool Design:** Especificar inputs/outputs para cada nova tool
5. **Tester Validation:** Verificar que Claude consegue usar sem erros/omissões

