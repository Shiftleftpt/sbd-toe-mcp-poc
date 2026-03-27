---
version: "2.0"
date: "2026-03-27"
risk-level: "L2"
source: "Manual SbD-ToE Cap. 02 — Catálogo de Requisitos de Segurança"
status: "active"
review-due: "2026-09-27"
---

# Catálogo de Requisitos de Segurança — sbd-toe-mcp

Catálogo versionado derivado do Manual SbD-ToE Cap. 02, filtrado pela classificação **L2**.
Identificadores canónicos do manual (ACC-*, LOG-*, etc.) são a fonte primária.
Os REQ-XXX são referências locais do projecto para rastreabilidade em código e testes.

---

## Como ler este documento

| Coluna | Significado |
|---|---|
| ID manual | Identificador canónico do Cap. 02 |
| REQ | Referência local do projecto (para anotações `@sec:REQ-XXX` no código) |
| Estado | ✅ Activo · ⚠️ Parcial · ❌ Em falta · — Excepção formal |

---

## ACC — Controlo de Acesso

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| ACC-002 | REQ-ACC-02 | Princípio do menor privilégio | X | ✅ Activo | Contas/processos não têm permissões desnecessárias; auditoria evidencia restrições aplicadas | `contents: write` apenas no job de release; restantes workflows com `contents: read` |
| ACC-005 | REQ-ACC-05 | Controlo de acesso a APIs e serviços | X | ✅ Activo | Acesso a APIs externas controlado; sem acesso anónimo a recursos restritos | HTTPS enforced; `ALLOWED_ASSET_URL_PREFIXES` limita chamadas ao GitHub API |
| ACC-001 | — | Controlo de acesso RBAC | X | — Excepção | Sem sistema de auth/perfis no estado actual | Ver secção Excepções Formais |
| ACC-003 | — | Bloqueio e auditoria de acessos ilegítimos | X | — Excepção | Sem endpoints de autenticação | Ver secção Excepções Formais |
| ACC-004 | — | Separação de perfis | X | — Excepção | Sem perfis de utilizador no estado actual | Ver secção Excepções Formais |

---

## LOG — Registo e Monitorização

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| LOG-001 | REQ-LOG-01 | Registo de eventos críticos | X | ⚠️ Parcial | Logs registam acessos, alterações e falhas de segurança críticas | Logging via `stderr` presente; chamadas à LLM API **não registadas** — gap |
| LOG-002 | REQ-LOG-02 | Atributos mínimos em logs | X | ⚠️ Parcial | Cada log inclui quem, quando, o quê e onde | `stderr` não estruturado; sem timestamp nem tipo de evento padronizado |
| LOG-003 | REQ-LOG-03 | Protecção de integridade e acesso aos logs | X | ✅ Activo (proporcional) | Logs não alteráveis por entidades externas ao sistema | `stderr` local; não acessível por clientes MCP |
| LOG-004 | REQ-LOG-04 | Análise periódica de logs | X | — Excepção | Revisão periódica dos logs de segurança | Sem mecanismo de análise — proporcional ao contexto PoC local; rever em produção |
| LOG-005 | REQ-LOG-05 | Retenção mínima dos logs | X | ⚠️ Parcial | Logs retidos pelo período mínimo definido por política | `stderr` não persistido; sem política de retenção definida |

---

## VAL — Validação de Dados

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| VAL-001 | REQ-VAL-01 | Validação geral de entradas externas | X | ✅ Activo | Inputs inválidos são rejeitados; logs evidenciam bloqueio | Validação de tipo e comprimento em `src/tools/structured-tools.ts` |
| VAL-002 | REQ-VAL-02 | Uso de whitelists em vez de blacklists | X | ✅ Activo | Apenas valores explícitos/aceites são permitidos; teste evidencia rejeição de valores fora da lista | Allowlists para enums em todos os tools; `VALID_REPO_TYPES`, `VALID_RISK_LEVELS`, etc. |
| VAL-003 | REQ-VAL-03 | Validadores de esquema (JSON/XML schema) | X | ⚠️ Parcial | Inputs validados contra esquema formal; rejeição em caso de violação | TypeScript types e Zod-style validation present; sem JSON Schema formal publicado |
| VAL-004 | REQ-VAL-04 | Sanitização contra injeções | X | ✅ Activo | Inputs sanitizados antes de processamento; testes cobrem vectores de injecção comuns | Sem execução de código nos inputs; `shell: false` no bootstrap; sem SQL/HTML no contexto |

---

## ERR — Gestão de Erros

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| ERR-001 | REQ-ERR-01 | Erros não expõem dados sensíveis | X | ✅ Activo | Mensagens de erro sem dados sensíveis; logs internos detalhados, cliente vê mensagem abstrata | Erros sanitizados antes de retornar ao cliente MCP |
| ERR-002 | REQ-ERR-02 | Mensagens genéricas no cliente | X | ✅ Activo | Cliente recebe sempre mensagem genérica; detalhe apenas em logs internos | Implementado em error handling dos tools |
| ERR-003 | REQ-ERR-03 | Não revelar existência de recursos | X | ✅ Activo (proporcional) | Erros de "não encontrado" não revelam estrutura interna | Aplicável a paths de snapshot; sem enumeração de recursos |
| ERR-004 | REQ-ERR-04 | Mensagens localizadas e seguras | X | ✅ Activo | Mensagens de erro não contêm dados de sessão, tokens ou paths absolutos | Paths absolutos apenas em `debugMode` — gap menor (I-01 em threat-model) |
| ERR-005 | REQ-ERR-05 | Gestão padronizada e centralizada | X | ✅ Activo (proporcional) | Tratamento de erros centralizado; sem `catch` silencioso | Error handling nos tools e orchestrator |

---

## CFG — Configuração Segura

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| CFG-001 | REQ-CFG-01 | Debug e flags desativados em produção | X | ⚠️ Parcial | Parâmetros de debug, trace, dev_mode desligados em produção | `debugMode` flag existe; quando activo expõe paths absolutos — gap (I-01 em threat-model) |
| CFG-002 | REQ-CFG-02 | Separação de ambientes com validação automática | X | ✅ Activo (proporcional) | Deploys/testes apenas possíveis em ambientes segregados | `.env` separado de `.env.example`; CI não usa secrets de produção |
| CFG-003 | REQ-CFG-03 | Sem hardcoded de parâmetros | X | ✅ Activo | Parâmetros sensíveis não hardcoded no código | CI verifica ausência de `.env` com `validate-ai-disclosure.mjs` |
| CFG-004 | REQ-CFG-04 | Configuração externa e com permissões controladas | X | ✅ Activo | Configuração carregada externamente; ficheiros com permissões controladas | `.env` externo ao código; `src/config.ts` com CODEOWNERS |

---

## AUT — Autenticação e Identidade

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| AUT-006 | REQ-AUT-06 | Proibição de credenciais por omissão | X | ✅ Activo | Sistema não funciona com credenciais por defeito; obriga configuração explícita | `.env.example` sem valores de produção; API keys não têm defaults inseguros |
| AUT-001 | — | MFA obrigatório | X | — Excepção | Sem sistema de autenticação de utilizadores | Ver secção Excepções Formais |
| AUT-002 | — | Política de passwords | X | — Excepção | Sem gestão de credenciais de utilizadores | Ver secção Excepções Formais |
| AUT-003 | — | Protecção contra brute force | X | — Excepção | Sem endpoints de autenticação | Ver secção Excepções Formais |
| AUT-004 | — | Revogação activa de sessões | X | — Excepção | Sem sessões de utilizador | Ver secção Excepções Formais |
| AUT-005 | — | Expiração automática de sessão | X | — Excepção | Sem sessões de utilizador | Ver secção Excepções Formais |

---

## SES — Sessões e Estado

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| SES-004 | REQ-SES-04 | Transmissão segura dos tokens | X | ✅ Activo | Tokens/credenciais transmitidos apenas via canal seguro (HTTPS/TLS) | GitHub API e LLM API via HTTPS; `ALLOWED_ASSET_URL_PREFIXES` enforced |
| SES-001 | — | Expiração automática por inactividade | X | — Excepção | Sem sessões HTTP no estado actual | Ver secção Excepções Formais |
| SES-002 | — | Logout manual | X | — Excepção | Sem sessões HTTP | Ver secção Excepções Formais |
| SES-003 | — | Identificadores de sessão imprevisíveis | X | — Excepção | Sem sessões HTTP | Ver secção Excepções Formais |

---

## DST — Distribuição de Artefactos

| ID manual | REQ | Nome | L2 | Estado | Critério (manual) | Evidência no projecto |
|---|---|---|---|---|---|---|
| DST-001 | REQ-DST-01 | Repositórios autenticados e auditáveis | X | ✅ Activo | Autenticação obrigatória e logs activos para aceder a artefactos | GitHub Releases autenticado; npm registry com autenticação no publish |
| DST-002 | REQ-DST-02 | Aprovação para publicação pública | X | ✅ Activo | Publicação em registry público requer aprovação/documentação formal | `release.yml` — tag verifica commit em `master`; aprovação implícita no PR |
| DST-003 | REQ-DST-03 | Assinatura digital ou checksum | X | ❌ Em falta | Artefactos assinados ou com checksum verificável pelo consumidor | Sem checksum publicado para release assets — gap (S-01 em threat-model) |
| DST-004 | REQ-DST-04 | Inclusão de SBOM nos artefactos | X | ❌ Em falta | SBOM incluído ou publicado junto ao artefacto de release | Ver [`sbom-policy.md`](sbom-policy.md) para plano de implementação |

---

## Excepções Formais

Os seguintes requisitos são inaplicáveis no estado actual. Rever quando o contexto mudar.

| ID manual | Justificação | Condição de reavaliação |
|---|---|---|
| ACC-001, ACC-003, ACC-004 | Sem sistema de autenticação nem perfis de utilizador por desenho | Adicionar auth de utilizadores ao MCP |
| AUT-001 a AUT-005 | Sem sistema de autenticação nem sessões de utilizador | Adicionar auth de utilizadores ao MCP |
| SES-001, SES-002, SES-003 | Sem transporte HTTP nem sessões de utilizador | Transporte mudar de stdio para HTTP/WebSocket |
| LOG-004 | Sem mecanismo de análise periódica no contexto PoC local | Transição para uso em produção |

---

## Matriz de Rastreabilidade

| REQ | Ameaça (threat-model) | Controlo (controlos-l2) |
|---|---|---|
| REQ-ACC-02 | — | CTRL-ACCESS-001, CTRL-ACCESS-002 |
| REQ-ACC-05 | S-01, S-02 | CTRL-ACCESS-002 |
| REQ-LOG-01 | R-01, R-02 | — |
| REQ-LOG-02 | R-01, R-02 | — |
| REQ-LOG-03 | R-01 | — |
| REQ-VAL-01 | T-03 | CTRL-QUALITY-001, CTRL-CICD-002 |
| REQ-VAL-02 | T-03 | CTRL-QUALITY-001 |
| REQ-VAL-03 | T-03 | CTRL-QUALITY-001 |
| REQ-VAL-04 | T-03, E-01, E-02 | CTRL-CICD-002 |
| REQ-ERR-01 | I-01, I-03 | CTRL-QUALITY-001 |
| REQ-ERR-04 | I-01 | CTRL-QUALITY-001 |
| REQ-CFG-01 | I-01 | CTRL-QUALITY-001 |
| REQ-CFG-03 | I-02 | CTRL-SECRETS-001 |
| REQ-CFG-04 | I-02 | CTRL-SECRETS-001 |
| REQ-AUT-06 | I-02 | CTRL-SECRETS-001 |
| REQ-SES-04 | S-01 | CTRL-SUPPLY-001 |
| REQ-DST-01 | T-02 | CTRL-CICD-001, CTRL-ACCESS-001 |
| REQ-DST-02 | T-02 | CTRL-CICD-001 |
| REQ-DST-03 | S-01, T-01 | CTRL-SUPPLY-002 |
| REQ-DST-04 | T-05 | CTRL-SUPPLY-002 |
