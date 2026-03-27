---
version: "1.1"
date: "2026-03-27"
methodology: "STRIDE"
risk-level: "L2"
status: "active"
review-due: "2026-09-27"
---

# Threat Model — sbd-toe-mcp

Modelo de ameaças proporcional ao nível L2, usando metodologia STRIDE. Aplicável ao servidor MCP `@shiftleftpt/sbd-toe-mcp`.

Ameaças estão ligadas aos requisitos de segurança em [`requisitos.md`](requisitos.md).

---

## Âmbito

### Sistema

Servidor MCP (Model Context Protocol) que expõe tools de consulta ao Manual SbD-ToE para clientes LLM (Claude Code, GitHub Copilot, outros).

### Fronteiras de Confiança

```
[Cliente MCP / LLM]
        |
        | stdio (local, sem rede)
        |
[sbd-toe-mcp process]
        |
        |---> [Snapshots locais] (algolia_docs_records.json, algolia_entities_records.json)
        |
        |---> [GitHub API] (download de release assets em bootstrap)
        |
        |---> [LLM API] (claude-*/openai-* para ask-manual orchestration)
        |
        |---> [npm registry] (instalação de dependências)
```

### Ativos

| Ativo | Classificação | Notas |
|---|---|---|
| Snapshots do manual | Público | Documentação SbD-ToE — sem sensibilidade |
| Release assets (GitHub) | Público | Bundles de release versionados |
| Configuração (`.env`) | Interno | API keys para LLM (se configuradas) |
| Processo MCP em execução | Interno | Runtime local do utilizador |
| Outputs/respostas do MCP | Interno | Contexto de segurança fornecido ao LLM |

---

## Análise STRIDE

### S — Spoofing (Falsificação de Identidade)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| S-01 | Release asset falsificado injetado no bootstrap | GitHub API / release checkout | Baixa | Alto | URL whitelist (`ALLOWED_ASSET_URL_PREFIXES`); path validation (`assertSafeDestPath()`). **Sem verificação de checksum — gap.** | REQ-DST-03, REQ-ACC-05 |
| S-02 | Cliente MCP malicioso a impersonar LLM legítimo | Transporte stdio | Baixa | Médio | stdio local — só o processo pai pode conectar; sem autenticação adicional necessária no contexto atual | REQ-ACC-05 |

### T — Tampering (Adulteração)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| T-01 | Adulteração dos snapshots locais em disco | Ficheiros JSON de snapshot | Baixa | Médio | Ficheiros em diretório de dados local. Sem verificação de integridade em runtime — gap aceite | REQ-DST-03 |
| T-02 | Adulteração do bundle de release | GitHub Release assets | Muito baixa | Alto | `release.yml` verifica que tag aponta para commit em `master`; `persist-credentials: false` | REQ-DST-01, REQ-DST-02 |
| T-03 | Injeção de conteúdo malicioso via query MCP | Tool inputs | Média | Médio | Validação de comprimento e tipo; sem execução de código nos inputs | REQ-VAL-01, REQ-VAL-02, REQ-VAL-04 |
| T-04 | Prompt injection via conteúdo do manual influenciar LLM | Respostas MCP → LLM | Média | Médio | Conteúdo do manual é documentação interna controlada. Risco residual aceite — ver abaixo | REQ-VAL-04 |
| T-05 | Dependência npm comprometida injetada na supply chain | npm registry / `package-lock.json` | Baixa | Alto | Dependabot activo; `npm audit` em CI; `package-lock.json` versionado. Sem allowlist formal — gap | REQ-DST-04 |

### R — Repudiation (Repúdio)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| R-01 | Ausência de log estruturado de queries MCP | Runtime | Média | Baixo | Logging via `stderr` presente mas não estruturado nem persistido | REQ-LOG-01, REQ-LOG-02 |
| R-02 | Chamadas à LLM API sem registo auditável | `ask-manual` orchestrator | Média | Médio | Não existe log do que foi enviado a que modelo, com que contexto e quando — gap de auditabilidade | REQ-LOG-01, REQ-LOG-02 |

### I — Information Disclosure (Divulgação de Informação)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| I-01 | Exposição de paths absolutos em modo debug | `ask-manual.ts:75-76` | Média | Baixo | Debug output inclui `upstreamRepoPath`, `docsSnapshotFile` — apenas em `debugMode` | REQ-ERR-04, REQ-CFG-01 |
| I-02 | API key LLM exposta via `.env` | Configuração | Baixa | Alto | `.env` no `.gitignore`; CI verifica ausência; `.env.example` documentado | REQ-AUT-06, REQ-CFG-03, REQ-CFG-04 |
| I-03 | Stack traces expostos ao cliente MCP | Error handling | Baixa | Baixo | Erros sanitizados antes de retornar ao cliente | REQ-ERR-01, REQ-ERR-02 |

### D — Denial of Service (Negação de Serviço)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| D-01 | Spam de queries para saturar memória | Tools MCP | Média | Médio | Sem rate limiting implementado; snapshots carregados integralmente em memória — gap | REQ-VAL-01 |
| D-02 | Query com padrão patológico causar processamento excessivo | `semantic-index-gateway.ts` | Baixa | Baixo | Validação de comprimento (max 200 chars); sem execução de regex dinâmico nos inputs | REQ-VAL-01, REQ-VAL-04 |

### E — Elevation of Privilege (Elevação de Privilégio)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| E-01 | Path traversal durante extração de release | `release-checkout.ts` | Muito baixa | Alto | `assertSafeDestPath()` valida destino; `KNOWN_FILES` whitelist para extração | REQ-VAL-04 |
| E-02 | Command injection via argumentos do processo | `spawnSync` em bootstrap | Muito baixa | Alto | `shell: false` — sem interpolação de shell; argumentos fixos | REQ-VAL-04 |

---

## Riscos Residuais Aceites

| ID | Risco | Justificação |
|---|---|---|
| T-01 | Snapshots locais sem checksum em runtime | Atacante com acesso local já tem acesso ao sistema completo; risco proporcional ao contexto PoC |
| T-04 | Prompt injection via conteúdo do manual | Manual é conteúdo controlado internamente; sem inputs de terceiros não confiáveis no estado atual |
| D-01 | Sem rate limiting | Tool local sem exposição de rede; impacto limitado ao processo local |

---

## Gaps sem mitigação atual

| ID | Gap | Controlo sugerido |
|---|---|---|
| S-01 | Sem verificação de checksum nos release assets do GitHub | Verificar SHA256 do asset contra manifesto assinado |
| T-05 | Sem allowlist formal de dependências npm | Criar `docs/SecurityByDesign/politica-dependencias.md` |
| R-02 | Chamadas LLM API sem log auditável | Logging estruturado com modelo, timestamp e hash do contexto |

---

## Ameaças Fora de Âmbito

- Vulnerabilidades no cliente MCP (Claude Code, Copilot) — da responsabilidade do fornecedor
- Compromisso da plataforma GitHub — risco de supply chain externo
- Vulnerabilidades no modelo LLM — fora do controlo deste projeto

---

## Revisão

Este threat model deve ser revisto quando:
- O transporte mudar de stdio para HTTP/WebSocket
- For adicionado processamento de dados pessoais ou credenciais de utilizadores
- O MCP passar a mediar decisões automáticas em sistemas de produção
- Houver alterações significativas à superfície de ataque (novos tools, integrações externas)
