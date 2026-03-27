---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s14
review_status: approved-by-sync
---

# Brief — s14: Smithery registration (smithery.yaml)

## Metadata

- **slice_id:** s14
- **produced_by:** sync
- **date:** 2026-03-27
- **target:** executor
- **depends_on:** s13 (closed)
- **epic:** Distribution

---

## Objective

Criar `smithery.yaml` na raiz do repositório para registar o servidor no
[Smithery](https://smithery.ai) — o directório de servidores MCP com one-click install.
O Smithery lê este ficheiro para gerar automaticamente a config de instalação, um formulário
guiado de env vars e a página de descoberta.

O ficheiro `smithery.yaml` já está declarado no campo `files` do `package.json` (s12).
**Sem alterações em `src/`.** Sem alterações a outros ficheiros de código existentes.

---

## Scope

### 14.1 — `smithery.yaml`

Ficheiro novo na raiz. Seguir o schema oficial da Smithery:
**https://smithery.ai/docs/config/smithery-yaml**

O executor deve consultar o schema e seguir o formato exacto. Estrutura esperada baseada
no schema público da Smithery:

```yaml
# smithery.yaml
name: sbd-toe-mcp
description: "MCP server for SbD-ToE security manual — structured tools for Claude, GitHub Copilot and other MCP clients"
license: Apache-2.0
homepage: "https://github.com/Shiftleftpt/sbd-toe-mcp-poc#readme"

startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      DEBUG_MODE:
        type: string
        default: "false"
        description: "Enable debug logging (true/false)"
      MAX_CONTEXT_RECORDS:
        type: string
        default: "8"
        description: "Maximum number of records returned per query (integer ≥ 1)"
      SITE_BASE_URL:
        type: string
        default: "https://www.securitybydesign.dev/"
        description: "Base URL for the SbD-ToE website (optional override)"
      MANUAL_BASE_URL:
        type: string
        default: "https://www.securitybydesign.dev/sbd-toe/sbd-manual/"
        description: "Base URL for the SbD-ToE manual (optional override)"
      CROSS_CHECK_BASE_URL:
        type: string
        default: "https://www.securitybydesign.dev/sbd-toe/cross-check-normativo/"
        description: "Base URL for normative cross-check (optional override)"
      SBD_TOE_APP_ROOT:
        type: string
        description: "Override the app root path (advanced — leave empty for auto-detection)"
    additionalProperties: false
  commandFunction: |-
    (config) => ({
      command: "npx",
      args: ["-y", "sbd-toe-mcp"],
      env: Object.fromEntries(
        Object.entries(config).filter(([_, v]) => v !== undefined && v !== "")
      )
    })
```

**Notas críticas:**
- O executor **deve** verificar o schema actual em https://smithery.ai/docs/config/smithery-yaml antes de escrever o ficheiro — o schema pode ter evoluído
- Se o schema oficial diferir significativamente da estrutura acima, seguir o schema oficial e documentar no report
- Documentar apenas as 6 env vars funcionais (não as 5 dead-code)
- `commandFunction` é uma string JavaScript que a Smithery executa para gerar o comando de arranque
- Se a Smithery usar um formato diferente (e.g., `command` directo sem `commandFunction`), adaptar conforme o schema

### 14.2 — Verificação de referência no `package.json`

Confirmar que `smithery.yaml` já está no campo `files` do `package.json` (foi adicionado em s12).
Se por algum motivo não estiver, adicionar.

---

## Out of Scope

- Não criar conta na Smithery nem submeter manualmente (o registo ocorre automaticamente quando o package npm é publicado)
- Não alterar `release.yml` (s15)
- Não alterar `src/`
- Não alterar `docs/installation.md` nem outros ficheiros de s13

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `smithery.yaml` | novo |
| `package.json` | verificar (sem alterações se `smithery.yaml` já está em `files`) |

---

## Acceptance Criteria

**AC-1: `smithery.yaml` existe e é YAML válido**
- Ficheiro existe na raiz do repositório
- É YAML sintaticamente válido — parseável com `node -e "require('js-yaml').load(...)"` ou equivalente
- Se `js-yaml` não estiver disponível, usar `node -e "require('yaml').parse(...)"` ou validar com `python3 -c "import yaml; yaml.safe_load(open('smithery.yaml'))"`

**AC-2: startCommand configurado com npx**
- O YAML contém configuração de arranque com `npx` e `sbd-toe-mcp`
- Seja via `commandFunction`, `command` directo, ou outro mecanismo conforme o schema oficial

**AC-3: env vars funcionais documentadas**
- Pelo menos 4 das 6 env vars funcionais presentes com `description` e `default`:
  `DEBUG_MODE`, `MAX_CONTEXT_RECORDS`, `SITE_BASE_URL`, `SBD_TOE_APP_ROOT`

**AC-4: dead-code vars ausentes**
- `smithery.yaml` não menciona `DEFAULT_LANGUAGE`, `DOCS_HITS`, `ENTITIES_HITS`, `SAMPLING_MAX_TOKENS`, `UPSTREAM_RELEASE_TAG`

**AC-5: referência em `package.json` confirmada**
- `grep "smithery.yaml" package.json` retorna resultado (já incluído em s12)

**AC-6: qualidade**
- `npm run check` limpo
- `npm run build` limpo
- `npm run test` passa — 247 testes, zero regressões

---

## Validation

```bash
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc

# 1. Ficheiro existe
ls smithery.yaml

# 2. YAML válido
python3 -c "import yaml; yaml.safe_load(open('smithery.yaml')); print('YAML válido')"

# 3. Contém npx
grep "npx" smithery.yaml

# 4. Dead-code vars ausentes
grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|SAMPLING_MAX_TOKENS|UPSTREAM_RELEASE_TAG)" smithery.yaml

# 5. Referência em package.json
grep "smithery.yaml" package.json

# 6. Qualidade
npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5
```

---

## Risks

| Risco | Mitigação |
|---|---|
| Schema Smithery diferente do esperado | Executor consulta docs oficiais e adapta; documenta no report qualquer divergência |
| `js-yaml` / `yaml` não instalados localmente | Usar `python3 -c "import yaml; ..."` para validação |
| `commandFunction` não suportado na versão actual do schema | Usar `command`/`args` directos se necessário; documentar no report |
