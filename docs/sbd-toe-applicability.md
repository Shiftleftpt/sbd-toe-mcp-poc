# SbD-ToE — Aplicabilidade a `sbd-toe-mcp-poc`

Documento de referência. Não é lido em cada contexto — é consultado quando necessário.
Para o papel e responsabilidades do repositório, ver [`docs/role.md`](role.md).

---

## Classificação de Risco

**L1 — risco baixo** no modelo SbD-ToE E+D+I:

- **E=1:** transporte `stdio` local, sem endpoint de rede exposto
- **D=1:** documentação pública, sem dados pessoais ou regulados por desenho
- **I=1:** ferramenta consultiva local, sem escrita em sistemas externos nem delegação automática de decisão

Rever se o servidor passar a expor HTTP, processar dados pessoais ou segredos, ou influenciar decisões automatizadas com impacto real.

---

## Ordem de Aplicação do Manual Neste Projeto

1. **Cap. 01 — Classificação de Criticidade** — determinar/rever E+D+I antes de decidir controlos; L1 é baseline atual
2. **Cap. 02 — Requisitos de Segurança** — selecionar requisitos proporcionais; documentar ativos, validação, evidência e exceções
3. **Cap. 05 — Dependências, SBOM e SCA** — lockfiles, package managers, supply chain npm
4. **Cap. 06 — Desenvolvimento Seguro** — TypeScript em `src/`, scripts, prompts, validação MCP
5. **Cap. 07 — CI/CD Seguro** — workflows GitHub Actions reais
6. **Cap. 10 — Testes de Segurança** — CodeQL, quality gates, scanning pré-release
7. **Cap. 11 — Deploy Seguro** (proporcional) — release workflow, bundle, artefactos GitHub Release
8. **Cap. 03 / Cap. 04 / Cap. 12 / Cap. 14** — proporcional: threat modeling, arquitetura, logging/operações, governação

Não começar por listar controlos técnicos soltos. Começar sempre por classificação → requisitos → capítulo técnico.

---

## Como Aplicar o Cap. 02

O catálogo de requisitos é aplicado por seleção proporcional, com rastreabilidade, validação, evidência e gestão de exceções.

1. Selecionar requisitos proporcionais ao nível de risco.
2. Manter rastreabilidade entre requisito, código, validação e evidência.
3. Definir critérios de aceitação verificáveis para cada requisito ativo.
4. Documentar exceções formais com justificação e TTL.
5. Integrar validação automatizável no CI/CD quando aplicável.
6. Tratar output gerado por IA como código de terceiros: sujeito a revisão, validação e responsabilização humana.

---

## Catálogo Completo de Temas SbD-ToE (T01–T20)

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

---

## Domínios-Base Consultáveis no Catálogo de Requisitos

| Código | Domínio |
|---|---|
| `AUT` | Autenticação e Identidade |
| `ACC` | Controlo de Acesso |
| `LOG` | Registo e Monitorização |
| `SES` | Sessões e Estado |
| `VAL` | Validação de Dados |
| `ERR` | Gestão de Erros |
| `CFG` | Configuração Segura |
| `API` | Segurança de APIs |
| `INT` | Mensagens e Integrações |
| `REQ` | Definição de Requisitos |
| `DST` | Distribuição de Artefactos |
| `IDE` | Ferramentas de Desenvolvimento |

Estes domínios são baseline mínima. Cap. 11–20 aprofundam ou especializam controlos nos temas T11–T20.

---

## Leitura Prática para Este Projeto

- **T02:** ACC-002 (menor privilégio) e ACC-005 (acesso a APIs) são ativos por desenho
- **T01/T04:** AUT-006 (proibição de credenciais por omissão) e SES-004 (transporte seguro) são ativos; controlos de autenticação e sessão completos são condicionais — só aplicáveis com auth/sessão real
- **T03:** logging, auditabilidade e debug seguro
- **T05/T08:** validação de inputs MCP, sanitização e erro seguro
- **T09/T10:** integrações seguras, URLs e configuração segura
- **T11/T12/T13:** qualidade de código, dependências, CI/CD e proveniência
- **T20:** rastreabilidade, revisões, exceções e conformidade

---

## Capítulos Diretamente Aplicáveis no Estado Atual

| Capítulo | Estado | Evidência no repositório |
|---|---|---|
| Cap. 01 — Classificação | Diretamente aplicável | Classificação L1 documentada |
| Cap. 02 — Requisitos | Diretamente aplicável | Requisitos ativos listados abaixo |
| Cap. 05 — Dependências/SCA | Diretamente aplicável | `package-lock.json`, `dependabot.yml` |
| Cap. 06 — Desenvolvimento Seguro | Diretamente aplicável | `src/` TypeScript, validação, prompts |
| Cap. 07 — CI/CD Seguro | Diretamente aplicável | `ci.yml`, `codeql.yml`, `release.yml` |
| Cap. 10 — Testes de Segurança | Diretamente aplicável | CodeQL SAST (`security-and-quality`) |
| Cap. 03 — Threat Modeling | Aplicação leve | — |
| Cap. 04 — Arquitetura Segura | Aplicação leve | fronteiras `stdout`/`stderr`, stdio |
| Cap. 11 — Deploy Seguro | Aplicação leve | `release.yml` — artifact promotion |
| Cap. 12 — Monitorização | Aplicação leve | `stderr` logging |
| Cap. 14 — Governança | Aplicação leve | rastreabilidade, exceções formais |

---

## Evidência de CI/CD

`.github/workflows/ci.yml` — type check + build + smoke test (PR + push a master)
`.github/workflows/codeql.yml` — CodeQL SAST, queries `security-and-quality`, semanal + PR/push
`.github/workflows/release.yml` — tag `v*.*.*`: check + build + verificação de proveniência + bundle + GitHub Release

Controlos confirmados:
- SAST via CodeQL — único scanner configurado no estado atual
- `dependabot.yml` — actualizações automáticas de dependências npm
- higiene de outputs — secrets scanning dedicado **não está configurado** (gap a considerar)
- `contents: write` apenas no workflow de release; restantes com `contents: read`

---

## Evidência de Release/Deploy Seguro

`release.yml`:
- valida commit taggado com `npm run check` + `npm run build`
- verifica que a tag aponta para um commit contido em `master`
- gera bundle via `scripts/package-release.mjs`
- publica artefactos no GitHub Release

Não é deploy para runtime. É promoção e distribuição de artefactos. Aplicar Cap. 11 proporcionalmente:
- critérios de readiness pré-release
- integridade e rastreabilidade dos artefactos publicados
- hygiene de credenciais e outputs no processo de release

---

## Requisitos Ativos por Desenho Atual

- `AUT-006` — proibição de credenciais por omissão
- `ACC-002` — menor privilégio
- `ACC-005` — controlo de acesso a APIs e serviços
- `LOG-001` / `LOG-002` / `LOG-003` — eventos críticos, atributos mínimos, proteção de logs
- `SES-004` — transporte seguro
- `VAL-001` / `VAL-002` / `VAL-004` — validação geral, allowlists, sanitização contra injeções
- `ERR-*` — mensagens de erro seguras, sem stack trace para o cliente
- `CFG-*` — configuração segura, separação entre código e configuração
- `REQ-*` — requisitos versionados, rastreáveis e auditáveis
- Cap. 05 — dependências, SCA e SBOM proporcionais a L1
- Cap. 06 — validação do código, origem, revisão humana
- Cap. 07 — CI/CD seguro (workflows GitHub Actions ativos)
- Cap. 10 — testes/scanning proporcionais a L1
- Cap. 11 — release seguro, integridade e readiness pré-publicação

---

## Requisitos Condicionais ou Futuros

- `AUT-001` a `AUT-005` e `SES-001` a `SES-003` — só aplicáveis com autenticação ou sessão real
- `API-*` e `INT-*` — reforçam-se com integrações externas adicionais
- `DST-*` e `IDE-*` — ganham peso com distribuição de binários, extensões ou toolchain adicional
- T14–T18 — obrigatórios se o repositório passar a gerir IaC, containers, runtime ou monitorização operacional

---

## Exceções Formais Esperadas no Estado Atual

Os seguintes controlos são inaplicáveis no estado atual mas não devem ser ignorados sem justificação:

- MFA
- política de passwords
- proteção contra brute force
- revogação e expiração de sessão HTTP
- RBAC multi-perfil

Documentar a exceção com racional técnico e rever quando o contexto mudar.
