---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: test-plan
reasoning: PT/EN validation pairs generated from s3 acceptance criteria for semantic scoring with aliases_pt_en
review_status: approved-by-tester
---

# S3 Validação — Pares PT/EN para Scoring Semanticamente Equivalente

Este documento define 5 pares de perguntas semanticamente equivalentes em PT e EN para validar o scoring melhorado com `aliases_pt_en` e `intent_topics`.

## Critério de Sucesso

Para cada par, verificar se:
1. A pergunta em PT e a pergunta em EN recuperam o mesmo espaço temático
2. O capítulo primário é igual ou muito similar
3. Os records recuperados convergem tematicamente (mesmo que a ordem exata varie)

Não é necessário garantir identidade total de ranking, mas deve existir convergência consistente do espaço temático.

---

## Par 1: Criar Novo Repositório de Código

### Português
**Pergunta:** "Como criar um novo repositório de código com controlos iniciais de segurança?"

**Intent Detectado:** `repo_bootstrap`

**Aliases Expandidos:** repositório de código → `code repository`, `codebase`, `repository`

**Capítulo Esperado:** Cap. 01 (Classificação de Criticidade) ou Cap. 02 (Requisitos de Segurança)

**Justificativa:** A pergunta contém keywords de bootstrap (`criar`, `novo`, `repositório`) que ativam o intent `repo_bootstrap`. Os aliases para "repositório de código" devem expandir para include "code repository" e "repository".

---

### English
**Question:** "How to bootstrap a new code repository with initial security controls?"

**Intent Detected:** `repo_bootstrap` (same)

**Aliases Expanded:** repository → `repositório de código`, `codebase`

**Expected Chapter:** Cap. 01 or Cap. 02 (identical to PT pair)

**Justification:** Keywords `bootstrap`, `new`, `repository` match PT pair. Synonyms should converge to same sources.

---

## Par 2: Quem Aprova Exceções

### Português
**Pergunta:** "Quem aprova exceções e qual é o processo de aprovação no manual?"

**Intent Detectado:** `review_scope`

**Aliases Expandidos:** exceção → `exception`, `exemption`, `waiver`; aprovação → `approval`, `approve`, `review`

**Capítulo Esperado:** Cap. 02 (Requisitos de Segurança), Cap. 14 (Governança, Revisões e Conformidade)

**Justificativa:** Keywords `rever`, `aprovação`, `processo` ativam `review_scope`. Aliases para "exceção" e "aprovação" expandem semanticamente.

---

### English
**Question:** "Who approves exceptions and what is the approval process in the manual?"

**Intent Detected:** `review_scope` (same)

**Aliases Expanded:** exception → `exceção`, `waiver`; approval → `aprovação`, `approve`

**Expected Chapter:** Cap. 02 or Cap. 14 (identical to PT pair)

**Justification:** Keywords `approval`, `process`, `review` match PT. Expected chapters should align.

---

## Par 3: O Que Rever Quando package.json Muda

### Português
**Pergunta:** "O que devemos rever quando o ficheiro `package.json` é modificado no repositório?"

**Intent Detectado:** `dependency_governance`

**Aliases Expandidos:** dependência → `dependency`, `dependencies`, `package`

**Capítulo Esperado:** Cap. 05 (Dependências, SBOM e SCA)

**Justificativa:** A pergunta contém `package.json` (package), que mapeia a `dependency_governance`. Deve recuperar conteúdo sobre SBOM, SCA, locks e gestão de dependências.

---

### English
**Question:** "What should we review when the `package.json` file is modified in the repository?"

**Intent Detected:** `dependency_governance` (same)

**Aliases Expanded:** package → `package`, `dependencies`, `dependência`

**Expected Chapter:** Cap. 05 (identical to PT pair)

**Justification:** `package.json` and `dependencies` keywords should converge to same governance controls.

---

## Par 4: Que Capítulo Consultar para GitHub Actions

### Português
**Pergunta:** "Em que capítulo encontro orientações sobre workflows de GitHub Actions e pipelines de CI/CD?"

**Intent Detectado:** `ci_cd_gates`

**Aliases Expandidos:** CI/CD → `continuous integration`, `continuous delivery`, `pipeline`; workflow GitHub → `github actions`, `pipeline`, `workflow`

**Capítulo Esperado:** Cap. 07 (CI/CD Seguro)

**Justificativa:** Keywords `github actions`, `pipeline`, `ci/cd` ativam `ci_cd_gates`. Aliases devem expandir para cobrir variações semânticas.

---

### English
**Question:** "In which chapter can I find guidance on GitHub Actions workflows and CI/CD pipelines?"

**Intent Detected:** `ci_cd_gates` (same)

**Aliases Expanded:** CI/CD → `pipeline`, `continuous delivery`; workflows → `workflow`, `github actions`

**Expected Chapter:** Cap. 07 (identical to PT pair)

**Justification:** Direct keywords should match PT pair and point to CI/CD security chapter.

---

## Par 5: Gestão de Dependências (SBOM/SCA)

### Português
**Pergunta:** "Como é que o manual recomenda gerir as dependências do projeto e publicar SBOM?"

**Intent Detectado:** `dependency_governance`

**Aliases Expandidos:** dependências → `dependencies`, `dependency`; SBOM → `software bill of materials`

**Capítulo Esperado:** Cap. 05 (Dependências, SBOM e SCA)

**Justificativa:** Keywords `dependências`, `SBOM` ativam `dependency_governance`. Aliases ao SBOM devem incluir "software bill of materials".

---

### English
**Question:** "How does the manual recommend managing project dependencies and publishing a software bill of materials?"

**Intent Detected:** `dependency_governance` (same)

**Aliases Expanded:** dependencies → `dependências`, `dependency`; bill of materials → `SBOM`, `sbom`

**Expected Chapter:** Cap. 05 (identical to PT pair)

**Justification:** `dependencies` and `bill of materials` keywords should converge to governance and SBOM controls.

---

## Procedimento de Validação Manual

1. **Para cada par PT/EN:**
   - Executar a pergunta em PT no MCP via VS Code
   - Registar: capítulo primário, top 3 records, intent detectado
   - Executar a pergunta em EN no MCP via VS Code
   - Registar: capítulo primário, top 3 records, intent detectado

2. **Convergência Esperada:**
   - Capítulo primário deve ser igual ou muito similar (mesma secção do manual)
   - Records top 3 devem cobrir o mesmo espaço temático
   - Intent detectado deve ser idêntico para PT e EN

3. **Desvios Aceitáveis:**
   - Ordem exata dos Records pode variar (score local pode ser ligeiramente diferente)
   - Um record pode estar em posição 1 na query PT e posição 2 na query EN
   - Capítulo pode ser ligeiramente diferente mas ainda relevante ao tema

4. **Falha de Validação:**
   - Se PT recupera Cap. 05 (Dependências) e EN recupera Cap. 11 (Deploy), é falha
   - Se os records recuperados são temáticamente divergentes, é falha
   - Se intent detectado é diferente para a mesma pergunta em PT vs EN, investigar

---

## Notas de Implementação

- **Aliases PT/EN são controláveis e auditáveis:** Definidas em `CANONICAL_ALIASES_PT_EN` em `src/backend/semantic-index-gateway.ts`
- **Intents são finitos:** Conjunto fixo em `QueryIntent` type 
- **Intent scoring é aditivo:** O boost de intent é adicional ao score lexical, não substitui
- **Compatibilidade com snapshots vazios:** Se `aliases_pt_en` ou `intent_topics` forem null nos records, o código continua a funcionar (fallback ao score lexical)
- **Modo debug:** Quando o MCP expor modo debug, deve mostrar query original → query expandida → intent classificado → boost aplicado
