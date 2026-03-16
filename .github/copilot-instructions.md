# Copilot Instructions — `sbd-toe-mcp-poc`

## Papel do Repositório

Cliente MCP/wrapper para VS Code sobre o backend semântico de `sbd-toe-knowledge-graph`. O papel é fornecer grounding, contexto, citações e prompting ao chat do VS Code — não reconstruir o manual nem substituir o chat.

Ver [`docs/role.md`](../docs/role.md) para responsabilidades completas, não-responsabilidades, modelo de interação e critério de sucesso.
Ver [`docs/sbd-toe-applicability.md`](../docs/sbd-toe-applicability.md) para classificação de risco, catálogo T01–T20, domínios base, capítulos aplicáveis, requisitos ativos/condicionais e exceções formais.

## Classificação de Risco

**L1** (E=1 stdio local / D=1 docs públicos / I=1 ferramenta consultiva). Rever se o servidor passar a expor HTTP, processar dados pessoais ou influenciar decisões automatizadas.

## Ordem de Aplicação do Manual

Nunca começar por listar controlos técnicos soltos. Começar sempre por:

**Cap. 01 → Cap. 02 → capítulo técnico relevante**

Diretamente aplicáveis: Cap. 01, 02, 05, 06, 07, 10.
Aplicação leve: Cap. 03, 04, 11, 12, 14.

## Regras de Implementação para o Copilot

### 1. Antes de propor controlos de segurança

- não assumir apenas AUT/LOG
- mapear a mudança ao tema Txx e ao domínio base correspondente
- consultar o MCP SbD-ToE para requisito, validação recomendada e evidência esperada

### 2. Sobre output gerado por IA

- tratar código, testes, configs e prompts gerados por IA como artefactos não confiáveis por origem
- exigir revisão humana, validação e rastreabilidade
- não afirmar conformidade sem evidência no código ou no manual

### 3. Sobre código e arquitetura

- manter o servidor pequeno, explícito e sem dependências de runtime desnecessárias
- preservar ESM, Node.js ≥ 20.9 e estilo TypeScript existente
- preferir funções pequenas, tipos explícitos e narrowing de `unknown`
- não usar `any` se for evitável
- não mover lógica do `knowledge builder` para este repositório

### 4. Sobre retrieval e prompting

- preservar a separação entre retrieval, prompt building e runtime JSON-RPC
- não misturar composição de resposta com heurísticas sem provenance
- preferir prompt grounded e verificável a respostas “espertas” mas não auditáveis
- nunca inventar citações, capítulos, links ou anchors

### 5. Sobre configuração e segredos

- não usar `process.env` fora de `src/config.ts`
- segredos não têm fallback funcional
- valores não sensíveis podem ter fallback explícito
- `.env.example` deve usar placeholders, nunca valores reais

### 6. Sobre ficheiros e caminhos

- resolver caminhos a partir de `process.cwd()` ou localização controlada
- não aceitar caminhos arbitrários vindos do cliente MCP sem validação
- não escrever fora das áreas esperadas do projeto

### 7. Sobre logging e erros

- `stdout` é reservado ao protocolo JSON-RPC
- logs operacionais e de segurança vão para `stderr`
- cada log deve incluir timestamp, nível, origem e mensagem curta
- nunca logar prompts completos, excerpts recuperados, segredos ou payloads extensos do utilizador
- erros para o cliente devem ser mínimos e corretos em JSON-RPC (`-32601`, `-32602`, `-32603`)

### 8. Sobre validação de inputs MCP

- validar `question`, `topK`, `debug` e parâmetros equivalentes antes de uso
- usar allowlists e faixas explícitas
- rejeitar inputs inválidos com erro claro
- sanitizar inputs antes da interpolação em prompts

### 9. Sobre rastreabilidade

- preferir referências explícitas a `REQ-*`, `SEC-*`, ou IDs do manual quando estiver a implementar um controlo relevante
- manter relação clara entre requisito, código e evidência de teste
- não introduzir “compliance claims” sem apontar o requisito correspondente

### 10. Sobre CI/CD e qualidade

- alterações de segurança devem ser verificáveis por `npm run check` e, quando aplicável, por testes
- se a alteração tocar T11/T12/T13, considerar impacto em SAST, SCA, SBOM, assinatura e gates
- tratar `.github/workflows/*.yml`, `scripts/`, `release/` e packaging como superfície de segurança do projeto
- em alterações de pipeline, rever permissões GitHub Actions, origem de actions, exposição de secrets, outputs de logs e condições de release
- preservar ou reforçar os controlos já existentes em CI, CodeQL e release

### 11. Sobre capítulos especializados aplicáveis aqui

- se a alteração tocar dependências, lockfiles, `package.json` ou build scripts, consultar Cap. 05
- se a alteração tocar código TypeScript, parsing de inputs, prompts ou composição de contexto, consultar Cap. 06
- se a alteração tocar workflows GitHub, packaging, release ou validações automáticas, consultar Cap. 07
- se a alteração tocar scanning, quality gates, SAST, CodeQL ou validação pré-release, consultar Cap. 10
- se a alteração tocar `release.yml`, artefactos publicados, aprovação de publicação ou critérios de promoção, consultar Cap. 11
- se a alteração tocar fronteiras do sistema, fluxos, confiança entre componentes ou canais `stdout`/`stderr`, consultar Cap. 04
- se a alteração tocar logging, alertas, retenção ou visibilidade operacional, consultar Cap. 12

## Critério de Sucesso

O projeto está numa boa iteração quando:

- responde perguntas reais sobre o manual com grounding
- usa os artefactos semânticos existentes como fonte principal
- ajuda o chat do VS Code a responder perguntas concretas de engenharia e compliance
- mostra citações e records recuperados
- não duplica a lógica do `sbd-toe-knowledge-graph`
- implementa apenas os controlos proporcionais ao risco e documenta exceções formais quando existirem

## Capítulo → Trigger de Consulta

Antes de editar, verificar se a alteração toca algum dos seguintes contextos e consultar o capítulo correspondente no MCP SbD-ToE:

| Contexto da alteração | Capítulo a consultar |
|---|---|
| Qualquer alteração de segurança nova | Cap. 01 → Cap. 02 → capítulo técnico |
| `package.json`, `package-lock.json`, dependências, lockfiles | Cap. 05 — Dependências, SBOM e SCA |
| Código TypeScript em `src/`, parsing, validação de inputs, prompts | Cap. 06 — Desenvolvimento Seguro |
| `.github/workflows/*.yml`, scripts de build, packaging | Cap. 07 — CI/CD Seguro |
| CodeQL, SAST, quality gates, scanning pré-release | Cap. 10 — Testes de Segurança |
| `release.yml`, bundle, tags, artefactos publicados | Cap. 11 — Deploy Seguro (proporcional) |
| Fronteiras de sistema, trust model, canais `stdout`/`stderr` | Cap. 04 — Arquitetura Segura |
| Logging, `stderr`, auditabilidade, debug seguro | Cap. 12 — Monitorização & Operações |
| Rastreabilidade, exceções formais, conformidade | Cap. 14 — Governança, Revisões e Conformidade |
| `src/config.ts`, env vars, segredos, configuração | Cap. 02 → domínio `CFG-*` |
| Inputs MCP, validação, sanitização, erros para o cliente | Cap. 06 → domínios `VAL-*` / `ERR-*` |
| Actions de terceiros, origens de supply chain, SBOMs | Cap. 05 + Cap. 07 |
| Classificação de risco, E+D+I, alteração de superfície | Cap. 01 — Classificação de Criticidade |

Se o contexto não encaixar na tabela ou se a alteração tocar múltiplos capítulos, começar sempre por Cap. 01 → Cap. 02.

## Referências SbD-ToE a Consultar com Frequência

- Cap. 01 — Classificação de Criticidade
- Cap. 02 — Requisitos de Segurança
- Cap. 02 — Lista de Requisitos Base
- Cap. 02 — Critérios de Aceitação
- Cap. 02 — Validação de Requisitos
- Cap. 02 — Aplicação no Ciclo de Vida
- `docs/role.md` deste repositório

Se houver conflito entre uma mudança “engenhosamente útil” e o papel do repositório, prevalece `docs/role.md`.

