# Copilot Instructions — `sbd-toe-mcp-poc`

## Papel do Repositório

Este repositório existe para construir um cliente MCP/wrapper para VS Code sobre o backend semântico já produzido por `sbd-toe-knowledge-graph`.

O seu papel não é reconstruir o manual, nem repetir a lógica do builder.
Também não é substituir o chat do VS Code. O seu papel é fornecer grounding, contexto, citações e prompting para que o chat responda melhor.

Este repositório deve ser tratado como:

- consumidor do backend semântico
- cliente de retrieval sobre snapshot semântico local
- compositor de contexto
- adaptador MCP para prompts e sampling do cliente
- integração MCP/VS Code
- camada de resposta grounded com debug

Em termos simples:

- o projeto anterior constrói o conhecimento
- este projeto consome esse conhecimento e expõe uma interface útil ao utilizador dentro do VS Code
- o modelo final continua a ser o do utilizador, configurado no chat do VS Code

## Responsabilidades

- receber perguntas do utilizador
- obter do upstream o snapshot publicado dos índices
- consultar os índices certos pela ordem certa
- montar contexto útil e compacto
- expor contexto grounded ao chat do VS Code
- devolver ao chat os records relevantes para perguntas concretas de engenharia e compliance
- pedir `sampling` ao modelo configurado no cliente quando fizer sentido
- devolver resposta em PT-PT
- citar records recuperados
- expor modo debug com retrieval e prompt
- integrar isso como MCP/wrapper para uso no VS Code

## Não Responsabilidades

Este repositório não deve:

- reparsear o manual Markdown
- reconstruir bundles semânticos
- reinventar `chapter_id`, `document_id`, `section_id` ou `practice_id`
- extrair entidades do corpus
- publicar índices
- substituir o `knowledge builder`
- substituir o chat do VS Code
- reduzir o projeto anterior a um simples “cliente Algolia”

## Fonte de Verdade

`sbd-toe-knowledge-graph` deve ser tratado como:

- `knowledge builder`
- `semantic indexing pipeline`
- `retrieval backend`

Este repositório deve tratar esse backend como fonte de verdade para:

- provenance
- identidade semântica
- records documentais
- records estruturados
- prioridades de retrieval
- snapshot publicado em `data/publish`

Não introduzir novos identificadores semânticos se já existirem no snapshot.
Não alterar a semântica do retrieval para “inventar” relações que o backend não produziu.

## Modelo de Interação Esperado

O fluxo esperado é:

1. o utilizador faz uma pergunta no chat do VS Code
2. o chat usa este MCP para recuperar contexto relevante
3. este repositório devolve records, citações, capítulos e links de página quando existirem
4. o modelo do utilizador gera a resposta final grounded nesse contexto

Opcionalmente, o servidor pode pedir `sampling` ao cliente MCP, mas continua a usar o modelo do utilizador e não um modelo próprio do servidor.

## Ordem de Retrieval Esperada

1. `SbD-ToE-ASKAI-Docs`
2. `SbD-ToE-ASKAI-Entities`

Use `Docs` como fonte principal para respostas conceptuais, operacionais e normativas.
Use `Entities` para clarificar relações entre papel, fase, prática, artefacto e risco.

## Comportamento Esperado do Cliente MCP

O cliente deve:

- responder apenas com base no contexto recuperado
- preferir PT-PT
- dizer explicitamente quando a evidência é insuficiente
- citar `objectID` ou equivalente de provenance
- devolver links de página apenas quando forem determinísticos
- não inventar anchors ou URLs de secção
- expor debug útil ao programador/utilizador

## O que Vale Neste Repositório

O valor principal deste projeto não está em escrever um cliente Algolia genérico.

O valor está em:

- escolher bem o contexto
- preservar grounding
- compor boas respostas
- mostrar citações
- orientar o chat do VS Code com prompts adequados
- tornar o backend útil dentro do VS Code

## Classificação de Risco do Projeto

Este projeto encaixa em **L1 — risco baixo** no modelo SbD-ToE E+D+I:

- **Exposição (E=1):** transporte `stdio` local, sem endpoint de rede exposto
- **Dados (D=1):** documentação pública, sem dados pessoais ou regulados por desenho
- **Impacto (I=1):** ferramenta consultiva local, sem escrita em sistemas externos e sem delegação automática de decisão

Rever a classificação se o servidor passar a:

- expor HTTP ou uso multi-utilizador
- processar dados pessoais, segredos de terceiros, ou informação organizacional sensível
- influenciar decisões automatizadas com impacto real

## Ordem de Aplicação do Manual Neste Projeto

Ao trabalhar neste repositório, aplicar o manual SbD-ToE por esta ordem:

1. **Cap. 01 — Classificação de Criticidade**
	- determinar ou rever a classificação E+D+I antes de decidir controlos
	- usar L1 como baseline atual, salvo evidência de alteração material
2. **Cap. 02 — Requisitos de Segurança**
	- selecionar requisitos proporcionais ao risco
	- documentar requisitos ativos, validação, evidência e exceções formais
3. **Cap. 05 — Dependências, SBOM e SCA**
	- aplicar quando há dependências externas, lockfiles, package managers ou risco de supply chain
4. **Cap. 06 — Desenvolvimento Seguro**
	- aplicar a todo o código TypeScript, scripts, prompts e lógica de validação do MCP
5. **Cap. 07 — CI/CD Seguro**
	- aplicar porque este repositório possui pipelines GitHub Actions reais
6. **Cap. 10 — Testes de Segurança**
	- aplicar de forma proporcional porque existem validações automáticas e scanning no pipeline
7. **Cap. 11 — Deploy Seguro**
	- aplicar de forma leve porque existe workflow de `release`, geração de bundle e publicação de artefactos
8. **Cap. 03 / Cap. 04 / Cap. 12 / Cap. 14**
	- aplicar de forma proporcional para threat modeling simplificado, arquitetura segura, logging/operações e governação

Não começar por listar controlos técnicos soltos. Começar sempre por classificação, depois requisitos, e só depois capítulos técnicos especializados.

## Como Aplicar o Capítulo 02 do SbD-ToE

O Capítulo 02 não deve ser reduzido a “log” ou “autenticação”.
O catálogo de requisitos é aplicado por seleção proporcional ao risco, com rastreabilidade, validação, evidência e gestão de exceções.

Ao trabalhar neste repositório, seguir sempre estas regras:

1. Selecionar requisitos proporcionais ao nível de risco do projeto.
2. Manter rastreabilidade entre requisito, código, validação e evidência.
3. Definir critérios de aceitação verificáveis para cada requisito ativo.
4. Documentar exceções formais com justificação e TTL.
5. Integrar validação automatizável no CI/CD quando aplicável.
6. Tratar output gerado por IA como código de terceiros: sujeito a revisão, validação e responsabilização humana.

## Catálogo Completo de Temas SbD-ToE (T01–T20)

O manual organiza os requisitos de segurança em **20 temas técnicos**. Não assumir que o âmbito se limita aos domínios visíveis neste projeto.

| Código | Tema |
|---|---|
| T01 | Autenticação e Gestão de Identidade |
| T02 | Controlo de Acesso |
| T03 | Registo, Auditoria e Monitorização |
| T04 | Gestão de Sessões |
| T05 | Validação e Sanitização de Dados |
| T06 | Proteção de Dados Sensíveis |
| T07 | Criptografia e Gestão de Chaves |
| T08 | Tratamento de Erros e Mensagens |
| T09 | Segurança de APIs e Integrações |
| T10 | Configuração Segura |
| T11 | Segurança do Código e Build |
| T12 | Gestão de Dependências e SBOM |
| T13 | CI/CD Seguro |
| T14 | Infraestrutura como Código |
| T15 | Containers e Execução Isolada |
| T16 | Deploy, Release e Runtime Controls |
| T17 | Testes de Segurança |
| T18 | Monitorização Contínua e Alertas |
| T19 | Formação, Onboarding e Perfis |
| T20 | Governança, Revisões e Conformidade |

Quando uma alteração tocar um destes temas, usar o MCP SbD-ToE para recuperar o requisito e os critérios de aceitação correspondentes antes de editar.

## Domínios-Base Consultáveis Diretamente no Catálogo de Requisitos

O catálogo base consultável diretamente pelo MCP expõe pelo menos estes domínios estruturados com IDs, níveis, validação recomendada e evidência esperada:

- `AUT` — Autenticação e Identidade
- `ACC` — Controlo de Acesso
- `LOG` — Registo e Monitorização
- `SES` — Sessões e Estado
- `VAL` — Validação de Dados
- `ERR` — Gestão de Erros
- `CFG` — Configuração Segura
- `API` — Segurança de APIs
- `INT` — Mensagens e Integrações
- `REQ` — Definição de Requisitos
- `DST` — Distribuição de Artefactos
- `IDE` — Ferramentas de Desenvolvimento

Estes domínios devem ser entendidos como **baseline mínima**. Outros capítulos do manual aprofundam ou especializam o controlo nos temas T11–T20.

## Leitura Prática para Este Projeto

Para `sbd-toe-mcp-poc`, os temas com maior relevância direta são:

- T01/T02/T04: porque há configuração, credenciais e superfície MCP, mesmo sem login próprio
- T03: logging, auditabilidade e debug seguro
- T05/T08: validação de inputs MCP, sanitização e erro seguro
- T09/T10: integrações seguras, URLs e configuração segura
- T11/T12/T13: qualidade de código, dependências, CI/CD e proveniência
- T20: rastreabilidade, revisões, exceções e conformidade

### Capítulos diretamente aplicáveis no estado atual

Os seguintes capítulos devem ser considerados **diretamente aplicáveis** neste projeto:

- **Cap. 01 — Classificação da Criticidade Aplicacional**
- **Cap. 02 — Requisitos de Segurança**
- **Cap. 05 — Dependências, SBOM e SCA**
- **Cap. 06 — Desenvolvimento Seguro**
- **Cap. 07 — CI/CD Seguro**
- **Cap. 10 — Testes de Segurança**

Aplicação leve, mas ainda relevante:

- **Cap. 03 — Threat Modeling**
- **Cap. 04 — Arquitetura Segura**
- **Cap. 11 — Deploy Seguro**
- **Cap. 12 — Monitorização & Operações**
- **Cap. 14 — Governança, Revisões e Conformidade**

### Evidência concreta de aplicabilidade de CI/CD

Este repositório tem pipelines GitHub Actions reais em:

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/release.yml`

Consequentemente, ao editar código, scripts, packaging ou workflows, considerar explicitamente controlos de:

- proteção de branches e revisão mínima
- SAST e security scanning no pipeline
- secrets scanning e higiene de outputs
- build verification antes de release
- proveniência, artefactos e release hardening
- supply chain de dependências npm e scripts de build

### Evidência concreta de aplicabilidade de release/deploy seguro

Este repositório tem um workflow de release em `.github/workflows/release.yml` que:

- valida o commit taggado com `npm run check` e `npm run build`
- verifica que a tag aponta para um commit contido em `master`
- gera um bundle de release com `scripts/package-release.mjs`
- publica artefactos no GitHub Release

Isto **não é deploy para runtime**, mas é uma forma de promoção e distribuição de artefactos. Consequentemente, aplicar um subconjunto proporcional do **Cap. 11 — Deploy Seguro**, sobretudo em:

- critérios de readiness pré-release
- integridade e rastreabilidade dos artefactos publicados
- gates de aprovação para publicação
- hygiene de credenciais e outputs no processo de release
- reversibilidade e controlo sobre o que é promovido/publicado

T06, T07, T14, T15, T16, T17, T18 e T19 podem tornar-se relevantes se o repositório evoluir ou se a alteração tocar nesses temas.

## Requisitos Ativos e Condicionais para Este Projeto

### Ativos por desenho atual

- `AUT-006` — proibição de credenciais por omissão
- `ACC-002` — menor privilégio
- `ACC-005` — controlo de acesso a APIs e serviços
- `LOG-001` / `LOG-002` / `LOG-003` — eventos críticos, atributos mínimos e proteção de logs
- `SES-004` — transporte seguro
- `VAL-001` / `VAL-002` / `VAL-004` — validação geral, allowlists, sanitização contra injeções
- `ERR-*` — mensagens de erro seguras e sem stack trace para o cliente
- `CFG-*` — configuração segura e separação entre código e configuração
- `REQ-*` — requisitos versionados, rastreáveis e auditáveis
- controlos de **Cap. 05** para dependências, SCA e SBOM proporcionais a L1
- controlos de **Cap. 06** para validação do código, origem do código e revisão humana
- controlos de **Cap. 07** para CI/CD seguro porque existem workflows GitHub Actions ativos
- controlos de **Cap. 10** para testes/scanning proporcionais a L1
- controlos de **Cap. 11** para release seguro, integridade e readiness pré-publicação

### Condicionais ou futuras

- `AUT-001` a `AUT-005` e `SES-001` a `SES-003` só se tornam diretamente aplicáveis se existir autenticação ou sessão real
- `API-*` e `INT-*` reforçam-se se houver integrações externas adicionais
- `DST-*` e `IDE-*` ganham peso se houver distribuição de binários, extensões, ou toolchain adicional
- T14–T18 tornam-se obrigatórios se este repositório passar a gerir pipeline, deploy, runtime, IaC ou monitorização operacional

### Exceções formais esperadas no estado atual

Os seguintes controlos podem ser inaplicáveis no estado atual, mas **não devem ser ignorados sem justificação**:

- MFA
- política de passwords
- brute force
- revogação e expiração de sessão HTTP
- RBAC multi-perfil

Se forem considerados fora de âmbito, documentar a exceção com racional técnico e rever quando o contexto mudar.

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

## Referências SbD-ToE a Consultar com Frequência

- Cap. 01 — Classificação de Criticidade
- Cap. 02 — Requisitos de Segurança
- Cap. 02 — Lista de Requisitos Base
- Cap. 02 — Critérios de Aceitação
- Cap. 02 — Validação de Requisitos
- Cap. 02 — Aplicação no Ciclo de Vida
- `docs/role.md` deste repositório

Se houver conflito entre uma mudança “engenhosamente útil” e o papel do repositório, prevalece `docs/role.md`.

