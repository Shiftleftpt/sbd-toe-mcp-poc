---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s12
review_status: approved-by-sync
---

# Brief — s12: npm-ready packaging

## Metadata

- **slice_id:** s12
- **produced_by:** sync
- **date:** 2026-03-27
- **target:** executor
- **depends_on:** s11 (closed)
- **epic:** Distribution

---

## Objective

Preparar o `package.json` e scripts auxiliares para publicação pública no npm com o nome
`sbd-toe-mcp`. Remover `"private": true`, configurar o campo `files` para incluir os dados
necessários, corrigir o `bin` entry, adicionar metadados de descoberta npm, e corrigir
`examples/vscode.mcp.json` para usar `npx` em vez de absolute paths.

Este slice é o pré-requisito técnico de todos os slices seguintes do epic de distribuição.
**Sem alterações em `src/`.**

---

## Scope

### 12.1 — `package.json`

Alterações necessárias:

1. **Remover** `"private": true`
2. **Renomear** `"name": "sbd-toe-mcp-poc"` → `"name": "sbd-toe-mcp"`
3. **Actualizar `bin`:**
   ```json
   "bin": {
     "sbd-toe-mcp": "./dist/index.js"
   }
   ```
4. **Adicionar `files`** (controla o que vai para o npm):
   ```json
   "files": [
     "dist/",
     "data/publish/",
     "data/reports/run_manifest.json",
     "prompts/",
     "examples/",
     ".env.example",
     "smithery.yaml"
   ]
   ```
   Nota: `smithery.yaml` ainda não existe — incluir aqui antecipadamente para s14.

5. **Adicionar `publishConfig`:**
   ```json
   "publishConfig": {
     "access": "public"
   }
   ```

6. **Adicionar metadados de descoberta:**
   ```json
   "keywords": ["mcp", "security", "sbd", "toe", "devsecops", "claude", "copilot", "llm"],
   "homepage": "https://github.com/Shiftleftpt/sbd-toe-mcp-poc#readme",
   "bugs": { "url": "https://github.com/Shiftleftpt/sbd-toe-mcp-poc/issues" },
   "repository": {
     "type": "git",
     "url": "git+https://github.com/Shiftleftpt/sbd-toe-mcp-poc.git"
   }
   ```

7. **Actualizar `description`** para reflectir uso público:
   ```
   "description": "MCP server for SbD-ToE security manual — structured tools for Claude, GitHub Copilot and other MCP clients"
   ```

### 12.2 — `scripts/package-release-lib.mjs`

Actualizar a linha:
```js
// antes:
export const PROJECT_NAME = "sbd-toe-mcp-poc";
// depois:
export const PROJECT_NAME = "sbd-toe-mcp";
```

Isto afecta o nome dos artefactos de release: `sbd-toe-mcp-<version>-bundle.tar.gz`.

### 12.3 — `examples/vscode.mcp.json`

Substituir o conteúdo actual (que usa absolute paths) por config portável com `npx`:

```json
{
  "servers": {
    "sbdToe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "sbd-toe-mcp"]
    }
  }
}
```

Sem `envFile` — zero env vars obrigatórias confirmado pelo audit de config.ts.

---

## Out of Scope

- Não alterar nenhum ficheiro em `src/`
- Não criar `docs/installation.md` (s13)
- Não criar `smithery.yaml` (s14)
- Não alterar `release.yml` (s15)
- Não publicar no npm (s15)
- Não alterar `examples/claude-desktop.json` (s13)

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `package.json` | modificar |
| `scripts/package-release-lib.mjs` | modificar (1 linha) |
| `examples/vscode.mcp.json` | modificar |

---

## Implementation

### Verificação de disponibilidade do nome npm

Antes de tudo, executar:
```bash
npm view sbd-toe-mcp 2>&1
```

- Se retornar `404` → nome disponível, prosseguir normalmente
- Se retornar info de um package existente → **não avançar**, reportar ao sync com o output

### Ordem recomendada

1. Verificar `npm view sbd-toe-mcp`
2. Editar `package.json` (todas as alterações em conjunto)
3. Editar `scripts/package-release-lib.mjs` (1 linha)
4. Editar `examples/vscode.mcp.json`
5. Validar com `npm pack --dry-run`
6. Correr `npm run check && npm run build && npm run test`

### Nota sobre `data/reports/run_manifest.json`

Este ficheiro pode não existir localmente se nunca foi feito `npm run checkout:backend`.
O campo `files` inclui-o mesmo assim — se não existir no disco quando o utilizador instalar
via npm, o bundle de release (GitHub Releases) garante que está presente. No contexto do
`npm pack --dry-run`, o npm apenas avalia o que existe no disco; se o ficheiro não existir,
não aparecerá no output — **não é um erro**.

---

## Acceptance Criteria

**AC-1: nome e metadados**
- `package.json`: campo `"private"` ausente (ou `false`)
- `package.json`: `"name": "sbd-toe-mcp"`
- `package.json`: `"description"` actualizada (sem "poc", sem "VS Code")
- `package.json`: `"keywords"`, `"repository"`, `"bugs"`, `"homepage"`, `"publishConfig"` presentes

**AC-2: bin e files**
- `package.json`: `bin["sbd-toe-mcp"]` aponta para `"./dist/index.js"`
- `package.json`: campo `"files"` contém `"dist/"`, `"data/publish/"`, `"prompts/"`, `".env.example"`

**AC-3: npm pack confirma conteúdo**
- `npm pack --dry-run 2>&1` lista `dist/index.js`
- `npm pack --dry-run 2>&1` lista pelo menos um ficheiro de `data/publish/`
- `npm pack --dry-run 2>&1` lista `prompts/` ou ficheiros dentro de `prompts/`
- `npm pack --dry-run 2>&1` **não lista** ficheiros de `src/`, `node_modules/`, `.aos_engine_data/`, `.claude/`

**AC-4: PROJECT_NAME actualizado**
- `grep "PROJECT_NAME" scripts/package-release-lib.mjs` retorna `"sbd-toe-mcp"` (sem `-poc`)

**AC-5: examples/vscode.mcp.json corrigido**
- `examples/vscode.mcp.json` é JSON válido
- Contém `"command": "npx"` e `"args": ["-y", "sbd-toe-mcp"]`
- Não contém caminhos absolutos (`/absolute/` ou paths com `/Users/` ou `/home/`)

**AC-6: disponibilidade npm confirmada**
- `npm view sbd-toe-mcp` retorna erro 404 (nome livre) — executor inclui output no report
- Se nome ocupado: executor **não avança** e reporta ao sync

**AC-7: qualidade**
- `npm run check` limpo
- `npm run build` limpo
- `npm run test` passa — 247 testes, zero regressões

---

## Validation

```bash
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc

# 1. Nome npm disponível
npm view sbd-toe-mcp 2>&1 | head -3

# 2. Sem "private" e nome correcto
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('name:', p.name, '| private:', p.private, '| bin:', JSON.stringify(p.bin))"

# 3. files contém as entradas críticas
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(p.files)"

# 4. npm pack confirma conteúdo
npm pack --dry-run 2>&1 | grep -E "(dist/index|data/publish|prompts)" | head -10

# 5. PROJECT_NAME
grep "PROJECT_NAME" scripts/package-release-lib.mjs

# 6. vscode.mcp.json usa npx
cat examples/vscode.mcp.json

# 7. Qualidade
npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5
```

---

## Risks

| Risco | Mitigação |
|---|---|
| Nome `sbd-toe-mcp` já ocupado no npm | AC-6: executor verifica antes de qualquer alteração e reporta ao sync |
| `data/reports/run_manifest.json` ausente localmente afecta `npm pack` | Aceite — o ficheiro não é crítico para o pack; está incluído no bundle de release |
| `smithery.yaml` no campo `files` mas ficheiro ainda não existe | Aceite — npm ignora entradas de `files` que não existem no disco; s14 criará o ficheiro |
