---
version: "1.0"
date: "2026-03-27"
risk-level: "L2"
status: "active"
review-due: "2026-09-27"
---

# Política de Governança de Dependências — sbd-toe-mcp

Define a política de allowlist, denylist e validação de dependências de terceiros para o repositório `@shiftleftpt/sbd-toe-mcp`, em conformidade com o Manual SbD-ToE Cap. 05 e Cap. 06 (obrigatório para L2).

---

## Princípios

1. **Dependências são superfície de ataque.** Cada dependência adicionada aumenta a superfície de supply chain — a adição deve ser justificada e rastreável.
2. **Lockfile é fonte de verdade.** `package-lock.json` é versionado e não deve ser regenerado sem revisão explícita.
3. **Dependências não mantidas são risco.** Bibliotecas sem releases nos últimos 12 meses exigem avaliação antes de adopção ou continuação.

---

## Critérios de Aceitação para Nova Dependência

Antes de adicionar uma nova dependência, o developer deve verificar:

| Critério | Verificação |
|---|---|
| Mantida activamente | Último release < 12 meses; issues abertas respondidas |
| Sem CVEs críticos/altos conhecidos | `npm audit` / Dependabot sem alertas Critical/High |
| Licença compatível | MIT, Apache-2.0, BSD — evitar GPL em distribuição npm |
| Alternativa interna inexistente | Não duplicar funcionalidade já presente |
| Necessidade justificada no PR | Comentário no PR explicando a escolha |

---

## Dependências em Produção — Estado Actual

As dependências de runtime do pacote publicado (`"files"` em `package.json`) são zero — o pacote não tem `dependencies` declaradas, apenas `devDependencies`. O runtime usa só Node.js built-ins e o SDK MCP (a confirmar).

> **Verificar:** se o SDK `@modelcontextprotocol/sdk` ou similar for adicionado como dependência de runtime, deve ser revisto contra os critérios acima.

---

## DevDependencies — Governança

| Pacote | Versão | Justificação | Estado |
|---|---|---|---|
| `typescript` | `^5.9.3` | Compilação e type checking | ✅ Mantido |
| `vitest` | `^1.6.0` | Test runner | ✅ Mantido |
| `@vitest/coverage-v8` | `^1.6.0` | Coverage reporting | ✅ Mantido |
| `@types/node` | `^25.5.0` | Type definitions Node.js | ✅ Mantido |

> Esta tabela deve ser actualizada em cada release. Rever com `npm outdated`.

---

## Denylist

As seguintes categorias de dependências **não devem ser adicionadas** sem aprovação explícita via `security-exception.yml`:

| Categoria | Razão |
|---|---|
| Dependências com GPL v2/v3 | Incompatível com distribuição Apache-2.0 |
| Packages sem owner verificado no npm | Risco de typosquatting / abandono |
| Packages com histórico de supply chain compromise | ex: `event-stream` (2018), `ua-parser-js` (2021) |
| Wrappers de binários externos não auditados | Risco de execução arbitrária |

---

## Processo de Revisão

### Adição de dependência (PR)
1. Developer justifica no PR: necessidade, alternativas consideradas, critérios acima verificados
2. Reviewer confirma critérios antes de aprovar
3. `npm audit` em CI não pode reportar Critical/High na nova dependência

### Actualização de dependência (Dependabot PR)
1. Verificar changelog para breaking changes ou CVEs
2. Aprovação automática se: patch/minor sem CVEs; testes a verde
3. Aprovação manual obrigatória se: major version bump; CVE presente

### Revisão trimestral
1. `npm outdated` — identificar dependências com versões major em atraso
2. `npm audit` — confirmar zero Critical/High
3. Verificar dependências sem release nos últimos 12 meses

---

## Vulnerabilidades em Dependências Actuais

| Pacote | CVE | Severidade | Estado |
|---|---|---|---|
| `esbuild <=0.24.2` | GHSA-67mh-4wv8-2f99 | High (SSRF dev server) | ⚠️ Pendente `npm audit fix` |
| `brace-expansion <1.1.13` | GHSA-f886-m6hf-6m8v | Medium (DoS) | ⚠️ Pendente `npm audit fix` |

**Acção imediata:** `npm audit fix`

---

## Referências

- Manual SbD-ToE — Cap. 05: Dependências, SBOM e SCA
- Manual SbD-ToE — Cap. 06: Desenvolvimento Seguro (addon-03)
- [`controlos-l2.md`](controlos-l2.md) — CTRL-SUPPLY-001, CTRL-SUPPLY-002
- [`requisitos.md`](requisitos.md) — REQ-011
- [`sbom-policy.md`](sbom-policy.md) — geração de SBOM por release
