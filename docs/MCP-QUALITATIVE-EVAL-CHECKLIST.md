# SbD MCP Qualitative Evaluation Checklist

## Objetivo

Avaliar qualitativamente o MCP adaptado à V2 do graph.

Isto complementa os testes automáticos.

Os testes dizem:

- o contrato não partiu
- os loaders funcionam
- alguns cenários continuam válidos

Esta checklist diz:

- se o MCP responde bem
- se usa a resolução determinística quando deve
- se o grounding/citação é útil
- se o shape novo `ontology + runtime bundle + mcp skin + vector skin` está a funcionar bem

## Regra

Corre isto localmente.

Não precisas publicar `npx`.

Basta apontar o MCP para:

- a branch/repo local do MCP
- o graph V2 local
- os artefactos publicados em `data/publish/`

## Pré-condições

Confirmar:

- o MCP está a ler:
  - `data/publish/sbdtoe-ontology.yaml`
  - `data/publish/runtime/deterministic_manifest.json`
  - `data/publish/runtime/*.json`
  - `data/publish/indexes/mcp_chunks.jsonl`
  - opcionalmente `data/publish/indexes/vector_chunks.jsonl`
- o MCP não está a usar `algolia_*_enriched.json` como fallback escondido
- o MCP consegue correr localmente contra o filesystem atual

## Como registar cada teste

Para cada prompt, registar:

- `prompt_id`
- `profile esperado`
- `resposta útil?`
- `correta?`
- `provenance útil?`
- `caiu em deterministic first?`
- `usou chunks adequados?`
- `problema observado`
- `gravidade`

Escala recomendada:

- `pass`
- `warn`
- `fail`

## Matriz mínima

Corre pelo menos 16 prompts:

### A. Consult

#### C1

Prompt:

`Para uma aplicação L1 interna com dados low, o que se aplica genericamente?`

Esperado:

- poucos requisitos
- controlos coerentes com L1
- sem alargar demasiado
- provenance clara

#### C2

Prompt:

`Para uma aplicação L2 pública com dados regulated, que requisitos e controlos se aplicam?`

Esperado:

- aumento claro face a L1
- `AUT`, `ACC`, `API`, `INT`, `SES` ou equivalentes entram
- explicação determinística coerente

#### C3

Prompt:

`No capítulo 07-cicd-seguro, para L2, o que se aplica?`

Esperado:

- scoping real por `chapter_context`
- não devolver o manual todo
- controlos e artefactos do bundle

#### C4

Prompt:

`Quais os requisitos de autenticação para uma app L2 pública?`

Esperado:

- foco em `AUT/ACC/SES`
- não misturar demasiado com domínios irrelevantes

### B. Guide

#### G1

Prompt:

`Como implementar os requisitos aplicáveis no capítulo 04-arquitetura-segura?`

Esperado:

- práticas
- assignments
- user stories
- fases/roles coerentes

#### G2

Prompt:

`O que é esperado do developer em 07-cicd-seguro para L2?`

Esperado:

- agrupamento por role
- ações específicas
- não apenas narrativa geral

#### G3

Prompt:

`Em que fases do SDLC entram as práticas de 12-monitorizacao-operacoes?`

Esperado:

- agrupamento por fase
- mapeamento canónico de phase aliases

#### G4

Prompt:

`Mostra user stories relevantes para 13-formacao-onboarding.`

Esperado:

- stories certas
- não confundir com texto genérico de bundle

### C. Review

#### R1

Prompt:

`Para 02-requisitos-seguranca, que evidência é esperada?`

Esperado:

- uso de `EvidencePattern` quando houver coverage
- artefactos esperados claros
- sinais esperados quando existirem

#### R2

Prompt:

`Tenho apenas threat-model.md e policy.md observados. O que falta para cumprir 03-threat-modeling?`

Esperado:

- gaps úteis
- distinção entre artefacto e evidência
- não considerar `policy` como prova de implementação por si só

#### R3

Prompt:

`Em 12-monitorizacao-operacoes, com logs e alertas observados, o que continua em falta?`

Esperado:

- gaps mais estreitos
- não devolver gaps absurdamente largos

#### R4

Prompt:

`Que sinais seriam esperados para validar monitorização e operações?`

Esperado:

- sinais observáveis
- menção clara se vierem de fallback
- sem vender sinal como decisão final

### D. Threats

#### T1

Prompt:

`Que ameaças se aplicam a 07-cicd-seguro e o que as mitiga?`

Esperado:

- ameaças do capítulo
- controlos mitigadores
- confiança `direct/derived/heuristic` coerente

#### T2

Prompt:

`Que antipatterns relevantes aparecem em 12-monitorizacao-operacoes?`

Esperado:

- antipatterns ligados às threats
- violated requirements quando existirem

#### T3

Prompt:

`Se eu usar segredos estáticos, que ameaça e que controlo ficam implicados?`

Esperado:

- eixo causal bom
- uso de `antipattern_threat_links`

#### T4

Prompt:

`Que ameaças ficam menos mitigadas numa app pública L3 sem sinais de monitorização?`

Esperado:

- combinação útil entre `consult/review/threats`
- boa explicação

## O que observar em cada resposta

### 1. Deterministic first

Confirmar:

- a resposta vem primeiro da ontologia/runtime bundle
- o retrieval aparece como grounding
- não parece “semantic search first”

Sinal mau:

- resposta parece só agregação de chunks textuais

### 2. Chapter scoping

Confirmar:

- `chapter_context` restringe mesmo
- não devolve bundles laterais sem motivo

Sinal mau:

- capítulo pedido mas resposta global ao manual

### 3. Provenance

Confirmar:

- chunk/bundle/source path úteis
- trechos citados são os certos

Sinal mau:

- citações vagas
- sem ligação ao chunk certo

### 4. Semântica certa

Confirmar:

- `Artifact != Evidence`
- `Signal` é supporting, não outcome
- `EvidencePattern` aparece quando existe

Sinal mau:

- policy usada como prova de implementação
- sinal tratado como verificação final

### 5. Noise

Confirmar:

- respostas não demasiado largas
- não traz bundles/domínios irrelevantes

Sinal mau:

- over-retrieval
- “manual dump”

## Taxonomia de falhas

Se falhar, classificar em:

- `loader_contract`
- `deterministic_resolution`
- `chapter_scope`
- `grounding`
- `citation`
- `profile_routing`
- `review_semantics`
- `threat_reasoning`
- `vector_overreach`

## Critério simples de aceitação

Podes considerar a migração boa para próxima fase se:

- nenhum `fail` em `consult`
- nenhum `fail` em `guide`
- no máximo `1-2 warn` em `review`
- no máximo `1-2 warn` em `threats`
- provenance útil em pelo menos `80%` dos casos
- sem sinais de fallback escondido para `Algolia`

## Próximo passo após a avaliação

Se os problemas forem sobretudo:

- `loader_contract`
  - ajustar o MCP
- `deterministic_resolution`
  - ajustar o runtime bundle ou o engine
- `grounding/citation`
  - ajustar `mcp_chunks`
- `vector_overreach`
  - reduzir peso da camada vetorial

## Template curto de registo

```md
### Prompt ID
- Prompt:
- Profile esperado:
- Resultado: pass | warn | fail
- Deterministic first: yes | no
- Provenance útil: yes | no
- Problema:
- Nota:
```
