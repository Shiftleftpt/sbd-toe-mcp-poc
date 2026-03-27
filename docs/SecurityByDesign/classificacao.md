---
version: "1.0"
date: "2026-03-27"
author: "pedrofarinhaatshiftleftpt"
status: "active"
review-due: "2026-09-27"
---

# Classificação de Risco — sbd-toe-mcp

Documento de registo formal da classificação de risco do repositório `@shiftleftpt/sbd-toe-mcp`, segundo o modelo E+D+I do Manual SbD-ToE (Cap. 01).

---

## Resultado

| Score | Classificação | Código |
|---|---|---|
| **5** | **Médio** | **L2** |

---

## Modelo de Classificação

**R = E + D + I**

| Eixo | Nível | Pontos | Justificação |
|---|---|---|---|
| **E — Exposição** | Externo c/ controlo | 2 | Pacote npm público (`@shiftleftpt/sbd-toe-mcp`); chamadas ao GitHub API para download de release assets; sem endpoint de rede exposto em runtime (transporte stdio) |
| **D — Tipo de Dados** | Sem sensibilidade | 1 | Processa exclusivamente conteúdo do Manual SbD-ToE (documentação pública). Sem dados pessoais, regulados ou credenciais de utilizadores por desenho |
| **I — Impacto Potencial** | Limitado/reversível | 2 | Ferramenta de apoio à decisão para LLMs em contexto de segurança. Respostas incorretas podem influenciar decisões de AppSec mas o projeto é PoC sem integração em produção crítica |
| **Total** | | **5** | **L2 — Médio** |

---

## Nota sobre IA e Automação

O servidor MCP opera como ferramenta de apoio à decisão para modelos de linguagem (Claude, GitHub Copilot). Nos termos do Cap. 01 do Manual SbD-ToE, a utilização de IA não altera por si só os eixos de risco.

A reavaliação dos eixos é **obrigatória** se o servidor:
- Passar a expor endpoint HTTP/WebSocket (E sobe para 2→3)
- Processar dados pessoais, segredos ou informação confidencial de utilizadores (D sobe para 2 ou 3)
- Mediar decisões automáticas com impacto real em sistemas ou dados de produção (I sobe para 3)

---

## Documentos do Conjunto SecurityByDesign

| Documento | Conteúdo |
|---|---|
| [`controlos-l2.md`](controlos-l2.md) | Controlos obrigatórios e recomendados com estado actual |
| [`requisitos.md`](requisitos.md) | Catálogo REQ-XXX com critérios de aceitação e evidências |
| [`threat-model.md`](threat-model.md) | Análise STRIDE com ameaças ligadas a REQ-XXX |
| [`politica-testes.md`](politica-testes.md) | Política de testes de segurança (obrigatória L2) |
| [`politica-dependencias.md`](politica-dependencias.md) | Allowlist/denylist e governança de dependências |
| [`sbom-policy.md`](sbom-policy.md) | Processo de geração e publicação de SBOM |

---

## Histórico

| Data | Versão | Classificação | Motivo |
|---|---|---|---|
| 2026-03-27 | 1.0 | L2 | Classificação inicial formal. Anterior referência informal era L1 — reavaliada por exposição npm pública e papel como ferramenta de apoio à decisão de segurança via LLM |
