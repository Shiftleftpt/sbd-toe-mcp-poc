---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: executor
slice_id: s15
---

# Executor Report — s15

## Metadata

- **slice_id:** s15
- **produced_by:** executor
- **date:** 2026-03-27

## Summary

Automatizado `npm publish` no workflow de release: adicionado `registry-url: https://registry.npmjs.org` ao step `Setup Node.js`, e adicionado step `Publish to npm` como último step do job (após `Create or update release`), com `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` e comentário instrucional para o operador. README.md corrigido: canal principal agora é npm; GitHub Releases descrito como canal secundário; bundle file names actualizados de `sbd-toe-mcp-poc-*` para `sbd-toe-mcp-*`; secção de instalação via GitHub Release renomeada para "alternativa sem internet".

## Deliverables Produced

| Ficheiro | Acção |
|---|---|
| `.github/workflows/release.yml` | Modificado — `registry-url` no setup-node, step `Publish to npm` final |
| `README.md` | Modificado — npm como canal principal, GitHub Releases como secundário, bundle names actualizados |

## Acceptance Criteria — Evidence

- **AC-1: registry-url configurado**
  - status: PASS
  - evidence: `grep "registry-url" .github/workflows/release.yml` → `registry-url: https://registry.npmjs.org`

- **AC-2: step Publish to npm presente com NPM_TOKEN**
  - status: PASS
  - evidence: `grep -A 6 "Publish to npm"` → `run: npm publish --access public` + `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` + comentário instrucional presente

- **AC-3: sequência correcta**
  - status: PASS
  - evidence: `Publish to npm` é o último step do job; ordem: Checkout → Setup Node.js → Install → Validate → Verify tag → Build bundle → Create/update release → **Publish to npm**

- **AC-4: release.yml YAML válido**
  - status: PASS
  - evidence: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML válido')"` → `YAML válido`

- **AC-5: README.md corrigido**
  - status: PASS
  - evidence: "O canal principal de distribuição é **npm** (`sbd-toe-mcp`). O **GitHub Releases** mantém-se como canal secundário"; secção Quick Start (npm) intacta; bundle names actualizados para `sbd-toe-mcp-vX.Y.Z-*`

- **AC-6: qualidade**
  - status: PASS
  - evidence: `npm run check` → 45 valid, 0 invalid; `npm run build` limpo; `npm run test` → 247 passed (247), 0 failures

## Validation Run

```
$ grep "registry-url" .github/workflows/release.yml
          registry-url: https://registry.npmjs.org

$ grep -A 6 "Publish to npm" .github/workflows/release.yml
      - name: Publish to npm
        # Requires NPM_TOKEN secret configured in GitHub repository settings:
        # Settings → Secrets and variables → Actions → New repository secret
        # Name: NPM_TOKEN  Value: npm access token with publish permission
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML válido')"
YAML válido

$ npm run check && npm run build && npm run test 2>&1 | tail -5
[AI Disclosure Validation] 45 valid, 5 human-authored (skipped), 0 invalid
✅ All disclosed AI documents are valid
 Test Files  10 passed (10)
      Tests  247 passed (247)
   Duration  1.14s
```

## Notes para o operador (Pedro)

Para activar a publicação npm automática após este merge:

1. Criar npm access token: https://www.npmjs.com/settings → Access Tokens → Generate New Token (type: **Automation**)
2. No repositório GitHub: Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: token do passo 1
3. Na próxima tag `v*.*.*` pushed para master, o workflow publicará automaticamente no npm

**Atenção:** o primeiro `npm publish` criará o package `sbd-toe-mcp` no npm registry com `access: public`. Verificar que o nome está ainda disponível em `npm view sbd-toe-mcp` antes de criar a tag.
