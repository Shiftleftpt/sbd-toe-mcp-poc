---
version: "2.0"
date: "2026-03-28"
methodology: "STRIDE"
risk-level: "L2"
status: "active"
review-due: "2026-09-28"
---

# Threat Model — sbd-toe-mcp

Modelo de ameaças proporcional ao nível L2, usando metodologia STRIDE. Aplicável ao servidor MCP `@shiftleftpt/sbd-toe-mcp`.

Ameaças estão ligadas aos requisitos de segurança em [`requisitos.md`](requisitos.md).

**Alterações v2.0**: reflecte a arquitectura actual sem LLM em runtime; adiciona contexto do pipeline upstream e ameaças AI relevantes para o MCP; actualiza fronteiras de confiança; fecha gaps documentados em v1.1.

---

## Âmbito

### Sistema

Servidor MCP (Model Context Protocol) que expõe tools de consulta ao Manual SbD-ToE para clientes LLM (Claude Code, GitHub Copilot, outros). Determinístico — sem LLM em runtime. Dados pré-computados pelo pipeline de indexação (KG), entregues como artifact `data/publish/`.

### O MCP como "foz" do pipeline

O MCP é o último ponto controlável antes do agente. Não produz os dados — consome um artifact gerado por um pipeline upstream que não controla em runtime. Ameaças que se originam no corpus ou no pipeline chegam ao MCP já materializadas no artifact. O MCP pode mitigar o que detecta e controlar o que expõe; não pode reparar o que está upstream.

```
[Corpus / Manual]
       |
       | commit + review
       ▼
[KG / Indexing Pipeline]  ← ameaças upstream (fora do controlo do MCP em runtime)
       |
       | data/publish/ artifact
       ▼
[sbd-toe-mcp process]     ← última linha de controlo
       |
       | stdio (local, sem rede)
       ▼
[Cliente MCP / Agente LLM]  ← não controlado
```

**Princípio de selecção de ameaças**: são analisadas as ameaças que o MCP pode detectar, reduzir ou para as quais pode produzir contexto útil ao agente. Ameaças puramente upstream (corpus poisoning, pipeline compromise) são documentadas como fora de âmbito com justificação explícita.

### Fronteiras de Confiança

```
[Cliente MCP / LLM]
        |
        | stdio (local, sem rede)
        |
[sbd-toe-mcp process]
        |
        |---> [data/publish/] (artifact pré-computado, carregado no startup)
        |
        |---> [npm registry] (instalação via npx — apenas no arranque)
        |
        |---> [GitHub Releases] (bootstrap opcional de assets)
```

> **v2.0**: removida dependência de LLM API — o MCP é agora totalmente determinístico. Removida dependência de GitHub API em runtime normal.

### Ativos

| Ativo | Classificação | Notas |
|---|---|---|
| Artifact `data/publish/` | Público | Dados pré-computados do manual SbD-ToE |
| Outputs/respostas do MCP | Interno | Contexto de segurança fornecido ao agente |
| Processo MCP em execução | Interno | Runtime local do utilizador |
| Configuração (`.env`) | Interno | Sem API keys LLM na arquitectura actual |

---

## Análise STRIDE

### S — Spoofing (Falsificação de Identidade)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| S-01 | Release asset falsificado injectado no bootstrap | GitHub API / release checkout | Baixa | Alto | URL allowlist (`ALLOWED_ASSET_URL_PREFIXES`); path validation (`assertSafeDestPath()`); **artifact integrity check via manifest SHA-256 no startup** (v2.0) | REQ-DST-03, REQ-ACC-05 |
| S-02 | Cliente MCP malicioso a impersonar LLM legítimo | Transporte stdio | Baixa | Médio | stdio local — só o processo pai pode conectar; sem autenticação adicional necessária no contexto actual | REQ-ACC-05 |

### T — Tampering (Adulteração)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| T-01 | Adulteração do artifact `data/publish/` em disco | Ficheiros JSON/YAML do artifact | Baixa | Alto | **Artifact integrity check no startup**: manifest com SHA-256 por ficheiro, verificado antes de carregar dados (v2.0) | REQ-DST-03 |
| T-02 | Adulteração do bundle de release no GitHub | GitHub Release assets | Muito baixa | Alto | `release.yml` verifica que tag aponta para commit em `master`; npm provenance (`--provenance`) no publish | REQ-DST-01, REQ-DST-02 |
| T-03 | Injecção de conteúdo malicioso via query MCP | Tool inputs (args) | Média | Médio | Allowlist de valores em parâmetros controlados (ex: `concerns`, `riskLevel`); validação de tipo e comprimento | REQ-VAL-01, REQ-VAL-02, REQ-VAL-04 |
| T-04 | Indirect prompt injection via conteúdo do artifact | Output MCP → agente | Média | Médio | Corpus é conteúdo controlado internamente. MCP expõe `content_type` (canonical/derived/inferred) para que o agente distinga origem do conteúdo. Risco residual aceite — ver abaixo | REQ-VAL-04 |
| T-05 | Dependência npm comprometida na supply chain | npm registry / `package-lock.json` | Baixa | Alto | Dependabot activo; `npm audit` em CI; `package-lock.json` versionado; npm provenance no publish | REQ-DST-04 |

### R — Repudiation (Repúdio)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| R-01 | Ausência de log estruturado de queries MCP | Runtime | Média | Baixo | Logging via `stderr` presente mas não estruturado nem persistido. Gap proporcional ao contexto local | REQ-LOG-01, REQ-LOG-02 |

> **v2.0**: R-02 (LLM API sem log auditável) removido — LLM API não existe na arquitectura actual.

### I — Information Disclosure (Divulgação de Informação)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| I-01 | Exposição de paths absolutos em error messages | Handlers MCP | Média | Baixo | Error messages sanitizadas — sem paths, sem stack traces no output MCP | REQ-ERR-04, REQ-CFG-01 |
| I-02 | Exposição de estrutura interna do artifact via output excessivo | Tool outputs | Alta (antes v2.0) | Médio | Field projection em todos os handlers — stripped: `raw`, `aliases`, `searchable_text`, `source_practice_ids`; output caps por tool (L1≈12k, L2≈18k, L3≈20k) | REQ-VAL-01 |

### D — Denial of Service (Negação de Serviço)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| D-01 | Context exhaustion — output excessivo satura contexto do agente | Tools sem filtro (ex: `get_guide_by_role` sem role/phase) | Alta (antes v2.0) | Alto | Output caps implementados; modo summary-only quando sem filtro; `concerns` obrigatório para L2/L3 | REQ-VAL-01 |
| D-02 | Query com padrão patológico causar processamento excessivo | `semantic-index-gateway.ts` | Baixa | Baixo | Validação de comprimento (max 200 chars); sem execução de regex dinâmico nos inputs | REQ-VAL-01, REQ-VAL-04 |

### E — Elevation of Privilege (Elevação de Privilégio)

| ID | Ameaça | Componente | Probabilidade | Impacto | Mitigação | REQ |
|---|---|---|---|---|---|---|
| E-01 | Path traversal durante extracção de release | `release-checkout.ts` | Muito baixa | Alto | `assertSafeDestPath()` valida destino; `KNOWN_FILES` allowlist para extracção | REQ-VAL-04 |
| E-02 | Command injection via argumentos do processo | `spawnSync` em bootstrap | Muito baixa | Alto | `shell: false` — sem interpolação de shell; argumentos fixos | REQ-VAL-04 |
| E-03 | Trust confusion — agente trata output MCP como instrução | Output MCP → agente | Média | Alto | MCP expõe `content_type` (canonical/derived/inferred) e `provenance` nos outputs estruturados para que o agente possa distinguir contexto de instrução. Controlo sobre comportamento do agente é fora de âmbito | REQ-VAL-04 |

---

## Riscos Residuais Aceites

| ID | Risco | Justificação |
|---|---|---|
| T-04 | Indirect prompt injection via conteúdo do artifact | Corpus é conteúdo controlado internamente com review process; sem inputs de terceiros não confiáveis. MCP não tem capacidade de validação semântica — seria introduzir LLM-based defence com custo e não-determinismo desproporcionais ao risco actual |
| T-01 (parcial) | Artifact corrompido com manifest também corrompido | Atacante com capacidade de comprometer o CI tem acesso mais amplo; risco proporcional ao contexto |
| D-02 | Sem rate limiting | Processo local single-user sem exposição de rede; impacto limitado ao processo local |
| E-03 (parcial) | Comportamento do agente após receber output | Fora do controlo do MCP — documentado e mitigado ao nível de labels; residual depende do agente |

---

## Ameaças Fora de Âmbito

Estas ameaças existem no sistema mas são responsabilidade de outras layers — documentadas para explicitar a fronteira de responsabilidade do MCP.

| Ameaça | Layer responsável | Nota |
|---|---|---|
| Corpus poisoning (conteúdo malicioso no manual) | Corpus / processo de authoring e review | O MCP consome o que o artifact contém; não valida semântica do corpus |
| Pipeline/KG poisoning (enriquecimento corrompido) | Pipeline de indexação | Metadados derivados (ontologia, relações) são gerados upstream; o MCP expõe-nos com `content_type: derived` mas não os valida |
| Compromisso do GitHub Actions pipeline | DevSecOps / supply chain | Mitigação: SHA pinning de actions, branch protection, npm provenance |
| Vulnerabilidades no cliente MCP (Claude Code, Copilot) | Fornecedor do cliente | Fora do controlo deste projecto |
| Comportamento do modelo LLM após receber contexto | Fornecedor do modelo | O MCP fornece contexto; não controla decisões do agente |
| Registry poisoning npm (takeover de conta) | npm / supply chain | Mitigação parcial: npm provenance; pinning de versão na config do cliente |

---

## Gaps sem mitigação actual

| ID | Gap | Controlo sugerido | Prioridade |
|---|---|---|---|
| T-01 | Artifact integrity check não implementado | Gerar `manifest.json` com SHA-256 no CI; verificar no startup do MCP | Alta |
| E-03 | `content_type` / provenance ausente nos outputs dos tools | Adicionar `content_type` e `provenance.source_ids` nos handlers estruturados | Média |
| I-01 | Sanitização de error messages não uniforme em todos os handlers | Auditar handlers; garantir ausência de paths e stack traces no output MCP | Média |
| R-01 | Logging de queries não estruturado | Structured logging com evento, timestamp, tool, args sanitizados | Baixa (proporcional ao contexto) |

> **v2.0**: Gap S-01 (checksum de release assets) parcialmente endereçado por npm provenance. Gap R-02 (LLM API) fechado por remoção da dependência.

---

## Sumário de Decisões

> Esta secção consolida as decisões de resposta a cada ameaça. Pertenceria idealmente a um ADR (Architecture Decision Record) de segurança — fica aqui na ausência de formato normalizado pelo manual.

### Implementar (gaps abertos)

| Ameaça | Decisão | Acção |
|---|---|---|
| T-01 — Artifact corrompido em disco | Implementar | Gerar `manifest.json` com SHA-256 no CI; verificar no startup do MCP antes de carregar dados |
| E-03 — Trust confusion agente/conteúdo | Implementar | Adicionar `content_type: canonical/derived/inferred` e `provenance.source_ids` nos outputs dos tools estruturados |
| I-01 — Error messages com paths/internals | Implementar | Auditar e uniformizar sanitização de errors em todos os handlers |

### Já mitigado

| Ameaça | Mitigação |
|---|---|
| I-02 — Output excessivo expõe estrutura interna | Field projection + output caps em todos os tools |
| D-01 — Context exhaustion do agente | Summary-only sem filtro; `concerns` obrigatório em L2/L3 |
| T-03 — Injecção via query args | Allowlist de valores em parâmetros controlados |
| E-01/E-02 — Path traversal / command injection | `assertSafeDestPath()`, `shell: false` |
| T-02/T-05 — Supply chain release/npm | npm provenance, branch protection, lockfile versionado |

### Aceite (risco proporcional ao contexto)

| Ameaça | Justificação |
|---|---|
| T-04 — Indirect prompt injection via conteúdo | Corpus controlado internamente; LLM-based defence introduziria não-determinismo desproporcionado ao risco actual |
| E-03 (parcial) — Comportamento do agente pós-output | Fora do controlo do MCP; mitigado ao nível de labels e documentação |
| D-02 — Sem rate limiting | Single-user local sem exposição de rede; impacto negligenciável |

### Fora de âmbito (responsabilidade de outra layer)

| Ameaça | Layer responsável |
|---|---|
| Corpus poisoning | Processo de authoring e review do manual |
| Pipeline/KG poisoning | Pipeline de indexação |
| Compromisso do CI/CD | DevSecOps / supply chain |
| Comportamento do cliente MCP | Fornecedor (Anthropic, GitHub) |
| Comportamento do modelo LLM | Fornecedor do modelo |

---

## Revisão

Este threat model deve ser revisto quando:

- O transporte mudar de stdio para HTTP/WebSocket
- For adicionado processamento de dados pessoais ou credenciais de utilizadores
- O MCP passar a mediar decisões automáticas em sistemas de produção
- Houver alterações significativas à superfície de ataque (novos tools, integrações externas)
- O corpus passar a incluir contribuições de terceiros não revistos
